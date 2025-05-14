import { loadData, saveData } from './data.js';
import { renderHabits, updateGamificationDisplay, showToast, updateAiAvatarImage, promptForApiKeyModal, closeApiKeyModal, getApiKeyInput, setAiCompanionName, domElements } from './ui.js';
import { performDailyResetIfNeeded, handleUserAddHabit } from './habits.js';
import { addXP, XP_FOR_DAILY_LOGIN, getUserTitle } from './gamification.js';
import { checkAndPromptForApiKey, handleSaveApiKey, generateAiResponse } from './api.js';
import { userProfile, geminiApiKey } from './state.js'; // For direct access where needed
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { AI_COMPANION_NAME } from './config.js';

function handleDailyLoginLogic(skipAiGreeting = false) {
    const todayStr = getTodayDateString();
    const previousLoginDate = userProfile.lastLoginDate;

    if (previousLoginDate !== todayStr) {
        if (previousLoginDate === getYesterdayDateString()) {
            userProfile.loginStreak++;
        } else {
            userProfile.loginStreak = 1;
        }
        userProfile.lastLoginDate = todayStr;

        addXP(XP_FOR_DAILY_LOGIN); // This will call checkLevelUp -> updateGamificationDisplay
        showToast(`Welcome back! +${XP_FOR_DAILY_LOGIN} XP for daily visit! Login Streak: ${userProfile.loginStreak}`, "success");
        // No need to call updateGamificationDisplay here, addXP handles it.

        if (!skipAiGreeting && geminiApiKey) {
            const promptContext = `The user, your "${getUserTitle(userProfile.level)}", just logged in. Their current login streak is ${userProfile.loginStreak} days. Today is ${new Date().toLocaleDateString()}.`;
            generateAiResponse("daily_login", promptContext);
        } else if (!geminiApiKey) {
            // displayAiMessage is in ui.js, ensure it's exported and imported if needed here or called from ui context
        }
    }
    // Always update UI elements related to login, even if no XP was awarded (e.g. same day reload)
    domElements.loginStreakEl.textContent = userProfile.loginStreak;
    updateGamificationDisplay(); // Ensure consistency
    saveData(); // Save after potential login streak/date updates
}


function initApp() {
    setAiCompanionName(AI_COMPANION_NAME); // From ui.js
    loadData();
    updateAiAvatarImage(userProfile.level); // Initial avatar based on loaded level

    checkAndPromptForApiKey()
        .then(() => {
            performDailyResetIfNeeded();
            handleDailyLoginLogic();
            renderHabits();
            updateGamificationDisplay(); // This updates level display too
        })
        .catch(error => {
            console.error("API Key setup failed:", error);
            // displayAiMessage is in ui.js, ensure it's exported and imported
            performDailyResetIfNeeded();
            handleDailyLoginLogic(true); // Skip AI greeting
            renderHabits();
            updateGamificationDisplay();
        })
        .finally(() => {
            // This ensures UI is updated correctly even if promises have complex paths
            updateAiAvatarImage(userProfile.level);
            updateGamificationDisplay();
        });


    // Event Listeners for UI elements
    domElements.addHabitBtn.addEventListener('click', handleUserAddHabit);
    domElements.newHabitInput.addEventListener('keypress', e => e.key === 'Enter' && handleUserAddHabit());

    domElements.saveApiKeyBtn.addEventListener('click', () => {
        const inputKey = getApiKeyInput();
        if (handleSaveApiKey(inputKey)) { // handleSaveApiKey now returns true on success
            closeApiKeyModal();
        }
    });

    document.getElementById('changeApiKeyBtn').addEventListener('click', () => { // Assuming changeApiKeyBtn is still in HTML
        promptForApiKeyModal(true, geminiApiKey); // Pass current key and force
    });
}

document.addEventListener('DOMContentLoaded', initApp);