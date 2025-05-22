import { calculateXpForNextLevel } from './gamification.js';
import { getTodayDateString } from './utils.js';

export let habits = [];
export let userProfile = {
    xp: 0,
    level: 0,
    currentLevelXP: 0,
    xpForNextLevel: 100,
    lastDailyReset: getTodayDateString(),
    geminiApiKey: null,
    lastLoginDate: null,
    loginStreak: 0
};

userProfile.xpForNextLevel = calculateXpForNextLevel(userProfile.level);

export let geminiApiKey = null;
export let isAiThinking = false;

/**
 * Updates the global habits array with a new set of habits.
 * @param {Array<Object>} newHabits - The new array of habit objects.
 * @returns {void}
 */
export const setHabits = (newHabits) => {
    habits = newHabits;
};

/**
 * Updates the global userProfile object by merging new profile data.
 * Recalculates xpForNextLevel based on the potentially updated level.
 * @param {Object} newProfile - An object containing properties to update in the userProfile.
 * @returns {void}
 */
export const setUserProfile = (newProfile) => {
    userProfile = { ...userProfile, ...newProfile };
    // Ensure level is destructured for clarity if newProfile could overwrite it partially
    const { level } = userProfile;
    userProfile.xpForNextLevel = calculateXpForNextLevel(level);
};

/**
 * Sets the Gemini API key in both the module-level variable and the userProfile object.
 * @param {string|null} key - The Gemini API key, or null to clear it.
 * @returns {void}
 */
export const setGeminiApiKey = (key) => {
    geminiApiKey = key;
    userProfile.geminiApiKey = key; // Directly update the userProfile object property
};

/**
 * Sets the global flag indicating whether the AI is currently processing a request.
 * @param {boolean} thinking - True if the AI is thinking, false otherwise.
 * @returns {void}
 */
export const setIsAiThinking = (thinking) => {
    isAiThinking = thinking;
};