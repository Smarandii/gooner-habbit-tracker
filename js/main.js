import { loadData, saveData } from './data.js';
import {
    renderHabits, updateGamificationDisplay, showToast, updateAiAvatarImage,
    promptForApiKeyModal, closeApiKeyModal, getApiKeyInput, clearNewHabitInput,
    setAiCompanionName, domElements, initUiElements
} from './ui.js';
import {
    initHabits,
    performDailyResetIfNeeded,
    handleUserAddHabit as processUserAddedHabit, // Renamed for clarity in this file
    toggleHabitCompletion,
    deleteHabit,
    startEditHabit,
    saveHabitEdit,
    cancelHabitEdit,
    moveHabitUp,
    moveHabitDown
} from './habits.js';
import {
    initGamification,
    addXP,
    getUserTitle
} from './gamification.js';
import { XP_FOR_DAILY_LOGIN, AI_COMPANION_NAME } from './config.js';
import { checkAndPromptForApiKey, handleSaveApiKey as processSaveApiKey, generateAiResponse } from './api.js';
import { userProfile, geminiApiKey, setUserProfile } from './state.js';
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { loginContext } from './ai_prompts.js';

/**
 * Handles daily login logic including updating login streak, awarding XP,
 * and triggering an AI greeting. Saves the updated user profile.
 * @param {boolean} [skipAiGreeting=false] - If true, the AI greeting part is skipped.
 * @returns {void}
 */
function handleDailyLogin(skipAiGreeting = false) {
    const todayStr = getTodayDateString();
    // Work with a copy of userProfile from state for modifications
    let tempProfile = { ...userProfile };
    let profileChanged = false;

    if (tempProfile.lastLoginDate !== todayStr) {
        if (tempProfile.lastLoginDate === getYesterdayDateString()) {
            tempProfile.loginStreak++;
        } else {
            tempProfile.loginStreak = 1;
        }
        tempProfile.lastLoginDate = todayStr;
        profileChanged = true;

        // addXP will update the state via setUserProfile and handle saving if level up
        addXP(XP_FOR_DAILY_LOGIN);
        showToast(`Welcome back! +${XP_FOR_DAILY_LOGIN} XP for daily visit! Login Streak: ${tempProfile.loginStreak}`, "success");

        if (!skipAiGreeting && geminiApiKey) {
            const promptContext = loginContext(
				{
					userTitle: getUserTitle(tempProfile.level),
					loginStreak: tempProfile.loginStreak,
					today: new Date().toLocaleDateString()
				}
            );
            generateAiResponse("daily_login", promptContext);
        }
    }

    if (profileChanged) {
        setUserProfile(tempProfile);
        saveData();
    }

    // Always update UI from the potentially modified state after all logic
    if(domElements.loginStreakEl) domElements.loginStreakEl.textContent = userProfile.loginStreak;
    updateGamificationDisplay();
}


/**
 * Initializes the application.
 * This function orchestrates the setup of UI elements, loading of data,
 * initialization of modules (habits, gamification), API key checks,
 * daily login procedures, initial UI rendering, and attachment of global event listeners.
 * @async
 * @returns {Promise<void>} A promise that resolves when the application is fully initialized.
 */
async function initApp() {
    initUiElements(); // <<<< CALL THIS FIRST inside DOMContentLoaded

    // Prepare callbacks for habits.js
    const uiCallbacksForHabits = {
        requestRenderHabits: () => renderHabits(habitActionHandlersForUi), // Will define habitActionHandlersForUi shortly
        showToast: showToast,
        updateGamificationDisplay: updateGamificationDisplay,
        getNewHabitInput: getNewHabitInput,
        clearNewHabitInput: clearNewHabitInput
    };
    initHabits(uiCallbacksForHabits);

    // Prepare action handlers for ui.js (renderHabits)
    const habitActionHandlersForUi = {
        onToggleCompletion: toggleHabitCompletion,
        onStartEdit: startEditHabit,
        onSaveEdit: saveHabitEdit,
        onCancelEdit: cancelHabitEdit,
        onDelete: deleteHabit,
        onMoveUp: moveHabitUp,
        onMoveDown: moveHabitDown
    };

    // Prepare callbacks for gamification.js
    const uiCallbacksForGamification = {
        showToast: showToast,
        updateAiAvatarImage: updateAiAvatarImage,
        requestUpdateGamificationDisplay: updateGamificationDisplay
    };
    initGamification(uiCallbacksForGamification);

    setAiCompanionName(AI_COMPANION_NAME);
    loadData(); // This calls setGeminiApiKey, which might be needed before API calls
    updateAiAvatarImage(userProfile.level);

    try {
        await checkAndPromptForApiKey(); // Needs API key to be potentially set by loadData
    } catch (error) {
        // console.warn already handled by checkAndPromptForApiKey or not needed if modal handles it
    }

    performDailyResetIfNeeded(); // This might call uiCallbacks.showToast and uiCallbacks.requestRenderHabits (via initHabits)
    handleDailyLogin(); // This calls addXP, which now triggers requestUpdateGamificationDisplay (via initGamification)

    renderHabits(habitActionHandlersForUi);
    updateGamificationDisplay(); // Initial gamification display after loadData and potential daily login XP
    // updateAiAvatarImage is called by loadData, and potentially by handleDailyLogin->addXP->checkLevelUp

    // Event Listeners - now domElements should be populated
    if (domElements.addHabitBtn) {
        domElements.addHabitBtn.addEventListener('click', processUserAddedHabit);
    }
    if (domElements.newHabitInput) {
        domElements.newHabitInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') processUserAddedHabit();
        });
    }
    if (domElements.saveApiKeyBtn) {
        domElements.saveApiKeyBtn.addEventListener('click', () => {
            const inputKey = getApiKeyInput();
            if (processSaveApiKey(inputKey)) {
                closeApiKeyModal();
            }
        });
    }
    if (domElements.changeApiKeyBtn) {
        domElements.changeApiKeyBtn.addEventListener('click', () => {
            promptForApiKeyModal(true, geminiApiKey);
        });
    }
    // AI Panel Scrolling Logic
    const aiPanelElement = document.querySelector('.ai-panel');
    if (aiPanelElement) {
        window.addEventListener('scroll', () => {
            // Adjusts the .ai-panel's top CSS property to make its top edge
            // (relative to .app-layout) follow the window's vertical scroll position.
            aiPanelElement.style.top = `${window.scrollY}px`;
        });
    }
}

// Consolidated DOMContentLoaded listener
document.addEventListener('DOMContentLoaded', initApp);