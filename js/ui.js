import { habits, userProfile } from './state.js';
import { AVATAR_IMAGES, DEFAULT_AVATAR_PATH, LEVEL_TITLES } from './config.js';
import { toggleHabitCompletion, deleteHabit } from './habits.js';
import { getUserTitle } from './gamification.js';

const elements = {
    habitsList: document.getElementById('habitsList'),
    currentLevelEl: document.getElementById('currentLevel'),
    levelTitleEl: document.getElementById('levelTitle'),
    currentXPEl: document.getElementById('currentXP'),
    xpToNextLevelEl: document.getElementById('xpToNextLevel'),
    xpBarEl: document.getElementById('xpBar'),
    loginStreakEl: document.getElementById('loginStreak'),
    toastNotificationEl: document.getElementById('toastNotification'),
    aiAvatarEl: document.getElementById('aiAvatar'),
    aiNameEl: document.getElementById('aiName'),
    aiSpeechBubbleEl: document.getElementById('aiSpeechBubble'),
    apiKeyModalEl: document.getElementById('apiKeyModal'),
    apiKeyInputEl: document.getElementById('apiKeyInput'),
    newHabitInput: document.getElementById('newHabitInput') // Added for clearing
};

export function renderHabits() {
    elements.habitsList.innerHTML = "";
    if (habits.length === 0) {
        elements.habitsList.innerHTML = "<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>";
        return;
    }
    habits.forEach(habit => {
        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.dataset.habitId = habit.id;

        if (habit.completedToday) li.classList.add('completed-today');

        if (habit.streak >= 40 && AVATAR_IMAGES.level_40) li.classList.add('streak-40'); // Optional new class
        else if (habit.streak >= 30) li.classList.add('streak-30');
        else if (habit.streak >= 20) li.classList.add('streak-20');
        else if (habit.streak >= 10) li.classList.add('streak-10');
        else if (habit.streak >= 5) li.classList.add('streak-5');
        else if (habit.streak >= 1) li.classList.add('streak-1');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = habit.completedToday;
        checkbox.addEventListener('change', () => toggleHabitCompletion(habit.id));

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
        deleteBtn.addEventListener('click', () => deleteHabit(habit.id));

        li.appendChild(checkbox);
        li.appendChild(habitInfoDiv);
        li.appendChild(deleteBtn);
        elements.habitsList.appendChild(li);
    });
}

export function updateGamificationDisplay() {
    elements.currentLevelEl.textContent = userProfile.level;
    elements.levelTitleEl.textContent = getUserTitle(userProfile.level);

    const xpForLevel = userProfile.xpForNextLevel > 0 ? userProfile.xpForNextLevel : 1;
    const xpProgressPercent = Math.min(100, Math.max(0, (userProfile.currentLevelXP / xpForLevel) * 100));

    elements.currentXPEl.textContent = userProfile.currentLevelXP;
    elements.xpToNextLevelEl.textContent = xpForLevel;
    elements.xpBarEl.style.width = `${xpProgressPercent}%`;
    elements.xpBarEl.textContent = `${Math.floor(xpProgressPercent)}%`;
    elements.xpBarEl.classList.toggle('full', xpProgressPercent >= 100);
    elements.loginStreakEl.textContent = userProfile.loginStreak;
}

let toastTimeout;
export function showToast(message, type = "success", duration = 3000) {
    elements.toastNotificationEl.textContent = message;
    elements.toastNotificationEl.className = 'toast show';
    elements.toastNotificationEl.style.backgroundColor = type === "error" ? "#e74c3c" : (type === "info" ? "#3498db" : "#2ecc71");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        elements.toastNotificationEl.className = elements.toastNotificationEl.className.replace("show", "");
    }, duration);
}

export function displayAiMessage(message, isError = false, isLoading = false) {
    elements.aiSpeechBubbleEl.classList.remove('thinking', 'error');
    if (isLoading) elements.aiSpeechBubbleEl.classList.add('thinking');
    if (isError) elements.aiSpeechBubbleEl.classList.add('error');
    elements.aiSpeechBubbleEl.innerHTML = message;
}

export function updateAiAvatarImage(level) {
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

    elements.aiAvatarEl.src = selectedAvatarFile;
    elements.aiAvatarEl.onerror = () => {
        console.warn(`Failed to load avatar: ${selectedAvatarFile}. Falling back to default.`);
        elements.aiAvatarEl.src = DEFAULT_AVATAR_PATH;
    };
}

export function promptForApiKeyModal(force = false, currentKey = '') {
    if (!currentKey || force) { // Check currentKey instead of global geminiApiKey
        elements.apiKeyModalEl.style.display = 'flex';
        elements.apiKeyInputEl.value = currentKey || '';
        elements.apiKeyInputEl.focus();
    }
}

export function closeApiKeyModal() {
    elements.apiKeyModalEl.style.display = 'none';
}

export function getNewHabitInput() {
    return elements.newHabitInput.value.trim();
}

export function clearNewHabitInput() {
    elements.newHabitInput.value = "";
}

export function getApiKeyInput() {
    return elements.apiKeyInputEl.value.trim();
}

export function setAiCompanionName(name) {
    elements.aiNameEl.textContent = name;
}

export const domElements = elements;