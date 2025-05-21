// js/ui.js
import { habits, userProfile } from './state.js';
import { AVATAR_IMAGES, DEFAULT_AVATAR_PATH } from './config.js'; // Removed LEVEL_TITLES as getUserTitle is sufficient
import { 
    toggleHabitCompletion, 
    deleteHabit, 
    startEditHabit, // New
    saveHabitEdit,  // New
    cancelHabitEdit,// New
    moveHabitUp,    // New
    moveHabitDown   // New
} from './habits.js';
import { getUserTitle } from './gamification.js';

export const domElements = {}; // Populated by initUiElements

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

export function renderHabits() {
    if (!domElements.habitsList) return;
    domElements.habitsList.innerHTML = "";
    if (habits.length === 0) {
        domElements.habitsList.innerHTML = "<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>";
        return;
    }

    habits.forEach((habit, index) => {
        const li = document.createElement('li');
        li.classList.add('habit-item');
        li.dataset.habitId = habit.id;
        if (habit.completedToday) li.classList.add('completed-today');

        // Streak classes
        if (habit.streak >= 40 && AVATAR_IMAGES.level_40) li.classList.add('streak-40'); 
        else if (habit.streak >= 30) li.classList.add('streak-30');
        else if (habit.streak >= 20) li.classList.add('streak-20');
        else if (habit.streak >= 10) li.classList.add('streak-10');
        else if (habit.streak >= 5) li.classList.add('streak-5');
        else if (habit.streak >= 1) li.classList.add('streak-1');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = habit.completedToday;
        checkbox.addEventListener('change', () => toggleHabitCompletion(habit.id));
        li.appendChild(checkbox);

        const habitInfoDiv = document.createElement('div');
        habitInfoDiv.classList.add('habit-info');

        if (habit.isEditing) {
            const input = document.createElement('input');
            input.type = 'text';
            input.value = habit.name;
            input.classList.add('edit-input');
            input.dataset.habitId = habit.id; // For easy access
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    saveHabitEdit(habit.id, input.value);
                }
            });
            // Automatically focus the input when editing starts
            // Need to defer focus slightly for the element to be in the DOM
            setTimeout(() => input.focus(), 0); 
            habitInfoDiv.appendChild(input);

            const saveBtn = document.createElement('button');
            saveBtn.textContent = 'Save';
            saveBtn.classList.add('save-edit-btn'); // For specific styling if needed
            saveBtn.addEventListener('click', () => saveHabitEdit(habit.id, input.value));
            habitInfoDiv.appendChild(saveBtn);

            const cancelBtn = document.createElement('button');
            cancelBtn.textContent = 'Cancel';
            cancelBtn.classList.add('cancel-edit-btn');
            cancelBtn.addEventListener('click', () => cancelHabitEdit(habit.id));
            habitInfoDiv.appendChild(cancelBtn);

        } else {
            const nameSpan = document.createElement('span');
            nameSpan.classList.add('habit-name');
            nameSpan.textContent = habit.name;
            nameSpan.addEventListener('dblclick', () => startEditHabit(habit.id)); // Edit on double click
            habitInfoDiv.appendChild(nameSpan);

            const streakSpan = document.createElement('span');
            streakSpan.classList.add('habit-streak-display');
            streakSpan.textContent = `Streak: ${habit.streak} day${habit.streak === 1 ? '' : 's'}${habit.streak > 0 ? ' 🔥' : ''}`;
            habitInfoDiv.appendChild(streakSpan);
        }
        li.appendChild(habitInfoDiv);
        
        // Controls container (Edit, Delete, Reorder)
        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('habit-controls');

        if (!habit.isEditing) { // Only show these if not currently editing
            const editBtn = document.createElement('button');
            editBtn.textContent = 'Edit';
            editBtn.title = "Edit habit name";
            editBtn.addEventListener('click', () => startEditHabit(habit.id));
            controlsDiv.appendChild(editBtn);
        }

        const deleteBtn = document.createElement('button');
        deleteBtn.classList.add('delete-btn'); // Existing class for styling
        deleteBtn.textContent = 'Del';
        deleteBtn.title = "Delete habit";
        deleteBtn.addEventListener('click', () => deleteHabit(habit.id));
        controlsDiv.appendChild(deleteBtn);

        // Reorder buttons
        const upBtn = document.createElement('button');
        upBtn.innerHTML = '▲'; // Up arrow
        upBtn.title = "Move up";
        upBtn.disabled = index === 0; // Disable if first item
        upBtn.addEventListener('click', () => moveHabitUp(habit.id));
        controlsDiv.appendChild(upBtn);

        const downBtn = document.createElement('button');
        downBtn.innerHTML = '▼'; // Down arrow
        downBtn.title = "Move down";
        downBtn.disabled = index === habits.length - 1; // Disable if last item
        downBtn.addEventListener('click', () => moveHabitDown(habit.id));
        controlsDiv.appendChild(downBtn);

        li.appendChild(controlsDiv);
        domElements.habitsList.appendChild(li);
    });
}

export function updateGamificationDisplay() {
    if (!domElements.currentLevelEl) return; 
    domElements.currentLevelEl.textContent = userProfile.level;
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
    if (!domElements.toastNotificationEl) return; 
    domElements.toastNotificationEl.textContent = message;
    domElements.toastNotificationEl.className = 'toast show';
    domElements.toastNotificationEl.style.backgroundColor = type === "error" ? "#e74c3c" : (type === "info" ? "#3498db" : "#2ecc71");
    
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        if(domElements.toastNotificationEl) domElements.toastNotificationEl.className = domElements.toastNotificationEl.className.replace("show", "");
    }, duration);
}

export function updateAiAvatarImage(level) {
    if (!domElements.aiAvatarEl) return; 
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
        if(domElements.aiAvatarEl) domElements.aiAvatarEl.src = DEFAULT_AVATAR_PATH;
    };
}

export function promptForApiKeyModal(force = false, currentKey = '') {
    if (!domElements.apiKeyModalEl) return; 
     if (!userProfile.geminiApiKey || force) { 
        domElements.apiKeyModalEl.style.display = 'flex';
        if(domElements.apiKeyInputEl) domElements.apiKeyInputEl.value = currentKey || '';
        if(domElements.apiKeyInputEl) domElements.apiKeyInputEl.focus();
    }
}

export function closeApiKeyModal() {
    if (!domElements.apiKeyModalEl) return; 
    domElements.apiKeyModalEl.style.display = 'none';
}

export function getNewHabitInput() {
    if (!domElements.newHabitInput) return ''; 
    return domElements.newHabitInput.value.trim();
}

export function clearNewHabitInput() {
    if (!domElements.newHabitInput) return; 
    domElements.newHabitInput.value = "";
}

export function getApiKeyInput() {
    if (!domElements.apiKeyInputEl) return ''; 
    return domElements.apiKeyInputEl.value.trim();
}

export function setAiCompanionName(name) {
    if (!domElements.aiNameEl) return; 
    domElements.aiNameEl.textContent = name;
}

/* ---------------- ui.js – pagination helpers (add near the top, after imports) ---------------- */
let aiPages = [];
let aiPageIdx = 0;

function splitSentences(text) {
  return text.trim().split(/(?<=[.!?])\s+/);      // safe sentence splitter
}

function renderAiPage() {
  const bubble = domElements.aiSpeechBubbleEl;
  if (!bubble) return;

  const nav =
    aiPages.length > 1
      ? `<div class="ai-nav">
           <button id="aiPrev" ${aiPageIdx === 0 ? 'disabled' : ''}>Prev</button>
           <span class="ai-count">${aiPageIdx + 1}/${aiPages.length}</span>
           <button id="aiNext" ${aiPageIdx === aiPages.length - 1 ? 'disabled' : ''}>Next</button>
         </div>`
      : '';

  bubble.innerHTML = `<span>${aiPages[aiPageIdx]}</span>${nav}`;

  // wire navigation
  const prev = document.getElementById('aiPrev');
  const next = document.getElementById('aiNext');
  if (prev) prev.onclick = () => { aiPageIdx--; renderAiPage(); };
  if (next) next.onclick = () => { aiPageIdx++; renderAiPage(); };
}

/* ---------------- replace existing displayAiMessage with this version ---------------- */
export function displayAiMessage(message, isError = false, isLoading = false) {
  const bubble = domElements.aiSpeechBubbleEl;
  if (!bubble) return;

  bubble.classList.remove('thinking', 'error');

  if (isLoading) {
    bubble.classList.add('thinking');
    bubble.textContent = message;
    return;
  }

  if (isError) {
    bubble.classList.add('error');
    bubble.textContent = message;
    return;
  }

  aiPages = splitSentences(message);
  if (aiPages.length === 0) aiPages = [message];
  aiPageIdx = 0;
  renderAiPage();
}
