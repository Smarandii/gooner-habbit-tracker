/**
 * Gets today's date as a string in YYYY-MM-DD format.
 * @returns {string} Today's date string.
 */
export const getTodayDateString = () => {
    return new Date().toISOString().split('T')[0];
};

/**
 * Gets yesterday's date as a string in YYYY-MM-DD format.
 * @returns {string} Yesterday's date string.
 */
export const getYesterdayDateString = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
};

/**
 * Retrieves a value from a configuration object based on the user's level.
 * It finds the highest level defined in the mapping that the user has achieved.
 * @param {number} userLevel - The current level of the user.
 * @param {object} configMapping - An object where keys are level thresholds (e.g., "level_0", "level_5")
 *                                and values are the corresponding configuration values.
 * @param {*} defaultValue - The value to return if no matching level is found or config is empty.
 * @param {string} [keyPrefix='level_'] - The prefix used for level keys in the configMapping.
 * @returns {*} The configuration value for the user's level, or the defaultValue.
 */
export const getValueForLevel = (userLevel, configMapping, defaultValue, keyPrefix = 'level_') => {
    if (!configMapping || Object.keys(configMapping).length === 0) {
        return defaultValue;
    }

    const sortedNumericKeys = Object.keys(configMapping)
        .filter(key => key.startsWith(keyPrefix))
        .map(key => parseInt(key.substring(keyPrefix.length)))
        .filter(num => !isNaN(num)) // Ensure only valid numbers
        .sort((a, b) => b - a); // Sort descending

    for (const numericKey of sortedNumericKeys) {
        if (userLevel >= numericKey) {
            return configMapping[`${keyPrefix}${numericKey}`];
        }
    }

    // If userLevel is lower than any defined numericKey (e.g. level 0 and keys start at 1)
    // or if no keys matched (though the initial check for empty configMapping handles some of this)
    // it will fall through to defaultValue.
    // Also, if configMapping has a specific entry for the lowest possible level (e.g. level_0),
    // and it wasn't caught by the loop (e.g. userLevel is -1, though unlikely),
    // this ensures a defined default.
    // However, the primary use case is when userLevel is below the lowest threshold defined in sortedNumericKeys.
    return defaultValue;
};