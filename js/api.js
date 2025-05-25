import { geminiApiKey, isAiThinking, setIsAiThinking, userProfile, setGeminiApiKey } from './state.js';
import { AI_COMPANION_NAME, ATTITUDE_MAPPING } from './config.js';
import { displayAiMessage, promptForApiKeyModal, showToast } from './ui.js';
import { getUserTitle, getCompanionAttitude } from './gamification.js';
import { saveData } from './data.js';
import { rootPrompt } from './ai_prompts.js';

export async function checkAndPromptForApiKey() {
    return new Promise((resolve, reject) => {
        if (geminiApiKey && geminiApiKey !== "YOUR_GEMINI_API_KEY_PLACEHOLDER") {
            displayAiMessage("Reactivating systems...", false, true);
            setTimeout(() => displayAiMessage("Online and ready!", false), 1000);
            resolve();
        } else {
            promptForApiKeyModal(false, geminiApiKey);
            if (!geminiApiKey) reject("No API Key provided yet.");
            else resolve();
        }
    });
}

export function handleSaveApiKey(inputKey) {
    if (inputKey) {
        setGeminiApiKey(inputKey);
        saveData();
        // closeApiKeyModal(); // ui.js should handle this or main.js
        showToast(`API Key saved! ${AI_COMPANION_NAME} is now active.`, "success");
        displayAiMessage("Systems activated. It's... a pleasure to meet you, I suppose.", false);

        populateModelSelector();
        return true;
    } else {
        showToast("API Key cannot be empty.", "error");
        return false;
    }
}

export async function generateAiResponse(eventType, contextDetails) {
    if (!geminiApiKey || isAiThinking) {
        if (!geminiApiKey) displayAiMessage("I need a valid API Key to speak.", true);
        return;
    }
    const selectedModel = localStorage.getItem('selectedModel')
    setIsAiThinking(true);
    displayAiMessage("Thinking...", false, true);

    const fullPrompt = rootPrompt({ userProfile, eventType, contextDetails });
    console.log("Gemini Prompt:", fullPrompt);

    try {
        const response = await fetch("/ai-proxy", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ apiKey: geminiApiKey, prompt: fullPrompt, model: selectedModel })
		});

		console.log(response)

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            let errorMsg = `API Error: ${response.status}. `;
            if (errorData.error && errorData.error.message) errorMsg += errorData.error.message;

            if (response.status === 400 && errorMsg.includes("API key not valid")) {
                 errorMsg = "My connection is fuzzy... your API Key seems invalid. Please check it.";
                 setGeminiApiKey(null);
                 saveData();
                 promptForApiKeyModal(true, '');
            } else if (response.status === 429) {
                errorMsg = "I'm thinking too hard! API quota exceeded. Try again later.";
            }
            displayAiMessage(errorMsg, true);
            throw new Error(errorMsg);
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]) {
            let AImessage = data.candidates[0].content.parts[0].text.trim();
            AImessage = AImessage.replace(new RegExp(`^${AI_COMPANION_NAME}:?\\s*`, "i"), "").trim();
            displayAiMessage(AImessage);
        } else if (data.promptFeedback?.blockReason) {
             displayAiMessage(`I can't respond to that. (Reason: ${data.promptFeedback.blockReason})`, true);
        } else {
            displayAiMessage("I'm a bit speechless right now...", true);
        }
    } catch (error) {
        console.error("Error calling Gemini API:", error);
    } finally {
        setIsAiThinking(false);
    }
}


export async function populateModelSelector() {
    const selector = document.getElementById('modelSelector');
    if (!selector) return;

    if (!geminiApiKey) return;

    try {
        const res = await fetch('/list-models', {
            method : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body   : JSON.stringify({ apiKey: geminiApiKey })
        });

        if (!res.ok) {
            console.warn('[populateModelSelector] HTTP', res.status);
            return;
        }

		console.log(res);
        const data = await res.json();
        if (!Array.isArray(data.models)) return;

        const previouslySelected = localStorage.getItem('selectedModel');

        selector.innerHTML = '';

        data.models.forEach(m => {
            // API returns names like "models/gemini-1.5-pro-latest"
            const shortName = m.name.split('/').pop();
            const opt = document.createElement('option');
            opt.value = shortName;
            opt.textContent = m.displayName || shortName;
            selector.appendChild(opt);
        });

        // fallback: keep whatever user had chosen earlier (if still present)
        if (previouslySelected && [...selector.options].some(o => o.value === previouslySelected)) {
            selector.value = previouslySelected;
        } else {
            selector.value = selector.options[0]?.value || '';
            localStorage.setItem('selectedModel', selector.value);
        }
    } catch (err) {
        console.error('[populateModelSelector] failed:', err);
    }
}
