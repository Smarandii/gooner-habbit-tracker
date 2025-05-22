import { habits, userProfile, geminiApiKey, setHabits, setUserProfile } from './state.js';
import { BASE_XP_PER_HABIT } from './config.js';
// UI imports removed
import { addXP, calculateStreakBonus, getUserTitle } from './gamification.js';
import { generateAiResponse } from './api.js';
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { saveData } from './data.js';
import { newHabitContext, habitCompleteContext, habitEditContext, habitDeleteContext } from './ai_prompts.js';

let uiCallbacks = {
    requestRenderHabits: () => console.warn('requestRenderHabits callback not set in habits.js'),
    showToast: (message, type, duration) => console.warn('showToast callback not set', { message, type, duration }),
    updateGamificationDisplay: () => console.warn('updateGamificationDisplay callback not set'),
    getNewHabitInput: () => { console.warn('getNewHabitInput callback not set'); return ''; },
    clearNewHabitInput: () => console.warn('clearNewHabitInput callback not set')
};

/**
 * Initializes the habits module with UI callback functions.
 * This allows habits.js to interact with the UI without direct dependencies.
 * @param {Object} callbacks - An object containing callback functions for UI interactions.
 * @param {function} callbacks.requestRenderHabits - Function to request a re-render of the habits list.
 * @param {function} callbacks.showToast - Function to display a toast notification.
 * @param {function} callbacks.updateGamificationDisplay - Function to update gamification elements in the UI.
 * @param {function} callbacks.getNewHabitInput - Function to get the value from the new habit input field.
 * @param {function} callbacks.clearNewHabitInput - Function to clear the new habit input field.
 * @returns {void}
 */
export function initHabits(callbacks) {
    uiCallbacks = { ...uiCallbacks, ...callbacks };
};

/**
 * Performs daily reset tasks if the last reset was not today.
 * This includes resetting habit completion status and streaks if necessary.
 * Notifies the user about broken/maintained streaks.
 * @returns {void}
 */
export const performDailyResetIfNeeded = () => {
    const todayDateStr = getTodayDateString();
    const { lastDailyReset, level } = userProfile; // Destructuring

    if (lastDailyReset !== todayDateStr) {
        const yesterdayDateStr = getYesterdayDateString();
        let streaksBroken = 0; let streaksMaintained = 0;

        const updatedHabits = habits.map(habit => {
            const { streak, lastCompletedDate, createdAt } = habit; // Destructuring
            let newStreak = streak;
            if (lastCompletedDate !== yesterdayDateStr) {
                const habitCreationDate = new Date(createdAt).toISOString().split('T')[0];
                if (streak > 0 && habitCreationDate < todayDateStr) {
                    newStreak = 0; streaksBroken++;
                }
            } else {
                if (streak > 0) streaksMaintained++;
            }
            return { ...habit, completedToday: false, streak: newStreak };
        });

        setHabits(updatedHabits);
        const newProfile = { ...userProfile, lastDailyReset: todayDateStr };
        setUserProfile(newProfile);

        let resetMsg = `Daily reset. `;
        if (streaksBroken > 0) resetMsg += `${streaksBroken} habit streak(s) broken. `;
        if (streaksMaintained > 0) resetMsg += `${streaksMaintained} maintained. `;
        uiCallbacks.showToast(resetMsg, "info", 4000);
        saveData();
        uiCallbacks.requestRenderHabits();
    }
};

/**
 * Handles the user's request to add a new habit.
 * Retrieves habit name from UI, validates it, adds it to the list,
 * and triggers an AI interaction if an API key is available.
 * @returns {void}
 */
export const handleUserAddHabit = () => {
    const habitName = uiCallbacks.getNewHabitInput();
    if (habitName === "") {
        uiCallbacks.showToast("Habit name cannot be empty.", "error");
        return;
    }
    _addHabitToList(habitName);
    uiCallbacks.clearNewHabitInput();

    if (geminiApiKey) {
        const { level: userLevel } = userProfile; // Destructuring
    	const promptContext = newHabitContext(
    		{
    			userTitle: getUserTitle(userLevel),
    			habitName: habitName
    		}
    	)

        generateAiResponse("new_habit", promptContext);
    }
};

/**
 * Internal function to create a new habit object and add it to the global habits list.
 * Also triggers data saving and UI updates.
 * @param {string} name - The name of the new habit.
 * @returns {void}
 * @private
 */
function _addHabitToList(name) {
    const newHabit = {
        id: Date.now().toString(), name: name, createdAt: new Date().toISOString(),
        baseXpValue: BASE_XP_PER_HABIT, completedToday: false, streak: 0, lastCompletedDate: null,
        isEditing: false
    };
    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);

    saveData();
    uiCallbacks.requestRenderHabits();
    uiCallbacks.showToast(`Habit "${name}" added!`); // Template literal already used effectively
};

export const toggleHabitCompletion = (habitId) => {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    let currentHabit = { ...habits[habitIndex] };
    // Destructure properties from currentHabit for easier use
    let { name: habitName, completedToday, lastCompletedDate, streak, baseXpValue } = currentHabit;
    const { level: userLevel } = userProfile; // Destructure user level

    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    if (!completedToday) {
        currentHabit.completedToday = true;
        if (lastCompletedDate === yesterdayStr) currentHabit.streak++;
        else if (lastCompletedDate !== todayStr) currentHabit.streak = 1;
        currentHabit.lastCompletedDate = todayStr;

        const awardedXP = baseXpValue + calculateStreakBonus(currentHabit.streak);
        addXP(awardedXP);
        uiCallbacks.showToast(`"${habitName}" (Streak: ${currentHabit.streak})! +${awardedXP} XP! 💪`);

        if (geminiApiKey) {
            const promptContext = habitCompleteContext({
                userTitle: getUserTitle(userLevel),
                habitName: habitName,
                streak: currentHabit.streak,
                awardedXP: awardedXP
            });
            generateAiResponse("habit_complete", promptContext);
        }
    } else {
        currentHabit.completedToday = false;
        // No change to streak or lastCompletedDate when un-completing
        const subtractedXP = baseXpValue + calculateStreakBonus(streak); // Use original streak for subtraction
        addXP(-subtractedXP);
        uiCallbacks.showToast(`"${habitName}" marked incomplete. XP removed.`);
    }

    const updatedHabits = [...habits];
    updatedHabits[habitIndex] = currentHabit;
    setHabits(updatedHabits);

    saveData();
    uiCallbacks.requestRenderHabits();
    uiCallbacks.updateGamificationDisplay();
};

/**
 * Sets a specific habit into editing mode.
 * It updates the habit's `isEditing` state and stores its original name for potential cancellation.
 * Triggers a UI re-render.
 * @param {string} habitId - The ID of the habit to be edited.
 * @returns {void}
 */
export const startEditHabit = (habitId) => {
    const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, isEditing: true, originalNameBeforeEdit: h.name } : { ...h, isEditing: false }
    );
    setHabits(updatedHabits);
    uiCallbacks.requestRenderHabits();
};

export const saveHabitEdit = (habitId, newNameInput) => {
    const newNameTrimmed = newNameInput.trim();
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    const { name: currentName, originalNameBeforeEdit } = habits[habitIndex]; // Destructure
    const oldName = originalNameBeforeEdit || currentName;
    const { level: userLevel } = userProfile; // Destructure

    if (newNameTrimmed === "") {
        uiCallbacks.showToast("Habit name cannot be empty.", "error");
        const editInput = document.querySelector(`.edit-input[data-habit-id="${habitId}"]`);
        if (editInput) editInput.value = oldName;
        return;
    }

    const nameHasChanged = oldName !== newNameTrimmed;

    const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, name: newNameTrimmed, isEditing: false, originalNameBeforeEdit: undefined } : h
    );
    setHabits(updatedHabits);
    saveData();
    uiCallbacks.requestRenderHabits();
    uiCallbacks.showToast("Habit updated!", "success");

    if (geminiApiKey && nameHasChanged) {
    	const promptContext = habitEditContext({
    			userTitle: getUserTitle(userLevel),
    			oldName: oldName,
    			newName: newNameTrimmed
    		});
        generateAiResponse("habit_edit", promptContext);
    }
};

/**
 * Cancels the editing mode for a specific habit.
 * Reverts the habit's name to its original state if it was changed and exits editing mode.
 * Triggers a UI re-render.
 * @param {string} habitId - The ID of the habit for which to cancel editing.
 * @returns {void}
 */
export const cancelHabitEdit = (habitId) => {
    const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, name: h.originalNameBeforeEdit || h.name, isEditing: false, originalNameBeforeEdit: undefined } : h
    );
    setHabits(updatedHabits);
    uiCallbacks.requestRenderHabits();
};

export const moveHabitUp = (habitId) => {
    const index = habits.findIndex(h => h.id === habitId);
    if (index > 0) {
        const updatedHabits = [...habits];
        // Simple swap using destructuring for conciseness
        [updatedHabits[index - 1], updatedHabits[index]] = [updatedHabits[index], updatedHabits[index - 1]];
        setHabits(updatedHabits);
        saveData();
        uiCallbacks.requestRenderHabits();
        // The second call to requestRenderHabits was likely a mistake, removed.
    }
};

/**
 * Moves a specified habit one position down in the habits list.
 * Updates the habits order, saves data, and triggers a UI re-render.
 * @param {string} habitId - The ID of the habit to move down.
 * @returns {void}
 */
export const moveHabitDown = (habitId) => {
    const index = habits.findIndex(h => h.id === habitId);
    if (index < habits.length - 1 && index !== -1) {
        const updatedHabits = [...habits];
        // Simple swap using destructuring for conciseness
        [updatedHabits[index + 1], updatedHabits[index]] = [updatedHabits[index], updatedHabits[index + 1]];
        setHabits(updatedHabits);
        saveData();
        uiCallbacks.requestRenderHabits(); // Corrected: was renderHabits()
    }
};

/**
 * Deletes a specific habit from the application.
 * Removes the habit, adjusts XP if it was completed today, saves data,
 * updates UI, and triggers an AI interaction.
 * @param {string} habitId - The ID of the habit to be deleted.
 * @returns {void}
 */
export const deleteHabit = (habitId) => {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex > -1) {
        const { name: habitName, completedToday, baseXpValue, streak } = habits[habitIndex]; // Destructuring
        const { level: userLevel } = userProfile; // Destructuring

        if (completedToday) {
            addXP(-(baseXpValue + calculateStreakBonus(streak)));
        }

        const updatedHabits = habits.filter(h => h.id !== habitId);
        setHabits(updatedHabits);

        saveData();
        uiCallbacks.requestRenderHabits();
        uiCallbacks.updateGamificationDisplay();
        uiCallbacks.showToast(`Habit "${habitName}" deleted.`);

        if (geminiApiKey) {
            const promptContext = habitDeleteContext({
                userTitle: getUserTitle(userLevel),
                habitName: habitName
            });
            generateAiResponse("habit_delete", promptContext);
        }
    }
};