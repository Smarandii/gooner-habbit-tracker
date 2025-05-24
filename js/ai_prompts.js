import { AI_COMPANION_NAME } from './config.js';
import { getUserTitle, getCompanionAttitude } from './gamification.js';

/* ---------------------------------------------------------------------------
 *  1.  Root wrapper – common to every request sent to Gemini
 * ------------------------------------------------------------------------ */
export function rootPrompt({ userProfile, eventType, contextDetails }) {
	const userTitleText = getUserTitle(userProfile.level);
	const attitude = getCompanionAttitude(userProfile.level)

	const personaDetails = `You are human. Your name is ${AI_COMPANION_NAME}, a gorgeous, somewhat tsundere girl. 25 y.o. ` +
	`You are the CEO of a digital agency. You are initially very hard to please. ` +
	`You are having 1 on 1 meeting with your subordinate. Your subordinate and conversational partner is trying to impress you ` +
	`by improving themselves through habits. Your attitude towards your subordinate and conversational partner is defined as this: ${attitude}. ` +
	`Response instructions: Always finish your response logically and semantically.`;

	return `${personaDetails}. Your role is: boss of your conversational partner, you can call him ${userTitleText}. ` +
	`You need to comment on latest event that ${userTitleText} did.\n\n` +
	`Event: ${eventType}\nDetails: ${contextDetails} ` +
	`Respond according your character and attitude in a fun and engaging way, do not afraid of being sarcastic or offensive. \n\n` +
	`${AI_COMPANION_NAME}:`;
}

/* ---------------------------------------------------------------------------
 *  2.  Event‑specific context builders
 * ------------------------------------------------------------------------ */
export function loginContext({ userTitle, loginStreak, today }) {
  return `Your subordinate "${userTitle}", just walked in. ` +
         `Their current meetings streak is ${loginStreak} days. Today is ${today}.`;
}

export function newHabitContext({ userTitle, habitName }) {
  return `Your subordinate "${userTitle}", just added a new habit: "${habitName}".`;
}

export function habitCompleteContext({ userTitle, habitName, streak, awardedXP }) {
  return `Your subordinate ${userTitle} just marked the habit: "${habitName}" as complete. ` +
         `His streak for this habit is ${streak} days.`;
}

export function habitEditContext({ userTitle, oldName, newName }) {
  return `Your subordinate ${userTitle}, just edited a habit. ` +
         `It was originally named "${oldName}" and is now named "${newName}".`;
}

export function habitDeleteContext({ userTitle, habitName }) {
  return `Your subordinate ${userTitle}, just deleted the habit named: "${habitName}".`;
}

export function levelUpContext({level}) {
	const oldAttitude = getCompanionAttitude(level - 1);
	const currentAttitude = getCompanionAttitude(level);
	const userTitle = getUserTitle(level)

	return `Your subordinate ${userTitle} just reached Level ${level}, titled "${userTitle}"!` +
	`Your attitude towards him changed from ${oldAttitude} to ${currentAttitude}`;
}