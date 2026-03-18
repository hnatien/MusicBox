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

export function formatTotalDuration(seconds: number): string {
    if (!Number.isFinite(seconds) || seconds <= 0) return '0m';

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }

    return `${minutes}m`;
}

export function createProgressBar(current: number, total: number, length: number = 20): string {
    if (total <= 0) return '▬'.repeat(length);

    const progress = Math.min(current / total, 1);
    const sliderPos = Math.round(progress * (length - 1));

    const before = '▬'.repeat(sliderPos);
    const after = '▬'.repeat(length - 1 - sliderPos);

    return `${before}🔘${after}`;
}
