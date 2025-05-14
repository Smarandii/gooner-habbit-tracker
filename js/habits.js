import { habits, userProfile, geminiApiKey, setHabits } from './state.js';
import { BASE_XP_PER_HABIT, AI_COMPANION_NAME } from './config.js';
import { renderHabits, showToast, updateGamificationDisplay, getNewHabitInput, clearNewHabitInput } from './ui.js';
import { addXP, calculateStreakBonus, getUserTitle } from './gamification.js';
import { generateAiResponse } from './api.js';
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { saveData } from './data.js';

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
            } else { if (habit.streak > 0) streaksMaintained++; }
            return { ...habit, completedToday: false, streak: newStreak };
        });

        setHabits(updatedHabits);
        userProfile.lastDailyReset = todayDateStr; // Directly modify from state or pass setUserProfile

        let resetMsg = "Daily reset. ";
        if(streaksBroken > 0) resetMsg += `${streaksBroken} habit streak(s) broken. `;
        if(streaksMaintained > 0) resetMsg += `${streaksMaintained} maintained. `;
        showToast(resetMsg, "info", 4000);
        saveData();
        renderHabits(); // Re-render after reset
    }
}

export function handleUserAddHabit() {
    const habitName = getNewHabitInput();
    if (habitName === "") {
        showToast("Habit name cannot be empty.", "error");
        return;
    }
    _addHabitToList(habitName); // Internal function
    clearNewHabitInput();

    if (geminiApiKey) {
        const promptContext = `Your "Atomic Habit Hero" (${getUserTitle(userProfile.level)}) just added a new habit: "${habitName}".`;
        generateAiResponse("new_habit", promptContext);
    }
}

function _addHabitToList(name) {
    const newHabit = {
        id: Date.now().toString(), name: name, createdAt: new Date().toISOString(),
        baseXpValue: BASE_XP_PER_HABIT, completedToday: false, streak: 0, lastCompletedDate: null
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

    let habit = { ...habits[habitIndex] }; // Work with a copy
    const todayStr = getTodayDateString();
    const yesterdayStr = getYesterdayDateString();

    if (!habit.completedToday) { // Completing
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