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

export function setHabits(newHabits) {
    habits = newHabits;
}

export function setUserProfile(newProfile) {
    userProfile = { ...userProfile, ...newProfile };
    userProfile.xpForNextLevel = calculateXpForNextLevel(userProfile.level);
}

export function setGeminiApiKey(key) {
    geminiApiKey = key;
    userProfile.geminiApiKey = key;
}

export function setIsAiThinking(thinking) {
    isAiThinking = thinking;
}