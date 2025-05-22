import { loadData, saveData } from './data.js';
import {
    renderHabits, updateGamificationDisplay, showToast, updateAiAvatarImage,
    promptForApiKeyModal, closeApiKeyModal, getApiKeyInput, clearNewHabitInput, // Added clearNewHabitInput
    setAiCompanionName, domElements, initUiElements
} from './ui.js';
import {
    initHabits, // New import
    performDailyResetIfNeeded,
    handleUserAddHabit as processUserAddedHabit, // Renamed for clarity in this file
    toggleHabitCompletion, // New import for habitActionHandlers
    deleteHabit,           // New import
    startEditHabit,        // New import
    saveHabitEdit,         // New import
    cancelHabitEdit,       // New import
    moveHabitUp,           // New import
    moveHabitDown          // New import
} from './habits.js';
import {
    initGamification, // New import
    addXP,
    getUserTitle
} from './gamification.js';
import { XP_FOR_DAILY_LOGIN, AI_COMPANION_NAME } from './config.js'; // Import constants
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
        setUserProfile(tempProfile); // Ensure state is updated with login changes
        saveData(); // Save these login-specific changes
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
    initHabits(uiCallbacksForHabits); // Initialize habits module with UI callbacks

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
    initGamification(uiCallbacksForGamification); // Initialize gamification module

    setAiCompanionName(AI_COMPANION_NAME);
    loadData(); // This calls setGeminiApiKey, which might be needed before API calls
    updateAiAvatarImage(userProfile.level); // Initial avatar based on loaded level

    try {
        await checkAndPromptForApiKey(); // Needs API key to be potentially set by loadData
    } catch (error) {
        // console.warn already handled by checkAndPromptForApiKey or not needed if modal handles it
    }

    performDailyResetIfNeeded(); // This might call uiCallbacks.showToast and uiCallbacks.requestRenderHabits (via initHabits)
    handleDailyLogin(); // This calls addXP, which now triggers requestUpdateGamificationDisplay (via initGamification)

    renderHabits(habitActionHandlersForUi); // Initial render
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
}

// This ensures initApp runs after the basic DOM structure is parsed.
// The initUiElements() call inside initApp then ensures elements are selected.
document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('DOMContentLoaded', () => {
		if (typeof $ !== 'undefined') {
				const $aiPanel = $('.ai-panel');

				if ($aiPanel.length) {
					$(window).scroll(() => {
						// Get the current vertical scroll position of the window
						const scrollTop = $(window).scrollTop(); // Changed $(this) to $(window)

						// Set the 'top' CSS property of the .ai-panel.
						// This will make the .ai-panel's top edge (relative to .app-layout)
						// move down by the amount the window has scrolled.
						$aiPanel.css('top', scrollTop + 'px');
					});
				} else {
					// Optional: Log if the .ai-panel element isn't found, though this is a dev concern.
					// No user-facing warning needed here as it's a non-critical enhancement.
				}
			} else {
				// jQuery not loaded, scroll functionality cannot be applied.
				// This is a development/setup issue, not a runtime user error.
			}
	});