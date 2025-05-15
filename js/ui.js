import { habits, userProfile } from './state.js';
import { AVATAR_IMAGES, DEFAULT_AVATAR_PATH, LEVEL_TITLES } from './config.js';
import { toggleHabitCompletion, deleteHabit } from './habits.js';
import { getUserTitle } from './gamification.js';

// Declare elements object, but don't populate it immediately
export const domElements = {};

// Function to initialize (populate) the domElements
export function initUiElements() {
    domElements.habitsList = document.getElementById('habitsList');
    domElements.currentLevelEl = document.getElementById('currentLevel');
    domElements.levelTitleEl = document.getElementById('levelTitle');
    domElements.currentXPEl = document.getElementById('currentXP');
    domElements.xpToNextLevelEl = document.getElementById('xpToNextLevel');
    domElements.xpBarEl = document.getElementById('xpBar');
    domElements.loginStreakEl = document.getElementById('loginStreak');
    domElements.toastNotificationEl = document.getElementById('toastNotification');
    domElements.aiAvatarEl = document.getElementById('aiAvatar');
    domElements.aiNameEl = document.getElementById('aiName');
    domElements.aiSpeechBubbleEl = document.getElementById('aiSpeechBubble');
    domElements.apiKeyModalEl = document.getElementById('apiKeyModal');
    domElements.apiKeyInputEl = document.getElementById('apiKeyInput');
    domElements.newHabitInput = document.getElementById('newHabitInput');
    domElements.saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    domElements.addHabitBtn = document.getElementById('addHabitBtn');
    domElements.changeApiKeyBtn = document.getElementById('changeApiKeyBtn');

    // Verify elements (optional debug step)
    // for (const key in domElements) {
    //     if (!domElements[key]) {
    //         console.error(`UI Element not found: ${key}`);
    //     }
    // }
}


export function renderHabits() {
    if (!domElements.habitsList) return; // Guard clause
    domElements.habitsList.innerHTML = "";
    // ... (rest of renderHabits remains the same, using domElements.habitsList etc.)
    if (habits.length === 0) {
        domElements.habitsList.innerHTML = "<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>";
        return;
    }
    habits.forEach(habit => {
        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.dataset.habitId = habit.id;

        if (habit.completedToday) li.classList.add('completed-today');

        if (habit.streak >= 40 && AVATAR_IMAGES.level_40) li.classList.add('streak-40'); 
        else if (habit.streak >= 30) li.classList.add('streak-30');
        else if (habit.streak >= 20) li.classList.add('streak-20');
        else if (habit.streak >= 10) li.classList.add('streak-10');
        else if (habit.streak >= 5) li.classList.add('streak-5');
        else if (habit.streak >= 1) li.classList.add('streak-1');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = habit.completedToday;
        checkbox.addEventListener('change', () => toggleHabitCompletion(habit.id)); // toggleHabitCompletion needs to be imported into ui.js if used like this, or passed as callback

        const habitInfoDiv = document.createElement('div');
        habitInfoDiv.classList.add('habit-info');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('habit-name');
        nameSpan.textContent = habit.name;
        habitInfoDiv.appendChild(nameSpan);

        const streakSpan = document.createElement('span');
        streakSpan.classList.add('habit-streak-display');
        streakSpan.textContent = `Streak: ${habit.streak} day${habit.streak === 1 ? '' : 's'}${habit.streak > 0 ? ' 🔥' : ''}`;
        habitInfoDiv.appendChild(streakSpan);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => deleteHabit(habit.id)); // deleteHabit needs to be imported into ui.js if used like this, or passed as callback
        
        li.appendChild(checkbox);
        li.appendChild(habitInfoDiv);
        li.appendChild(deleteBtn);
        domElements.habitsList.appendChild(li);
    });
}

export function updateGamificationDisplay() {
    if (!domElements.currentLevelEl) return; // Guard clause
    domElements.currentLevelEl.textContent = userProfile.level;
    // ... (rest of updateGamificationDisplay remains the same)
    domElements.levelTitleEl.textContent = getUserTitle(userProfile.level);
    
    const xpForLevel = userProfile.xpForNextLevel > 0 ? userProfile.xpForNextLevel : 1;
    const xpProgressPercent = Math.min(100, Math.max(0, (userProfile.currentLevelXP / xpForLevel) * 100));

    domElements.currentXPEl.textContent = userProfile.currentLevelXP;
    domElements.xpToNextLevelEl.textContent = xpForLevel;
    domElements.xpBarEl.style.width = `${xpProgressPercent}%`;
    domElements.xpBarEl.textContent = `${Math.floor(xpProgressPercent)}%`;
    domElements.xpBarEl.classList.toggle('full', xpProgressPercent >= 100);
    domElements.loginStreakEl.textContent = userProfile.loginStreak;
}

let toastTimeout;
export function showToast(message, type = "success", duration = 3000) {
    if (!domElements.toastNotificationEl) return; // Guard
    // ... (rest of showToast remains the same)
    domElements.toastNotificationEl.textContent = message;
    domElements.toastNotificationEl.className = 'toast show';
    domElements.toastNotificationEl.style.backgroundColor = type === "error" ? "#e74c3c" : (type === "info" ? "#3498db" : "#2ecc71");
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        domElements.toastNotificationEl.className = domElements.toastNotificationEl.className.replace("show", "");
    }, duration);
}

export function displayAiMessage(message, isError = false, isLoading = false) {
    if (!domElements.aiSpeechBubbleEl) return; // Guard
    // ... (rest of displayAiMessage remains the same)
    domElements.aiSpeechBubbleEl.classList.remove('thinking', 'error');
    if (isLoading) domElements.aiSpeechBubbleEl.classList.add('thinking');
    if (isError) domElements.aiSpeechBubbleEl.classList.add('error');
    domElements.aiSpeechBubbleEl.innerHTML = message;
}

export function updateAiAvatarImage(level) {
    if (!domElements.aiAvatarEl) return; // Guard
    // ... (rest of updateAiAvatarImage remains the same)
    let selectedAvatarFile = DEFAULT_AVATAR_PATH;
    const sortedLevels = Object.keys(AVATAR_IMAGES)
                             .map(key => parseInt(key.split('_')[1]))
                             .sort((a, b) => b - a); 

    for (const lvlKey of sortedLevels) {
        if (level >= lvlKey) {
            selectedAvatarFile = `/characters/Seraphina/${AVATAR_IMAGES['level_' + lvlKey].file}`;
            break;
        }
    }
    if (level < sortedLevels[sortedLevels.length -1] && AVATAR_IMAGES.level_0) {
         selectedAvatarFile = `/characters/Seraphina/${AVATAR_IMAGES.level_0.file}`;
    }

    domElements.aiAvatarEl.src = selectedAvatarFile;
    domElements.aiAvatarEl.onerror = () => {
        console.warn(`Failed to load avatar: ${selectedAvatarFile}. Falling back to default.`);
        domElements.aiAvatarEl.src = DEFAULT_AVATAR_PATH;
    };
}

export function promptForApiKeyModal(force = false, currentKey = '') {
    if (!domElements.apiKeyModalEl) return; // Guard
    // ... (rest of promptForApiKeyModal remains the same)
     if (!userProfile.geminiApiKey || force) { 
        domElements.apiKeyModalEl.style.display = 'flex';
        domElements.apiKeyInputEl.value = currentKey || '';
        domElements.apiKeyInputEl.focus();
    }
}

export function closeApiKeyModal() {
    if (!domElements.apiKeyModalEl) return; // Guard
    domElements.apiKeyModalEl.style.display = 'none';
}

export function getNewHabitInput() {
    if (!domElements.newHabitInput) return ''; // Guard
    return domElements.newHabitInput.value.trim();
}

export function clearNewHabitInput() {
    if (!domElements.newHabitInput) return; // Guard
    domElements.newHabitInput.value = "";
}

export function getApiKeyInput() {
    if (!domElements.apiKeyInputEl) return ''; // Guard
    return domElements.apiKeyInputEl.value.trim();
}

export function setAiCompanionName(name) {
    if (!domElements.aiNameEl) return; // Guard
    domElements.aiNameEl.textContent = name;
}

// domElements is already exported, no need to export it again here.