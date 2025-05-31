import { userProfile, setUserProfile, geminiApiKey } from './state.js';
import { XP_FOR_LEVEL_1, XP_GROWTH_FACTOR, LEVEL_TITLES, ATTITUDE_MAPPING, BASE_CHEAT_COST } from './config.js';
import { showToast, updateAiAvatarImage } from './ui.js';
import { generateAiResponse } from './api.js';
import { saveData } from './data.js';
import { levelUpContext } from './ai_prompts.js';

export function calculateXpForNextLevel(currentLevel) {
    if (currentLevel === 0) return XP_FOR_LEVEL_1;
    return Math.floor(XP_FOR_LEVEL_1 * Math.pow(XP_GROWTH_FACTOR, currentLevel));
}

export function getCheatDayCost(level) {
  return Math.ceil(BASE_CHEAT_COST * (1 + level / 5));
}

export function addXP(amount) {
  /*
   * Handles both XP gain and XP loss.
   * If XP goes negative within the current level, we borrow from previous levels
   * (level‑down) until the debt is paid or Level 0 is reached.
   */
  const prof = { ...userProfile };
  prof.xp            = Math.max(0, prof.xp + amount);  // keep global XP non‑negative
  prof.currentLevelXP += amount;

  // ----- LEVEL‑UP loop (unchanged) -----
  while (prof.currentLevelXP >= prof.xpForNextLevel && prof.xpForNextLevel > 0) {
    prof.currentLevelXP -= prof.xpForNextLevel;
    prof.level++;
    prof.xpForNextLevel  = calculateXpForNextLevel(prof.level);
    showToast(`LEVEL UP! You are now Level ${prof.level}: ${getUserTitle(prof.level)}! 🎉`, "success", 5000);
    updateAiAvatarImage(prof.level);
    if (geminiApiKey) {
      const promptContext = levelUpContext({ level: prof.level });
      generateAiResponse("level_up", promptContext);
    }
  }

  // ----- LEVEL‑DOWN loop (NEW) -----
  while (prof.currentLevelXP < 0 && prof.level > 0) {
    prof.level--;                                  // drop a level first
    const prevLevelXp = calculateXpForNextLevel(prof.level);
    prof.currentLevelXP += prevLevelXp;            // borrow from the previous level bucket
    prof.xpForNextLevel = prevLevelXp;
    showToast(`Ouch! You dropped to Level ${prof.level}: ${getUserTitle(prof.level)}.`, "error", 4000);
    updateAiAvatarImage(prof.level);
  }

  // clamp again just in case
  if (prof.currentLevelXP < 0)    prof.currentLevelXP = 0;
  if (prof.level === 0)          prof.xpForNextLevel = calculateXpForNextLevel(0);

  setUserProfile(prof);
  saveData();
  updateGamificationDisplay();
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
