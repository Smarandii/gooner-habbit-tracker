import { geminiApiKey, isAiThinking, setIsAiThinking, userProfile, setGeminiApiKey } from './state.js';
import { AI_COMPANION_NAME, ATTITUDE_MAPPING } from './config.js';
import { displayAiMessage, promptForApiKeyModal, showToast } from './ui.js';
import { getUserTitle, getUserAttitude } from './gamification.js';
import { saveData } from './data.js';
import { personaPrompt, rootPrompt } from './ai_prompts.js';

/**
 * Checks if a Gemini API key exists and is valid.
 * If not, it prompts the user to enter their API key via a modal.
 * Displays initial AI messages based on key status.
 * @returns {Promise<void>} A promise that resolves if the key is present or successfully entered,
 *                          and rejects if the user provides no key after being prompted.
 */
export const checkAndPromptForApiKey = () => {
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
};

/**
 * Saves the provided API key to state and localStorage.
 * Shows notifications to the user about the outcome.
 * @param {string} inputKey - The API key entered by the user.
 * @returns {boolean} True if the key was saved successfully, false otherwise.
 */
export const handleSaveApiKey = (inputKey) => {
    if (inputKey) {
        setGeminiApiKey(inputKey);
        saveData();
        // closeApiKeyModal(); // This responsibility should be in main.js or ui.js
        showToast("API Key saved! Seraphina is now active.", "success");
        displayAiMessage("Systems activated. It's... a pleasure to meet you, I suppose.", false);
        return true;
    } else {
        showToast("API Key cannot be empty.", "error");
        return false;
    }
};

/**
 * Retrieves the AI's current attitude based on user level and constructs the persona prompt.
 * @param {number} level - The user's current level.
 * @returns {string} The complete persona prompt string for the AI.
 * @private
 */
function getAiAttitudeAndPersona(level) {
    const attitude = getUserAttitude(level);
    return personaPrompt(attitude, AI_COMPANION_NAME);
};

/**
 * Generates an AI response using the Gemini API via a proxy.
 * Constructs a prompt based on event type and context, then sends it to the AI.
 * Handles API errors, including invalid API key and quota issues, by displaying messages to the user.
 * @param {string} eventType - The type of event that triggered the AI interaction (e.g., "new_habit", "level_up").
 * @param {string} contextDetails - A string containing specific details about the event.
 * @returns {Promise<void>} A promise that resolves when the AI response is processed or an error occurs.
 */
export const generateAiResponse = async (eventType, contextDetails) => {
    if (!geminiApiKey || isAiThinking) {
        if (!geminiApiKey) displayAiMessage("I need a valid API Key to speak.", true);
        return;
    }
    setIsAiThinking(true);
    displayAiMessage("Thinking...", false, true);

    const userTitleText = getUserTitle(userProfile.level);
    const personaBlock = getAiAttitudeAndPersona(userProfile.level);
    const fullPrompt = rootPrompt({ userTitleText, AI_COMPANION_NAME, personaBlock, eventType, contextDetails });

    // console.log("Gemini Prompt:", fullPrompt); // Debug log, remove for production

    try {
        const response = await fetch("/ai-proxy", {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ apiKey: geminiApiKey, prompt: fullPrompt })
		});

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Gemini API Error:", errorData);
            let errorMsg = `API Error: ${response.status}. `;
            if (errorData.error && errorData.error.message) errorMsg += `${errorData.error.message}`;

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
        const { candidates, promptFeedback } = data; // Destructuring

        if (candidates?.[0]?.content?.parts?.[0]) {
            let AImessage = candidates[0].content.parts[0].text.trim();
            AImessage = AImessage.replace(new RegExp(`^${AI_COMPANION_NAME}:?\\s*`, "i"), "").trim();
            displayAiMessage(AImessage);
        } else if (promptFeedback?.blockReason) {
             displayAiMessage(`I can't respond to that. (Reason: ${promptFeedback.blockReason})`, true);
        } else {
            displayAiMessage("I'm a bit speechless right now...", true);
        }
    } catch (error) {
        // console.error("Error calling Gemini API:", error); // Debug log, ensure user-facing errors are handled
        if (!error.message.includes("API Error")) { // Avoid double-messaging for API errors already handled
             displayAiMessage("Oops! I couldn't connect to my thoughts. Check the console log for details.", true);
        }
    } finally {
        setIsAiThinking(false);
    }
}
