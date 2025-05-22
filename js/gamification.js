import { userProfile, setUserProfile, geminiApiKey } from './state.js';
import { XP_FOR_LEVEL_1, XP_GROWTH_FACTOR, LEVEL_TITLES, ATTITUDE_MAPPING } from './config.js';
// UI imports removed
import { generateAiResponse } from './api.js';
import { saveData } from './data.js';
import { levelUpContext } from './ai_prompts.js';
import { getValueForLevel } from './utils.js'; // Import the new utility function

let uiCallbacks = {
    showToast: (message, type, duration) => console.warn('showToast callback not set in gamification.js', { message, type, duration }),
    updateAiAvatarImage: (level) => console.warn('updateAiAvatarImage callback not set', { level }),
    requestUpdateGamificationDisplay: () => console.warn('requestUpdateGamificationDisplay callback not set')
};

export function initGamification(callbacks) {
    uiCallbacks = { ...uiCallbacks, ...callbacks };
};

/**
 * Calculates the total experience points required to reach the next level from the current level.
 * @param {number} currentLevel - The user's current level.
 * @returns {number} The total XP needed for the next level.
 */
export const calculateXpForNextLevel = (currentLevel) => {
    if (currentLevel === 0) return XP_FOR_LEVEL_1;
    return Math.floor(XP_FOR_LEVEL_1 * Math.pow(XP_GROWTH_FACTOR, currentLevel));
};

/**
 * Adds (or subtracts) XP from the user's profile.
 * Updates total XP and current level XP, then checks for level up/down.
 * Triggers a UI update for gamification display.
 * @param {number} amount - The amount of XP to add (can be negative).
 * @returns {void}
 */
export const addXP = (amount) => {
    const newProfile = { ...userProfile }; // Create a mutable copy
    newProfile.xp += amount;
    newProfile.currentLevelXP += amount;

    // Ensure XP doesn't go below zero
    newProfile.currentLevelXP = Math.max(0, newProfile.currentLevelXP);
    newProfile.xp = Math.max(0, newProfile.xp);

    setUserProfile(newProfile); // Update state with the new values
    checkLevelUp(); // Check for level up based on the updated state
    uiCallbacks.requestUpdateGamificationDisplay(); // Notify UI to update
};

/**
 * Checks if the user has leveled up based on their current XP.
 * If a level up occurs, it updates the user's profile (level, XP for next level),
 * displays a toast notification, updates the AI's avatar, and potentially triggers an AI interaction.
 * Saves the user's profile if a level up occurred.
 * @returns {void}
 */
export const checkLevelUp = () => {
    let leveledUp = false;
    // Work with a mutable copy of the userProfile from the state, as it might be updated multiple times.
    let currentProfileState = { ...userProfile };

    while (currentProfileState.currentLevelXP >= currentProfileState.xpForNextLevel && currentProfileState.xpForNextLevel > 0) {
        currentProfileState.level++;
        currentProfileState.currentLevelXP -= currentProfileState.xpForNextLevel;
        currentProfileState.xpForNextLevel = calculateXpForNextLevel(currentProfileState.level);
        leveledUp = true;

        const { level, xp } = currentProfileState; // Destructure for context
        const userTitle = getUserTitle(level);

        uiCallbacks.showToast(`LEVEL UP! You are now Level ${level}: ${userTitle}! 🎉`, "success", 5000);
        uiCallbacks.updateAiAvatarImage(level);

        if (geminiApiKey) {
            const promptContext = levelUpContext({ level, userTitle, totalXp: xp });
            generateAiResponse("level_up", promptContext);
        }
    }

    if (leveledUp) {
        setUserProfile(currentProfileState); // Update the main state if level up occurred
        saveData(); // Save after level up changes
    }
};

/**
 * Retrieves the user's title based on their current level.
 * Titles are defined in `config.js`.
 * @param {number} level - The user's current level.
 * @returns {string} The user's title (e.g., "Habit Dabbler").
 */
export const getUserTitle = (level) => {
    // Find the highest title for which the level is sufficient
    return LEVEL_TITLES.slice().reverse().find(lt => level >= lt.minLevel)?.title || LEVEL_TITLES[0].title;
};

/**
 * Determines the AI's attitude towards the user based on the user's current level.
 * Attitudes are defined in `config.js` and retrieved using the `getValueForLevel` utility.
 * @param {number} level - The user's current level.
 * @returns {string} A string describing the AI's current attitude.
 */
export const getUserAttitude = (level) => {
    // Use ATTITUDE_MAPPING.level_0 as the default if nothing else matches.
    const defaultAttitude = ATTITUDE_MAPPING.level_0 || "neutral"; // Fallback if level_0 is somehow missing
    return getValueForLevel(level, ATTITUDE_MAPPING, defaultAttitude, 'level_');
};

/**
 * Calculates the XP bonus awarded for completing a habit based on the current streak.
 * The bonus increases with the streak length, capped at a maximum defined by the conditions.
 * @param {number} streak - The current streak count for the habit.
 * @returns {number} The calculated XP bonus. Returns 0 if streak is undefined, 0, or negative.
 */
export const calculateStreakBonus = (streak) => {
    if (!streak || streak <= 0) return 0;
    const s = Math.min(streak, 30); // Cap streak at 30 for bonus calculation
    if (s >= 30) return 20;
    if (s >= 20) return 15;
    if (s >= 10) return 10;
    if (s >= 5) return 5;
    if (s >= 1) return 2;
    return 0;
};
