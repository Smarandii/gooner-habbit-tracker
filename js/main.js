import { loadData, saveData } from './data.js';
import {
    renderHabits, updateGamificationDisplay, showToast, updateAiAvatarImage,
    promptForApiKeyModal, closeApiKeyModal, getApiKeyInput, setAiCompanionName,
    domElements, initUiElements // Import initUiElements
} from './ui.js';
import { performDailyResetIfNeeded, handleUserAddHabit as processUserAddedHabit } from './habits.js';
import { addXP, getUserTitle } from './gamification.js'; // XP_FOR_DAILY_LOGIN is now imported from config
import { XP_FOR_DAILY_LOGIN, AI_COMPANION_NAME } from './config.js'; // Import constants
import { checkAndPromptForApiKey, handleSaveApiKey as processSaveApiKey, generateAiResponse, populateModelSelector } from './api.js';
import { userProfile, geminiApiKey, setUserProfile } from './state.js';
import { getTodayDateString, getYesterdayDateString } from './utils.js';
import { loginContext } from './ai_prompts.js';


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




async function initApp() {
    initUiElements(); // <<<< CALL THIS FIRST inside DOMContentLoaded

    setAiCompanionName(AI_COMPANION_NAME);
    loadData();
    updateAiAvatarImage(userProfile.level);

    try {
        await checkAndPromptForApiKey();
        populateModelSelector();
    } catch (error) {
        console.warn("API Key setup or check failed initially:", error);
        // displayAiMessage is handled by checkAndPromptForApiKey if it fails to get key
    }

    performDailyResetIfNeeded();
    handleDailyLogin();
    renderHabits();
    updateGamificationDisplay();
    updateAiAvatarImage(userProfile.level);

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
					$(window).scroll(function() {
						// Get the current vertical scroll position of the window
						const scrollTop = $(this).scrollTop();

						// Set the 'top' CSS property of the .ai-panel.
						// This will make the .ai-panel's top edge (relative to .app-layout)
						// move down by the amount the window has scrolled.
						$aiPanel.css('top', scrollTop + 'px');
					});
				} else {
					// Optional: Log a warning if the .ai-panel element isn't found
					console.warn('.ai-panel element not found. Scroll follow functionality not applied.');
				}
			} else {
				console.error('jQuery is not loaded. Scroll follow functionality for .ai-panel cannot be applied.');
			}
	});