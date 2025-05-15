import { userProfile, setUserProfile, geminiApiKey } from './state.js';
import { XP_FOR_LEVEL_1, XP_GROWTH_FACTOR, LEVEL_TITLES } from './config.js';
import { showToast, updateAiAvatarImage } from './ui.js';
import { generateAiResponse } from './api.js'; // Forward declaration
import { saveData } from './data.js'; // Forward declaration

export function calculateXpForNextLevel(currentLevel) {
    if (currentLevel === 0) return XP_FOR_LEVEL_1;
    return Math.floor(XP_FOR_LEVEL_1 * Math.pow(XP_GROWTH_FACTOR, currentLevel));
}

export function addXP(amount) {
    const newProfile = { ...userProfile };
    newProfile.xp += amount;
    newProfile.currentLevelXP += amount;

    if (newProfile.currentLevelXP < 0) newProfile.currentLevelXP = Math.max(0, newProfile.currentLevelXP);
    newProfile.xp = Math.max(0, newProfile.xp);

    setUserProfile(newProfile); // Update state
    checkLevelUp();
    // saveData is usually called by the function that triggers addXP (e.g., toggleHabitCompletion)
}

export function checkLevelUp() {
    let leveledUp = false;
    const currentProfile = { ...userProfile }; // Work with a copy for modifications

    while (currentProfile.currentLevelXP >= currentProfile.xpForNextLevel && currentProfile.xpForNextLevel > 0) {
        currentProfile.level++;
        currentProfile.currentLevelXP -= currentProfile.xpForNextLevel;
        currentProfile.xpForNextLevel = calculateXpForNextLevel(currentProfile.level);
        leveledUp = true;

        showToast(`LEVEL UP! You are now Level ${currentProfile.level}: ${getUserTitle(currentProfile.level)}! 🎉`, "success", 5000);
        updateAiAvatarImage(currentProfile.level);

        if (geminiApiKey) {
             generateAiResponse("level_up", `Your "Atomic Habit Hero" just reached Level ${currentProfile.level}, titled "${getUserTitle(currentProfile.level)}"! Their total XP is currentProfile.xp.`);
        }
    }
    if (leveledUp) {
        setUserProfile(currentProfile); // Update the main state if level up occurred
        saveData(); // Save after level up changes
    }
}

export function getUserTitle(level) {
    return LEVEL_TITLES.slice().reverse().find(lt => level >= lt.minLevel)?.title || LEVEL_TITLES[0].title;
}

export function calculateStreakBonus(streak) {
	if (!streak || streak <= 0) return 0; const s = Math.min(streak, 30);
	if (s >= 30) return 20; if (s >= 20) return 15; if (s >= 10) return 10;
	if (s >= 5) return 5; if (s >= 1) return 2; return 0;
}
