// js/habits.js
import { habits, userProfile, geminiApiKey, setHabits, setUserProfile } from './state.js';
import { BASE_XP_PER_HABIT } from './config.js';
import { renderHabits, showToast, updateGamificationDisplay, getNewHabitInput, clearNewHabitInput } from './ui.js';
import { addXP, calculateStreakBonus, getUserTitle } from './gamification.js';
import { generateAiResponse } from './api.js';
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { saveData } from './data.js';

// --- Existing Functions (performDailyResetIfNeeded, handleUserAddHabit, _addHabitToList, deleteHabit, toggleHabitCompletion) ---
// These remain unchanged from your last provided version.

export function performDailyResetIfNeeded() {
    const todayDateStr = getTodayDateString();
    if (userProfile.lastDailyReset !== todayDateStr) {
        const yesterdayDateStr = getYesterdayDateString();
        let streaksBroken = 0; let streaksMaintained = 0;

        const updatedHabits = habits.map(habit => {
            let newStreak = habit.streak;
            if (habit.lastCompletedDate !== yesterdayDateStr) {
                const habitCreationDate = new Date(habit.createdAt).toISOString().split('T')[0];
                if (habit.streak > 0 && habitCreationDate < todayDateStr) {
                    newStreak = 0; streaksBroken++;
                }
            } else {
                if (habit.streak > 0) streaksMaintained++;
            }
            return { ...habit, completedToday: false, streak: newStreak };
        });

        setHabits(updatedHabits);
        const newProfile = { ...userProfile, lastDailyReset: todayDateStr };
        setUserProfile(newProfile);

        let resetMsg = "Daily reset. ";
        if(streaksBroken > 0) resetMsg += `${streaksBroken} habit streak(s) broken. `;
        if(streaksMaintained > 0) resetMsg += `${streaksMaintained} maintained. `;
        showToast(resetMsg, "info", 4000);
        saveData();
        renderHabits();
    }
}

export function handleUserAddHabit() {
    const habitName = getNewHabitInput();
    if (habitName === "") {
        showToast("Habit name cannot be empty.", "error");
        return;
    }
    _addHabitToList(habitName);
    clearNewHabitInput();

    if (geminiApiKey) {
        const promptContext = `The user, known as "${getUserTitle(userProfile.level)}", just added a new habit: "${habitName}".`;
        generateAiResponse("new_habit", promptContext);
    }
}

function _addHabitToList(name) {
    const newHabit = {
        id: Date.now().toString(), name: name, createdAt: new Date().toISOString(),
        baseXpValue: BASE_XP_PER_HABIT, completedToday: false, streak: 0, lastCompletedDate: null,
        isEditing: false
    };
    const updatedHabits = [...habits, newHabit];
    setHabits(updatedHabits);

    saveData();
    renderHabits();
    showToast(`Habit "${name}" added!`);
}

export function deleteHabit(habitId) {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex > -1) {
        const habitToDelete = habits[habitIndex];
        if (habitToDelete.completedToday) {
            addXP(-(habitToDelete.baseXpValue + calculateStreakBonus(habitToDelete.streak)));
        }
        const habitName = habitToDelete.name;
        const updatedHabits = habits.filter(h => h.id !== habitId);
        setHabits(updatedHabits);

        saveData();
        renderHabits();
        updateGamificationDisplay();
        showToast(`Habit "${habitName}" deleted.`);
    }
}

export function toggleHabitCompletion(habitId) {
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    let habit = { ...habits[habitIndex] };
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    if (!habit.completedToday) {
        habit.completedToday = true;
        if (habit.lastCompletedDate === yesterdayStr) habit.streak++;
        else if (habit.lastCompletedDate !== todayStr) habit.streak = 1;
        habit.lastCompletedDate = todayStr;

        const awardedXP = habit.baseXpValue + calculateStreakBonus(habit.streak);
        addXP(awardedXP);
        showToast(`"${habit.name}" (Streak: ${habit.streak})! +${awardedXP} XP! 💪`);
        if (geminiApiKey) {
            const promptContext = `${getUserTitle(userProfile.level)} just completed the habit: "${habit.name}". Their streak for this habit is ${habit.streak} days. They gained ${awardedXP} XP.`;
            generateAiResponse("habit_complete", promptContext);
        }
    } else {
        habit.completedToday = false;
        const subtractedXP = habit.baseXpValue + calculateStreakBonus(habit.streak);
        addXP(-subtractedXP);
        showToast(`"${habit.name}" marked incomplete. XP removed.`);
    }

    const updatedHabits = [...habits];
    updatedHabits[habitIndex] = habit;
    setHabits(updatedHabits);

    saveData();
    renderHabits();
    updateGamificationDisplay();
}


// --- Functions for Editing and Reordering ---

export function startEditHabit(habitId) {
    const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, isEditing: true, originalNameBeforeEdit: h.name } : { ...h, isEditing: false }
    );
    setHabits(updatedHabits);
    renderHabits();
}

export function saveHabitEdit(habitId, newNameInput) {
    const name = newNameInput.trim();
    const habitIndex = habits.findIndex(h => h.id === habitId);
    if (habitIndex === -1) return;

    const oldHabit = habits[habitIndex];
    const oldName = oldHabit.originalNameBeforeEdit || oldHabit.name; // Get the name before edit started

    if (name === "") {
        showToast("Habit name cannot be empty.", "error");
        const editInput = document.querySelector(`.edit-input[data-habit-id="${habitId}"]`);
        if(editInput) editInput.value = oldName; // Revert input field to original name
        return;
    }

    // Check if the name actually changed to avoid unnecessary AI calls
    const nameHasChanged = oldName !== name;

    const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, name: name, isEditing: false, originalNameBeforeEdit: undefined } : h
    );
    setHabits(updatedHabits);
    saveData();
    renderHabits();
    showToast("Habit updated!", "success");

    if (geminiApiKey && nameHasChanged) { // Only trigger AI if the name actually changed
        const promptContext = `The user, "${getUserTitle(userProfile.level)}", just edited a habit. It was originally named "${oldName}" and is now named "${name}".`;
        generateAiResponse("habit_edit", promptContext);
    }
}

export function cancelHabitEdit(habitId) {
    const updatedHabits = habits.map(h =>
        h.id === habitId ? { ...h, name: h.originalNameBeforeEdit || h.name, isEditing: false, originalNameBeforeEdit: undefined } : h
    );
    setHabits(updatedHabits);
    renderHabits();
}

export function moveHabitUp(habitId) {
    const index = habits.findIndex(h => h.id === habitId);
    if (index > 0) {
        const updatedHabits = [...habits];
        const temp = updatedHabits[index - 1];
        updatedHabits[index - 1] = updatedHabits[index];
        updatedHabits[index] = temp;
        setHabits(updatedHabits);
        saveData();
        renderHabits();
    }
}

export function moveHabitDown(habitId) {
    const index = habits.findIndex(h => h.id === habitId);
    if (index < habits.length - 1 && index !== -1) {
        const updatedHabits = [...habits];
        const temp = updatedHabits[index + 1];
        updatedHabits[index + 1] = updatedHabits[index];
        updatedHabits[index] = temp;
        setHabits(updatedHabits);
        saveData();
        renderHabits();
    }
}