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

/* ---------------------------------------------------------------------------
 *  1.  Persona block – describes Seraphina & current attitude
 * ------------------------------------------------------------------------ */
export function personaPrompt(attitude, AI_COMPANION_NAME) {
  /*
   * Builds the persona paragraph that fixes Seraphina’s core character traits
   * and appends the current "attitude" string coming from ATTITUDE_MAPPING.
   */
  const personaDetails =
    `You are ${AI_COMPANION_NAME}, a gorgeous, somewhat tsundere AI companion. ` +
    `You are initially very hard to please. The user is trying to impress you ` +
    `by improving themselves through habits.`;

  return `${personaDetails} Your current attitude towards the user is: ${attitude}. ` +
         `Respond in characteristic, and engaging way`;
}

/* ---------------------------------------------------------------------------
 *  2.  Root wrapper – common to every request sent to Gemini
 * ------------------------------------------------------------------------ */
export function rootPrompt({ userTitleText, AI_COMPANION_NAME, personaBlock, eventType, contextDetails }) {
  /*
   * Establishes hierarchy (Seraphina ► user), injects the persona description,
   * and tags the concrete event.
   */
  return `You are a boss of ${userTitleText}. Your name is ${AI_COMPANION_NAME}. ` +
         `Your attitude towards your subordinate with title ${userTitleText} is defined by: ` +
         `"${personaBlock}". You need to comment on latest event that ${userTitleText} did.\n\n` +
         `Event: ${eventType}\nDetails: ${contextDetails}\n\n${AI_COMPANION_NAME}:`;
}

/* ---------------------------------------------------------------------------
 *  3.  Event‑specific context builders
 * ------------------------------------------------------------------------ */
export function loginContext({ userTitle, loginStreak, today }) {
  return `The user, your "${userTitle}", just logged in. ` +
         `Their current login streak is ${loginStreak} days. Today is ${today}.`;
}

export function newHabitContext({ userTitle, habitName }) {
  return `The user, known as "${userTitle}", just added a new habit: "${habitName}".`;
}

export function habitCompleteContext({ userTitle, habitName, streak, awardedXP }) {
  return `${userTitle} just completed the habit: "${habitName}". ` +
         `Their streak for this habit is ${streak} days. They gained ${awardedXP} XP.`;
}

export function habitEditContext({ userTitle, oldName, newName }) {
  return `The user, "${userTitle}", just edited a habit. ` +
         `It was originally named "${oldName}" and is now named "${newName}".`;
}

export function habitDeleteContext({ userTitle, habitName }) {
  return `The user, "${userTitle}", just deleted the habit named: "${habitName}".`;
}

export function levelUpContext({ level, userTitle, totalXp }) {
  /* NOTE: original implementation referenced currentProfile.xp which wasn’t
   * available at call‑site.  Feel free to extend the params signature if you
   * need to mention XP in the prompt.
   */
  return `Your "Atomic Habit Hero" just reached Level ${level}, titled "${userTitle}"!`;
}