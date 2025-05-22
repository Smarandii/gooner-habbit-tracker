import { habits, userProfile, setHabits, setUserProfile, geminiApiKey, setGeminiApiKey } from './state.js';
import { HABITS_LS_KEY, USER_PROFILE_LS_KEY, GEMINI_API_KEY_LS_KEY, AI_COMPANION_NAME } from './config.js';
import { calculateXpForNextLevel } from './gamification.js';
import { setAiCompanionName } from './ui.js';

/**
 * Saves the current application state (habits, user profile, and API key) to localStorage.
 * @returns {void}
 */
export const saveData = () => {
    const { geminiApiKey: userApiKey } = userProfile; // Destructuring
    // userProfile already contains geminiApiKey via setGeminiApiKey

    localStorage.setItem(HABITS_LS_KEY, JSON.stringify(habits));
    localStorage.setItem(USER_PROFILE_LS_KEY, JSON.stringify(userProfile));

    if (userApiKey) {
        localStorage.setItem(GEMINI_API_KEY_LS_KEY, userApiKey);
    } else {
        localStorage.removeItem(GEMINI_API_KEY_LS_KEY);
    }
};

/**
 * Loads application state from localStorage.
 * This includes habits, user profile, and the Gemini API key.
 * It also initializes the AI companion's name and calculates XP for the next level.
 * @returns {void}
 */
export const loadData = () => {
    const storedHabits = localStorage.getItem(HABITS_LS_KEY);
    if (storedHabits) {
        // Convert each habit object to ensure all properties are fresh (e.g. no stale methods if they existed)
        setHabits(JSON.parse(storedHabits).map(h => ({ ...h })));
    }

    const storedUserProfile = localStorage.getItem(USER_PROFILE_LS_KEY);
    let tempProfile = { ...userProfile }; // Start with a copy of current defaults/state

    if (storedUserProfile) {
        const loadedProfile = JSON.parse(storedUserProfile);
        tempProfile = { ...tempProfile, ...loadedProfile }; // Merge loaded profile over defaults
    }

    // Prioritize API key from local storage, then from the potentially loaded profile
    const storedApiKey = localStorage.getItem(GEMINI_API_KEY_LS_KEY) || tempProfile.geminiApiKey;
    setGeminiApiKey(storedApiKey); // This updates the geminiApiKey in state.js and userProfile in state.js

    // Ensure xpForNextLevel is correctly calculated based on the (potentially loaded) level
    // tempProfile.geminiApiKey is now correctly set by setGeminiApiKey if storedApiKey was found
    // So, we use userProfile from state which is the source of truth after setGeminiApiKey
    tempProfile.xpForNextLevel = calculateXpForNextLevel(userProfile.level); // Use userProfile.level from state for consistency
    
    // Update the userProfile in the state with the potentially merged profile
    // and the recalculated xpForNextLevel.
    // Note: tempProfile already has geminiApiKey correctly set via setGeminiApiKey if one was found.
    // If not, it retains its original value (null or from loadedProfile).
    // The setGeminiApiKey call earlier ensures userProfile in state has the right key.
    setUserProfile(tempProfile);


    setAiCompanionName(AI_COMPANION_NAME);
};