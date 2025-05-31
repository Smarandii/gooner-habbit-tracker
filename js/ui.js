import { habits, userProfile } from './state.js';
import { AVATAR_IMAGES, DEFAULT_AVATAR_PATH } from './config.js';
import { 
    toggleHabitCompletion, 
    deleteHabit, 
    startEditHabit,
    saveHabitEdit,
    cancelHabitEdit,
    updateHabitOrder,
    useCheatDay
} from './habits.js';
import { getUserTitle, getCheatDayCost } from './gamification.js';

let sortableInstance = null;
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
    domElements.cheatDaysEl = document.getElementById('cheatDays');
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
    const list = domElements.habitsList;
    list.innerHTML = "";

    /* ------- rebuild list ------- */
    if (habits.length === 0) {
        list.innerHTML = "<p style='text-align:center; color:#777;'>No habits yet. Add one!</p>";
    } else {
        habits.forEach((habit, idx) => {
            const li = document.createElement('li');
            li.classList.add('habit-item');
            li.dataset.habitId = habit.id;
            if (habit.completedToday) li.classList.add('completed-today');

            /* Checkbox */
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = habit.completedToday;
            cb.addEventListener('change', () => toggleHabitCompletion(habit.id));
            li.appendChild(cb);

            /* Habit info */
            const info = document.createElement('div');
            info.classList.add('habit-info');

            /* Controls */
            const controls = document.createElement('div');
            controls.classList.add('habit-controls');

            if (habit.isEditing) {
                const editInput = document.createElement('input');
				editInput.type  = 'text';
				editInput.value = habit.name;
				editInput.classList.add('edit-input');
				editInput.setAttribute('data-habit-id', habit.id);

				// save on <Enter>, cancel on <Esc>
				editInput.addEventListener('keydown', e => {
					if (e.key === 'Enter')   saveHabitEdit(habit.id, editInput.value);
					if (e.key === 'Escape')  cancelHabitEdit(habit.id);
				});
				info.appendChild(editInput);

				// --- action buttons -------------------------------
				const saveBtn = document.createElement('button');
				saveBtn.textContent = '💾';
				saveBtn.title = 'Save';
				saveBtn.addEventListener('click', () => saveHabitEdit(habit.id, editInput.value));

				const cancelBtn = document.createElement('button');
				cancelBtn.textContent = '✖️';
				cancelBtn.title = 'Cancel';
				cancelBtn.addEventListener('click', () => cancelHabitEdit(habit.id));

				// re-use the same .habit-controls container
				controls.appendChild(saveBtn);
				controls.appendChild(cancelBtn);
            } else {
                const name = document.createElement('span');
                name.classList.add('habit-name');
                name.textContent = habit.name;
                name.title = habit.name;                 // tooltip shows full text
                name.addEventListener('dblclick', () => startEditHabit(habit.id));
                info.appendChild(name);

                const streak = document.createElement('span');
                streak.classList.add('habit-streak-display');
                streak.textContent = `Streak: ${habit.streak} day${habit.streak === 1 ? '' : 's'}${habit.streak > 0 ? ' 🔥' : ''}`;
                info.appendChild(streak);
            }
            li.appendChild(info);

            if (!habit.isEditing) {
                const editBtn = document.createElement('button');
                editBtn.innerHTML = '✏️';
                editBtn.title = "Edit habit";
                editBtn.addEventListener('click', () => startEditHabit(habit.id));
                controls.appendChild(editBtn);
            }

            if (habit.pendingCheat) {
        		const cheatBtn = document.createElement('button');
        		cheatBtn.innerHTML = '💸';
        		cheatBtn.title = `Use cheat day (cost ${getCheatDayCost(userProfile.level)} XP)`;
        		cheatBtn.addEventListener('click', () => useCheatDay(habit.id)); controls.appendChild(cheatBtn);
      		}

            const delBtn = document.createElement('button');
            delBtn.innerHTML = '🗑️';
            delBtn.classList.add('delete-btn');
            delBtn.title = "Delete habit";
            delBtn.addEventListener('click', () => deleteHabit(habit.id));
            controls.appendChild(delBtn);

            li.appendChild(controls);
            list.appendChild(li);
        });
    }

    /* ------- SortableJS ------- */
    if (sortableInstance) sortableInstance.destroy();
    sortableInstance = new Sortable(list, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        onEnd: evt => updateHabitOrder(evt.oldIndex, evt.newIndex)
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
    domElements.cheatDaysEl.textContent  = userProfile.cheatDays || 0;
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

let aiPages = [];
let aiPageIdx = 0;

export function splitSentences(text, maxChars = 99) {
  const sentences = text
    .trim()
    .split(/(?<=[.!?])(?:\s+|\n+)/)
    .map(s => s.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    if (sentence.length > maxChars) {
      // flush current chunk before handling oversized sentence
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // split long sentence into words and build chunks manually
      const words = sentence.split(/\s+/);
      let chunk = '';

      for (const word of words) {
        const test = chunk ? `${chunk} ${word}` : word;
        if (test.length <= maxChars) {
          chunk = test;
        } else {
          if (chunk) chunks.push(chunk);
          chunk = word.length <= maxChars ? word : word.slice(0, maxChars); // Hard trim if word itself too long
        }
      }

      if (chunk) chunks.push(chunk);
      continue;
    }

    const testChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;
    if (testChunk.length <= maxChars) {
      currentChunk = testChunk;
    } else {
      if (currentChunk) chunks.push(currentChunk);
      currentChunk = sentence;
    }
  }

  if (currentChunk) chunks.push(currentChunk);
  return chunks;
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
