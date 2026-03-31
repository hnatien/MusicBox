export function formatDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const paddedSecs = secs.toString().padStart(2, '0');

    if (hours > 0) {
        const paddedMins = minutes.toString().padStart(2, '0');
        return `${hours}:${paddedMins}:${paddedSecs}`;
    }

    return `${minutes}:${paddedSecs}`;
}

export function createProgressBar(current: number, total: number, length: number = 15): string {
    if (total <= 0) return '───';

    const progress = Math.min(Math.max(current / total, 0), 1);
    const filledLength = Math.round(length * progress);
    
    // Apple Music Style: Ultra-thin lines with a clean circular handle
    const filled = '━'.repeat(filledLength);
    const empty = '─'.repeat(length - filledLength);
    const handle = '●'; 

    if (filledLength === 0) return handle + empty;
    if (filledLength === length) return filled + handle;
    
    return filled + handle + empty;
}
