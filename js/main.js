import { loadData, saveData } from './data.js';
import {
    renderHabits, updateGamificationDisplay, showToast, updateAiAvatarImage,
    promptForApiKeyModal, closeApiKeyModal, getApiKeyInput, setAiCompanionName, domElements
} from './ui.js';
import { performDailyResetIfNeeded, handleUserAddHabit as processUserAddedHabit } from './habits.js'; // Renamed import for clarity
import { addXP, getUserTitle } from './gamification.js';
import { XP_FOR_DAILY_LOGIN } from './config.js';
import { checkAndPromptForApiKey, handleSaveApiKey as processSaveApiKey, generateAiResponse } from './api.js';
import { userProfile, geminiApiKey, setUserProfile } from './state.js';
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { AI_COMPANION_NAME } from './config.js';

function handleDailyLogin(skipAiGreeting = false) {
    const todayStr = getTodayDateString();
    const previousLoginDate = userProfile.lastLoginDate;

    let profileChanged = false;
    let tempProfile = { ...userProfile };

    if (tempProfile.lastLoginDate !== todayStr) {
        if (tempProfile.lastLoginDate === getYesterdayDateString()) {
            tempProfile.loginStreak++;
        } else {
            tempProfile.loginStreak = 1;
        }
        tempProfile.lastLoginDate = todayStr;
        profileChanged = true;

        addXP(XP_FOR_DAILY_LOGIN);
        showToast(`Welcome back! +${XP_FOR_DAILY_LOGIN} XP for daily visit! Login Streak: ${tempProfile.loginStreak}`, "success");

        if (!skipAiGreeting && geminiApiKey) {
            const promptContext = `The user, your "${getUserTitle(tempProfile.level)}", just logged in. Their current login streak is ${tempProfile.loginStreak} days. Today is ${new Date().toLocaleDateString()}.`;
            generateAiResponse("daily_login", promptContext);
        }
    }

    // If profile was changed by login logic but not by addXP (if XP was 0), ensure it's set and saved.
    if (profileChanged) {
        setUserProfile(tempProfile); // Update state with new login data
        saveData(); // Save changes related to login
    }

    // Always update UI from the potentially modified state
    domElements.loginStreakEl.textContent = userProfile.loginStreak;
    updateGamificationDisplay(); // This ensures gamification UI is also up-to-date
}


async function initApp() {
    setAiCompanionName(AI_COMPANION_NAME);
    loadData(); // Loads data into state variables (userProfile, habits, geminiApiKey)
    updateAiAvatarImage(userProfile.level); // Initial avatar

    try {
        await checkAndPromptForApiKey(); // Waits for API key check/prompt
        // If API key is missing and modal is shown, the rest might execute before key is entered.
        // This part of the logic could be refined if the modal needs to block execution.
        // For now, assuming if checkAndPromptForApiKey resolves, we proceed.
    } catch (error) {
        console.warn("API Key setup or check failed initially:", error);
        // ui.js's displayAiMessage should handle showing error to user.
    }

    performDailyResetIfNeeded();
    handleDailyLogin(); // Handles login XP, streak, and AI greeting
    renderHabits();
    updateGamificationDisplay();
    updateAiAvatarImage(userProfile.level); // Ensure avatar is correct after all init steps

    // Event Listeners
    domElements.addHabitBtn.addEventListener('click', processUserAddedHabit);
    domElements.newHabitInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') processUserAddedHabit();
    });

    domElements.saveApiKeyBtn.addEventListener('click', () => {
        const inputKey = getApiKeyInput();
        if (processSaveApiKey(inputKey)) { // processSaveApiKey returns true on success
            closeApiKeyModal();
        }
    });

    domElements.changeApiKeyBtn.addEventListener('click', () => {
        promptForApiKeyModal(true, geminiApiKey); // Pass current key from state and force prompt
    });
}

document.addEventListener('DOMContentLoaded', initApp);