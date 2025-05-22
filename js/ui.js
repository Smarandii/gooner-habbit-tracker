// js/ui.js
import { habits, userProfile } from './state.js';
import { AVATAR_IMAGES, DEFAULT_AVATAR_PATH } from './config.js';
// Removed direct habit imports
import { getUserTitle } from './gamification.js';
import { getValueForLevel } from './utils.js';


export const domElements = {}; // Populated by initUiElements

const defaultHabitActionHandlers = {
    onToggleCompletion: (habitId) => console.warn('onToggleCompletion handler not provided', habitId),
    onStartEdit: (habitId) => console.warn('onStartEdit handler not provided', habitId),
    onSaveEdit: (habitId, newName) => console.warn('onSaveEdit handler not provided', { habitId, newName }),
    onCancelEdit: (habitId) => console.warn('onCancelEdit handler not provided', habitId),
    onDelete: (habitId) => console.warn('onDelete handler not provided', habitId),
    onMoveUp: (habitId) => console.warn('onMoveUp handler not provided', habitId),
    onMoveDown: (habitId) => console.warn('onMoveDown handler not provided', habitId),
};

/**
 * Creates a checkbox input element for a habit.
 * @param {Object} habit - The habit object.
 * @param {string} habit.id - The ID of the habit.
 * @param {boolean} habit.completedToday - Whether the habit is completed today.
 * @param {Object} handlers - An object containing event handler functions.
 * @param {function} handlers.onToggleCompletion - Handler for when the checkbox state changes.
 * @returns {HTMLInputElement} The created checkbox element.
 * @private
 */
function _createHabitCheckbox(habit, handlers) {
    const { id, completedToday } = habit; // Destructuring from habit
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = completedToday;
    checkbox.addEventListener('change', () => handlers.onToggleCompletion(id));
    return checkbox;
}

/**
 * Creates a display element for habit information (name and streak).
 * @param {Object} habit - The habit object.
 * @param {string} habit.id - The ID of the habit.
 * @param {string} habit.name - The name of the habit.
 * @param {number} habit.streak - The current streak of the habit.
 * @param {Object} handlers - An object containing event handler functions.
 * @param {function} handlers.onStartEdit - Handler for when the habit name is double-clicked.
 * @returns {HTMLDivElement} The created habit info display element.
 * @private
 */
function _createHabitInfoDisplay(habit, handlers) {
    const { id, name, streak } = habit; // Destructuring from habit
    const habitInfoDiv = document.createElement('div');
    habitInfoDiv.classList.add('habit-info');

    const nameSpan = document.createElement('span');
    nameSpan.classList.add('habit-name');
    nameSpan.textContent = name;
    nameSpan.addEventListener('dblclick', () => handlers.onStartEdit(id));
    habitInfoDiv.appendChild(nameSpan);

    const streakSpan = document.createElement('span');
    streakSpan.classList.add('habit-streak-display');
    streakSpan.textContent = `Streak: ${streak} day${streak === 1 ? '' : 's'}${streak > 0 ? ' 🔥' : ''}`;
    habitInfoDiv.appendChild(streakSpan);

    return habitInfoDiv;
}

/**
 * Initializes the `domElements` object by querying and storing references to key DOM elements.
 * This function should be called once the DOM is fully loaded to ensure elements are available.
 * @returns {void}
 */
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
    domElements.newHabitInput = document.getElementById('newHabitInput'); // Assuming this was present
    domElements.saveApiKeyBtn = document.getElementById('saveApiKeyBtn'); // Assuming
    domElements.addHabitBtn = document.getElementById('addHabitBtn');     // Assuming
    domElements.changeApiKeyBtn = document.getElementById('changeApiKeyBtn'); // Assuming
}

/**
 * Renders the list of habits in the UI.
 * Clears the existing list and rebuilds it based on the current habits state.
 * @param {Object} habitActionHandlers - An object containing handler functions for habit actions.
 * @returns {void}
 */
export function renderHabits(habitActionHandlers) {
    const handlers = { ...defaultHabitActionHandlers, ...habitActionHandlers };
    if (!domElements.habitsList) return;
    domElements.habitsList.innerHTML = ""; 

    if (habits.length === 0) {
        domElements.habitsList.innerHTML = `<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>`;
        return;
    }

    habits.forEach((habit, index) => {
        const { id, name, completedToday, streak, isEditing } = habit;
        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.dataset.habitId = id;
        if (completedToday) li.classList.add('completed-today');

        // Streak classes (assuming this logic was present or desired in the target commit)
        if (streak >= 40 && AVATAR_IMAGES.level_40) li.classList.add('streak-40');
        else if (streak >= 30) li.classList.add('streak-30');
        else if (streak >= 20) li.classList.add('streak-20');
        else if (streak >= 10) li.classList.add('streak-10');
        else if (streak >= 5) li.classList.add('streak-5');
        else if (streak >= 1) li.classList.add('streak-1');

        li.appendChild(_createHabitCheckbox(habit, handlers));

        if (isEditing) {
            const habitInfoDiv = document.createElement('div'); // Keep habitInfoDiv for editing form structure
            habitInfoDiv.classList.add('habit-info');
            const input = document.createElement('input');
            input.type = 'text';
            input.value = name;
            input.classList.add('edit-input');
            input.dataset.habitId = id;
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    handlers.onSaveEdit(id, input.value);
                }
            });
            setTimeout(() => input.focus(), 0);
            habitInfoDiv.appendChild(input);

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.classList.add('save-edit-btn');
            saveBtn.addEventListener('click', () => handlers.onSaveEdit(id, input.value));
            habitInfoDiv.appendChild(saveBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.classList.add('cancel-edit-btn');
            cancelBtn.addEventListener('click', () => handlers.onCancelEdit(id));
            habitInfoDiv.appendChild(cancelBtn);
            li.appendChild(habitInfoDiv); // Append the form
        } else {
            li.appendChild(_createHabitInfoDisplay(habit, handlers));
        }

        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('habit-controls');

        if (!isEditing) {
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.title = "Edit habit name";
            editBtn.addEventListener('click', () => handlers.onStartEdit(id));
            controlsDiv.appendChild(editBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn');
        deleteBtn.textContent = 'Del';
        deleteBtn.title = "Delete habit";
        deleteBtn.addEventListener('click', () => handlers.onDelete(id));
        controlsDiv.appendChild(deleteBtn);

        const upBtn = document.createElement('button');
        upBtn.innerHTML = '▲';
        upBtn.title = "Move up";
        upBtn.disabled = index === 0;
        upBtn.addEventListener('click', () => handlers.onMoveUp(id));
        controlsDiv.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '▼';
        downBtn.title = "Move down";
        downBtn.disabled = index === habits.length - 1;
        downBtn.addEventListener('click', () => handlers.onMoveDown(id));
        controlsDiv.appendChild(downBtn);

        li.appendChild(controlsDiv);
        domElements.habitsList.appendChild(li);
    });
}

/**
 * Updates the gamification display elements in the UI, including level, XP bar,
 * user title, and login streak.
 * @returns {void}
 */
export const updateGamificationDisplay = () => {
    if (!domElements.currentLevelEl) return;
    const { level, currentLevelXP, xpForNextLevel, loginStreak } = userProfile;

    domElements.currentLevelEl.textContent = level;
    domElements.levelTitleEl.textContent = getUserTitle(level);

    const effectiveXpForLevel = xpForNextLevel > 0 ? xpForNextLevel : 1;
    const xpProgressPercent = Math.min(100, Math.max(0, (currentLevelXP / effectiveXpForLevel) * 100));

    domElements.currentXPEl.textContent = currentLevelXP;
    domElements.xpToNextLevelEl.textContent = effectiveXpForLevel;
    domElements.xpBarEl.style.width = `${xpProgressPercent}%`;
    domElements.xpBarEl.textContent = `${Math.floor(xpProgressPercent)}%`;
    domElements.xpBarEl.classList.toggle('full', xpProgressPercent >= 100);
    domElements.loginStreakEl.textContent = loginStreak;
};

let toastTimeout;
export const showToast = (message, type = "success", duration = 3000) => {
    if (!domElements.toastNotificationEl) return;
    const { toastNotificationEl } = domElements;

    toastNotificationEl.textContent = message;
    toastNotificationEl.className = 'toast show';
    toastNotificationEl.style.backgroundColor = type === "error" ? "#e74c3c" : (type === "info" ? "#3498db" : "#2ecc71");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        if (toastNotificationEl) toastNotificationEl.className = toastNotificationEl.className.replace("show", "");
    }, duration);
};

export const updateAiAvatarImage = (level) => {
    if (!domElements.aiAvatarEl) return;
    const { aiAvatarEl } = domElements;

    const defaultAvatarConfig = AVATAR_IMAGES.level_0 || { file: DEFAULT_AVATAR_PATH.split('/').pop() };
    const avatarConfig = getValueForLevel(level, AVATAR_IMAGES, defaultAvatarConfig, 'level_');
    
    let selectedAvatarFile;
    if (avatarConfig && avatarConfig.file) {
        selectedAvatarFile = `/characters/Seraphina/${avatarConfig.file}`;
    } else {
        selectedAvatarFile = DEFAULT_AVATAR_PATH;
    }
    
    aiAvatarEl.src = selectedAvatarFile;
    aiAvatarEl.onerror = () => {
        console.warn(`Failed to load avatar: ${selectedAvatarFile}. Falling back to default.`);
        if (aiAvatarEl) aiAvatarEl.src = DEFAULT_AVATAR_PATH;
    };
};

export const promptForApiKeyModal = (force = false, currentKey = '') => {
    if (!domElements.apiKeyModalEl) return;
    const { apiKeyModalEl, apiKeyInputEl } = domElements;
    const { geminiApiKey: currentProfileApiKey } = userProfile;

     if (!currentProfileApiKey || force) {
        apiKeyModalEl.style.display = 'flex';
        if (apiKeyInputEl) apiKeyInputEl.value = currentKey || '';
        if (apiKeyInputEl) apiKeyInputEl.focus();
    }
};

export const closeApiKeyModal = () => {
    if (domElements.apiKeyModalEl) domElements.apiKeyModalEl.style.display = 'none';
};

export const getNewHabitInput = () => {
    return domElements.newHabitInput ? domElements.newHabitInput.value.trim() : '';
};

export const clearNewHabitInput = () => {
    if (domElements.newHabitInput) domElements.newHabitInput.value = "";
};

export const getApiKeyInput = () => {
    return domElements.apiKeyInputEl ? domElements.apiKeyInputEl.value.trim() : '';
};

export const setAiCompanionName = (name) => {
    if (domElements.aiNameEl) domElements.aiNameEl.textContent = name;
};

let aiPages = [];
let aiPageIdx = 0;

const splitSentences = (text) => {
  return text.trim().split(/(?<=[.!?])\s+/);
};

const renderAiPage = () => {
  const { aiSpeechBubbleEl } = domElements;
  if (!aiSpeechBubbleEl) return;

  const nav =
    aiPages.length > 1
      ? `<div class="ai-nav">
           <button id="aiPrev" ${aiPageIdx === 0 ? 'disabled' : ''}>Prev</button>
           <span class="ai-count">${aiPageIdx + 1}/${aiPages.length}</span>
           <button id="aiNext" ${aiPageIdx === aiPages.length - 1 ? 'disabled' : ''}>Next</button>
         </div>`
      : '';

  aiSpeechBubbleEl.innerHTML = `<span>${aiPages[aiPageIdx]}</span>${nav}`;

  const prev = document.getElementById('aiPrev');
  const next = document.getElementById('aiNext');
  if (prev) prev.onclick = () => { aiPageIdx--; renderAiPage(); };
  if (next) next.onclick = () => { aiPageIdx++; renderAiPage(); };
};

export const displayAiMessage = (message, isError = false, isLoading = false) => {
  const { aiSpeechBubbleEl } = domElements;
  if (!aiSpeechBubbleEl) return;

  aiSpeechBubbleEl.classList.remove('thinking', 'error');

  if (isLoading) {
    aiSpeechBubbleEl.classList.add('thinking');
    aiSpeechBubbleEl.textContent = message;
    return;
  }

  if (isError) {
    aiSpeechBubbleEl.classList.add('error');
    aiSpeechBubbleEl.textContent = message;
    return;
  }

  aiPages = splitSentences(message);
  if (aiPages.length === 0) aiPages = [message];
  aiPageIdx = 0;
  renderAiPage();
};
