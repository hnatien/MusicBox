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

export function formatRemainingDuration(elapsed: number, total: number): string {
    const remaining = Math.max(0, total - elapsed);
    return `-${formatDuration(remaining)}`;
}

export function createProgressBar(current: number, total: number, length: number = 20): string {
    if (total <= 0) return '▬'.repeat(length);

    const progress = Math.min(current / total, 1);
    const filledLength = Math.round(progress * length);
    
    // Discord style slider
    const filled = '▬'.repeat(filledLength);
    const empty = '▬'.repeat(length - filledLength);
    
    return `${filled}🔘${empty.slice(1) || ''}`;
}
