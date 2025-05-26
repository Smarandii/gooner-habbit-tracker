import { LEVEL_TITLES, ATTITUDE_MAPPING } from './config.js';

/* ------------------------------------------------------------------ */
/*  getUserTitle – returns a textual rank for a given user level      */
/* ------------------------------------------------------------------ */
export function getUserTitle(level) {
  return LEVEL_TITLES
    .slice()
    .reverse()
    .find(t => level >= t.minLevel)?.title
    || LEVEL_TITLES[0].title;
}

/* ------------------------------------------------------------------ */
/*  getCompanionAttitude – maps level to companion attitude string    */
/* ------------------------------------------------------------------ */
export function getCompanionAttitude(level) {
  let attitude = ATTITUDE_MAPPING.level_0;

  const sorted = Object.keys(ATTITUDE_MAPPING)
    .map(k => parseInt(k.split('_')[1], 10))
    .sort((a, b) => b - a);

  for (const lvl of sorted)
    if (level >= lvl) {
      attitude = ATTITUDE_MAPPING['level_' + lvl];
      break;
    }

  return attitude;
}
