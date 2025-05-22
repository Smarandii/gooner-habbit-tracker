/**
 * ai_prompts.js
 *
 * Centralised collection of every prompt or prompt‑template that the Atomic Habit
 * Hero app sends to Google Gemini.  Moving them here lets you tweak wording in a
 * single place and instantly feel the behavioural difference in the running
 * app.
 *
 * Each template is implemented as a tiny helper that receives the dynamic bits
 * as arguments and returns the fully rendered prompt string.  No placeholder
 * tokens are left lying around – the functions deliver ready‑to‑send strings.
 *
 * ---------------------------------------------------------------------------
 *  HOW TO USE
 * ---------------------------------------------------------------------------
 *   1.  Import what you need:
 *          import { rootPrompt, loginContext, ... } from './ai_prompts.js';
 *
 *   2.  Generate your context block:  const ctx = loginContext({...});
 *
 *   3.  Wrap it with rootPrompt():     const full = rootPrompt({ ...ctxProps });
 *
 *   4.  Pass `full` straight to /ai‑proxy.
 *
 * ---------------------------------------------------------------------------
 */

/**
 * @file Centralized AI prompt generation for the Atomic Habit Hero app.
 * Each function constructs a specific part of a prompt or a complete prompt
 * to be sent to the Google Gemini API.
 */

/* ---------------------------------------------------------------------------
 *  1.  Persona block – describes Seraphina & current attitude
 * ------------------------------------------------------------------------ */
/**
 * Generates the persona block for the AI, defining its character and current attitude.
 * @param {string} attitude - A string describing the AI's current attitude (e.g., "hostile", "impressed").
 * @param {string} AI_COMPANION_NAME - The name of the AI companion.
 * @returns {string} The persona prompt block.
 */
export const personaPrompt = (attitude, AI_COMPANION_NAME) => {
    const personaDetails =
    `You are ${AI_COMPANION_NAME}, a gorgeous, somewhat tsundere AI companion. ` +
    `You are initially very hard to please. The user is trying to impress you ` +
    `by improving themselves through habits.`;
    return `${personaDetails} Your current attitude towards the user is: ${attitude}. ` +
    `Respond in characteristic, and engaging way`;
};

/* ---------------------------------------------------------------------------
 *  2.  Root wrapper – common to every request sent to Gemini
 * ------------------------------------------------------------------------ */
/**
 * Constructs the root prompt that wraps all specific event contexts.
 * Establishes AI's role, injects persona, and sets up the event structure.
 * @param {Object} params - The parameters for constructing the root prompt.
 * @param {string} params.userTitleText - The user's current title (e.g., "Habit Dabbler").
 * @param {string} params.AI_COMPANION_NAME - The name of the AI companion.
 * @param {string} params.personaBlock - The pre-generated persona block from `personaPrompt`.
 * @param {string} params.eventType - A string identifying the type of event (e.g., "login", "new_habit").
 * @param {string} params.contextDetails - Specific details related to the event.
 * @returns {string} The complete prompt to be sent to the AI.
 */
export const rootPrompt = ({ userTitleText, AI_COMPANION_NAME, personaBlock, eventType, contextDetails }) => {
    /*
    * Establishes hierarchy (Seraphina ► user), injects the persona description,
    * and tags the concrete event.
    */
    return `You are a boss of ${userTitleText}. Your name is ${AI_COMPANION_NAME}. ` +
    `Your attitude towards your subordinate with title ${userTitleText} is defined by: ` +
    `"${personaBlock}". You need to comment on latest event that ${userTitleText} did.\n\n` +
    `Event: ${eventType}\nDetails: ${contextDetails}\n\n${AI_COMPANION_NAME}:`;
};

/* ---------------------------------------------------------------------------
 *  3.  Event‑specific context builders
 * ------------------------------------------------------------------------ */
/**
 * Generates context details for a user login event.
 * @param {Object} params - Parameters for the login context.
 * @param {string} params.userTitle - The user's current title.
 * @param {number} params.loginStreak - The user's current login streak in days.
 * @param {string} params.today - Today's date string.
 * @returns {string} Context details for the login event.
 */
export const loginContext = ({ userTitle, loginStreak, today }) => {
  return `The user, your "${userTitle}", just logged in. ` +
         `Their current login streak is ${loginStreak} days. Today is ${today}.`;
};

/**
 * Generates context details for a new habit addition event.
 * @param {Object} params - Parameters for the new habit context.
 * @param {string} params.userTitle - The user's current title.
 * @param {string} params.habitName - The name of the newly added habit.
 * @returns {string} Context details for the new habit event.
 */
export const newHabitContext = ({ userTitle, habitName }) => {
  return `The user, known as "${userTitle}", just added a new habit: "${habitName}".`;
};

/**
 * Generates context details for a habit completion event.
 * @param {Object} params - Parameters for the habit completion context.
 * @param {string} params.userTitle - The user's current title.
 * @param {string} params.habitName - The name of the completed habit.
 * @param {number} params.streak - The current streak for this habit.
 * @param {number} params.awardedXP - The amount of XP awarded for this completion.
 * @returns {string} Context details for the habit completion event.
 */
export const habitCompleteContext = ({ userTitle, habitName, streak, awardedXP }) => {
  return `${userTitle} just completed the habit: "${habitName}". ` +
         `Their streak for this habit is ${streak} days. They gained ${awardedXP} XP.`;
};

/**
 * Generates context details for a habit edit event.
 * @param {Object} params - Parameters for the habit edit context.
 * @param {string} params.userTitle - The user's current title.
 * @param {string} params.oldName - The original name of the habit.
 * @param {string} params.newName - The new name of the habit.
 * @returns {string} Context details for the habit edit event.
 */
export const habitEditContext = ({ userTitle, oldName, newName }) => {
  return `The user, "${userTitle}", just edited a habit. ` +
         `It was originally named "${oldName}" and is now named "${newName}".`;
};

/**
 * Generates context details for a habit deletion event.
 * @param {Object} params - Parameters for the habit deletion context.
 * @param {string} params.userTitle - The user's current title.
 * @param {string} params.habitName - The name of the deleted habit.
 * @returns {string} Context details for the habit deletion event.
 */
export const habitDeleteContext = ({ userTitle, habitName }) => {
  return `The user, "${userTitle}", just deleted the habit named: "${habitName}".`;
};

/**
 * Generates context details for a user level-up event.
 * @param {Object} params - Parameters for the level-up context.
 * @param {number} params.level - The new level achieved by the user.
 * @param {string} params.userTitle - The user's new title associated with this level.
 * @param {number} params.totalXp - The user's total experience points.
 * @returns {string} Context details for the level-up event.
 */
export const levelUpContext = ({ level, userTitle, totalXp }) => {
  /* NOTE: original implementation referenced currentProfile.xp which wasn’t
   * available at call‑site.  Feel free to extend the params signature if you
   * need to mention XP in the prompt.
   */
  return `Your "Atomic Habit Hero" just reached Level ${level}, titled "${userTitle}"! Their total XP is: ${totalXp}`;
};