import { userProfile, setUserProfile, geminiApiKey } from './state.js';
import { XP_FOR_LEVEL_1, XP_GROWTH_FACTOR, LEVEL_TITLES, ATTITUDE_MAPPING } from './config.js';
import { showToast, updateAiAvatarImage } from './ui.js';
import { generateAiResponse } from './api.js';
import { saveData } from './data.js';
import { levelUpContext } from './ai_prompts.js';

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
}

export function checkLevelUp() {
    let leveledUp = false;
    const currentProfile = { ...userProfile };

    while (currentProfile.currentLevelXP >= currentProfile.xpForNextLevel && currentProfile.xpForNextLevel > 0) {
        currentProfile.level++;
        currentProfile.currentLevelXP -= currentProfile.xpForNextLevel;
        currentProfile.xpForNextLevel = calculateXpForNextLevel(currentProfile.level);
        leveledUp = true;

        showToast(`LEVEL UP! You are now Level ${currentProfile.level}: ${getUserTitle(currentProfile.level)}! 🎉`, "success", 5000);
        updateAiAvatarImage(currentProfile.level);

        if (geminiApiKey) {
			const promptContext = levelUpContext({ level: currentProfile.level });
			generateAiResponse("level_up", promptContext);
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

export function getCompanionAttitude(level) {
	let attitude = ATTITUDE_MAPPING.level_0;

    const sortedLevels = Object.keys(ATTITUDE_MAPPING)
                             .map(key => parseInt(key.split('_')[1]))
                             .sort((a, b) => b - a);

    for (const lvlKey of sortedLevels) {
        if (level >= lvlKey) {
            attitude = ATTITUDE_MAPPING['level_' + lvlKey];
            break;
        }
    }
     if (level < sortedLevels[sortedLevels.length -1] && ATTITUDE_MAPPING.level_0) {
        attitude = ATTITUDE_MAPPING.level_0;
    }

	console.log("Hello from getUserAttitude!")
	console.log(`${attitude}`)
    return attitude
}

export function calculateStreakBonus(streak) {
	if (!streak || streak <= 0) return 0; const s = Math.min(streak, 30);
	if (s >= 30) return 20; if (s >= 20) return 15; if (s >= 10) return 10;
	if (s >= 5) return 5; if (s >= 1) return 2; return 0;
}
