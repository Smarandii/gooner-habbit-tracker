export function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}

export function getYesterdayDateString() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().split('T')[0];
}