import { habits, userProfile, setHabits, setUserProfile, geminiApiKey, setGeminiApiKey } from './state.js';
import { HABITS_LS_KEY, USER_PROFILE_LS_KEY, GEMINI_API_KEY_LS_KEY, AI_COMPANION_NAME } from './config.js';
import { calculateXpForNextLevel } from './gamification.js';
import { setAiCompanionName } from './ui.js';

export function saveData() {
    // userProfile already contains geminiApiKey via setGeminiApiKey
    localStorage.setItem(HABITS_LS_KEY, JSON.stringify(habits));
    localStorage.setItem(USER_PROFILE_LS_KEY, JSON.stringify(userProfile));
    if (userProfile.geminiApiKey) {
        localStorage.setItem(GEMINI_API_KEY_LS_KEY, userProfile.geminiApiKey);
    } else {
        localStorage.removeItem(GEMINI_API_KEY_LS_KEY);
    }
}

export function loadData() {
    const storedHabits = localStorage.getItem(HABITS_LS_KEY);
    if (storedHabits) {
        setHabits(JSON.parse(storedHabits).map(h => ({ ...h })));
    }

    const storedUserProfile = localStorage.getItem(USER_PROFILE_LS_KEY);
    let tempProfile = { ...userProfile }; // Start with defaults
    if (storedUserProfile) {
        const loadedProfile = JSON.parse(storedUserProfile);
        tempProfile = { ...tempProfile, ...loadedProfile };
    }

    const storedApiKey = localStorage.getItem(GEMINI_API_KEY_LS_KEY) || tempProfile.geminiApiKey;
    setGeminiApiKey(storedApiKey); // This updates the geminiApiKey in state and userProfile in state

    tempProfile.geminiApiKey = storedApiKey;
    tempProfile.xpForNextLevel = calculateXpForNextLevel(tempProfile.level);
    setUserProfile(tempProfile);

    setAiCompanionName(AI_COMPANION_NAME);
}