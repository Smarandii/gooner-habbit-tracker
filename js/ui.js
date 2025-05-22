// js/ui.js
import { habits, userProfile } from './state.js';
import { AVATAR_IMAGES, DEFAULT_AVATAR_PATH } from './config.js';
// habit imports removed
import { getUserTitle } from './gamification.js';
import { getValueForLevel } from './utils.js'; // Import the new utility function

export const domElements = {}; // Populated by initUiElements

/**
 * Initializes the `domElements` object by querying and storing references to key DOM elements.
 * This function should be called once the DOM is fully loaded to ensure elements are available.
 * @returns {void}
 */
export function initUiElements() {
    // ... (keep existing element selections)
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
}

const defaultHabitActionHandlers = {
    onToggleCompletion: (habitId) => console.warn('onToggleCompletion handler not provided to renderHabits', habitId),
    onStartEdit: (habitId) => console.warn('onStartEdit handler not provided to renderHabits', habitId),
    onSaveEdit: (habitId, newName) => console.warn('onSaveEdit handler not provided to renderHabits', { habitId, newName }),
    onCancelEdit: (habitId) => console.warn('onCancelEdit handler not provided to renderHabits', habitId),
    onDelete: (habitId) => console.warn('onDelete handler not provided to renderHabits', habitId),
    onMoveUp: (habitId) => console.warn('onMoveUp handler not provided to renderHabits', habitId),
    onMoveDown: (habitId) => console.warn('onMoveDown handler not provided to renderHabits', habitId),
};

export function renderHabits(habitActionHandlers) {
    const handlers = { ...defaultHabitActionHandlers, ...habitActionHandlers };
    if (!domElements.habitsList) return;
    domElements.habitsList.innerHTML = "";
    if (habits.length === 0) {
        domElements.habitsList.innerHTML = `<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>`;
        return;
    }

// --- Internal Helper Functions for renderHabits ---

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
    const { id, completedToday } = habit;
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
    const { id, name, streak } = habit;
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
 * Creates an edit form for a habit (input field and save/cancel buttons).
 * @param {Object} habit - The habit object being edited.
 * @param {string} habit.id - The ID of the habit.
 * @param {string} habit.name - The current name of the habit.
 * @param {Object} handlers - An object containing event handler functions.
 * @param {function} handlers.onSaveEdit - Handler for saving the edited habit name.
 * @param {function} handlers.onCancelEdit - Handler for canceling the edit.
 * @returns {HTMLDivElement} The created habit edit form element.
 * @private
 */
function _createHabitEditForm(habit, handlers) {
    const { id, name } = habit;
    const habitInfoDiv = document.createElement('div'); // Re-using habit-info class for consistency if styled similarly
    habitInfoDiv.classList.add('habit-info'); // Or a new class like 'habit-edit-form'

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

    return habitInfoDiv;
}

/**
 * Creates control buttons for a habit (edit, delete, move up/down).
 * @param {Object} habit - The habit object.
 * @param {string} habit.id - The ID of the habit.
 * @param {boolean} habit.isEditing - Whether the habit is currently being edited.
 * @param {number} index - The current index of the habit in the list.
 * @param {number} totalHabits - The total number of habits in the list.
 * @param {Object} handlers - An object containing event handler functions.
 * @param {function} handlers.onStartEdit - Handler for the edit button.
 * @param {function} handlers.onDelete - Handler for the delete button.
 * @param {function} handlers.onMoveUp - Handler for the move up button.
 * @param {function} handlers.onMoveDown - Handler for the move down button.
 * @returns {HTMLDivElement} The created controls element.
 * @private
 */
function _createHabitControls(habit, index, totalHabits, handlers) {
    const { id, isEditing } = habit;
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
    downBtn.disabled = index === totalHabits - 1;
    downBtn.addEventListener('click', () => handlers.onMoveDown(id));
    controlsDiv.appendChild(downBtn);

    return controlsDiv;
}

// --- Modified renderHabits ---
/**
 * Renders the list of habits in the UI.
 * Clears the existing list and rebuilds it based on the current habits state.
 * Uses helper functions to create individual parts of each habit item.
 * @param {Object} habitActionHandlers - An object containing handler functions for habit actions (toggle, edit, delete, etc.).
 * @returns {void}
 */
export function renderHabits(habitActionHandlers) {
    const handlers = { ...defaultHabitActionHandlers, ...habitActionHandlers };
    if (!domElements.habitsList) return;
    domElements.habitsList.innerHTML = ""; // Clear existing habits

    if (habits.length === 0) {
        domElements.habitsList.innerHTML = `<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>`;
        return;
    }

    habits.forEach((habit, index) => {
        const { id, completedToday, streak, isEditing } = habit;
        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.dataset.habitId = id;
        if (completedToday) li.classList.add('completed-today');

        // Streak classes
        if (streak >= 40 && AVATAR_IMAGES.level_40) li.classList.add('streak-40');
        else if (streak >= 30) li.classList.add('streak-30');
        else if (streak >= 20) li.classList.add('streak-20');
        else if (streak >= 10) li.classList.add('streak-10');
        else if (streak >= 5) li.classList.add('streak-5');
        else if (streak >= 1) li.classList.add('streak-1');

        li.appendChild(_createHabitCheckbox(habit, handlers));

        if (isEditing) {
            li.appendChild(_createHabitEditForm(habit, handlers));
        } else {
            li.appendChild(_createHabitInfoDisplay(habit, handlers));
        }

        li.appendChild(_createHabitControls(habit, index, habits.length, handlers));
        domElements.habitsList.appendChild(li);
    });
};

/**
 * Updates the gamification display elements in the UI, including level, XP bar,
 * user title, and login streak.
 * @returns {void}
 */
export const updateGamificationDisplay = () => {
    if (!domElements.currentLevelEl) return;
    const { level, currentLevelXP, xpForNextLevel, loginStreak } = userProfile; // Destructuring

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
    const { toastNotificationEl } = domElements; // Destructuring

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

    // Use AVATAR_IMAGES.level_0 as the default if nothing else matches or if level is very low.
    // The getValueForLevel function itself handles the case where level_0 might be the match.
    const defaultAvatarConfig = AVATAR_IMAGES.level_0 || { file: DEFAULT_AVATAR_PATH.split('/').pop() }; // Fallback if level_0 is missing

    const avatarConfig = getValueForLevel(level, AVATAR_IMAGES, defaultAvatarConfig, 'level_');
    
    let selectedAvatarFile;
    if (avatarConfig && avatarConfig.file) {
        selectedAvatarFile = `/characters/Seraphina/${avatarConfig.file}`;
    } else {
        // This case should ideally not be hit if defaultAvatarConfig is well-defined
        selectedAvatarFile = DEFAULT_AVATAR_PATH;
        // console.warn removed as per previous objectives, error handled by fallback.
    }
    
    aiAvatarEl.src = selectedAvatarFile;
    aiAvatarEl.onerror = () => {
        console.warn(`Failed to load avatar: ${selectedAvatarFile}. Falling back to default.`);
        if (aiAvatarEl) aiAvatarEl.src = DEFAULT_AVATAR_PATH; // Ensure fallback works
    };
};

export const promptForApiKeyModal = (force = false, currentKey = '') => {
    if (!domElements.apiKeyModalEl) return;
    const { apiKeyModalEl, apiKeyInputEl } = domElements; // Destructuring
    const { geminiApiKey: currentProfileApiKey } = userProfile; // Destructuring with alias

     if (!currentProfileApiKey || force) {
        apiKeyModalEl.style.display = 'flex';
        if (apiKeyInputEl) apiKeyInputEl.value = currentKey || '';
        if (apiKeyInputEl) apiKeyInputEl.focus();
    }
};

export const closeApiKeyModal = () => {
    if (domElements.apiKeyModalEl) domElements.apiKeyModalEl.style.display = 'none';
};

/**
 * Gets the trimmed value from the new habit input field.
 * @returns {string} The trimmed value of the new habit input, or an empty string if the element doesn't exist.
 */
export const getNewHabitInput = () => {
    return domElements.newHabitInput ? domElements.newHabitInput.value.trim() : '';
};

/**
 * Clears the new habit input field.
 * @returns {void}
 */
export const clearNewHabitInput = () => {
    if (domElements.newHabitInput) domElements.newHabitInput.value = "";
};

/**
 * Gets the trimmed value from the API key input field.
 * @returns {string} The trimmed value of the API key input, or an empty string if the element doesn't exist.
 */
export const getApiKeyInput = () => {
    return domElements.apiKeyInputEl ? domElements.apiKeyInputEl.value.trim() : '';
};

/**
 * Sets the display name of the AI companion in the UI.
 * @param {string} name - The name to display for the AI companion.
 * @returns {void}
 */
export const setAiCompanionName = (name) => {
    if (domElements.aiNameEl) domElements.aiNameEl.textContent = name;
};

/* ---------------- ui.js – pagination helpers (add near the top, after imports) ---------------- */
let aiPages = [];
let aiPageIdx = 0;

/**
 * Splits a given text into an array of sentences.
 * Uses a regular expression to split based on common sentence-ending punctuation.
 * @param {string} text - The text to be split.
 * @returns {Array<string>} An array of sentences.
 * @private
 */
const splitSentences = (text) => { // Arrow function
  return text.trim().split(/(?<=[.!?])\s+/);      // safe sentence splitter
};

/**
 * Renders the current page of the AI's message in the speech bubble,
 * including navigation buttons if multiple pages exist.
 * @private
 * @returns {void}
 */
const renderAiPage = () => { // Arrow function
  const { aiSpeechBubbleEl } = domElements; // Destructuring
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

  // wire navigation
  const prev = document.getElementById('aiPrev');
  const next = document.getElementById('aiNext');
  if (prev) prev.onclick = () => { aiPageIdx--; renderAiPage(); };
  if (next) next.onclick = () => { aiPageIdx++; renderAiPage(); };
};

/* ---------------- replace existing displayAiMessage with this version ---------------- */
export const displayAiMessage = (message, isError = false, isLoading = false) => { // Arrow function
  const { aiSpeechBubbleEl } = domElements; // Destructuring
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
  if (aiPages.length === 0) aiPages = [message]; // Keep if message is not empty but has no sentence enders
  aiPageIdx = 0;
  renderAiPage();
};
