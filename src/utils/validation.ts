const YOUTUBE_URL_REGEX =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|playlist\?list=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)/;

const YOUTUBE_PLAYLIST_REGEX = /[?&]list=([a-zA-Z0-9_-]+)/;

/**
 * Check if a string is a valid YouTube URL.
 */
export function isValidYouTubeUrl(input: string): boolean {
    return YOUTUBE_URL_REGEX.test(input.trim());
}

/**
 * Check if a YouTube URL should be treated as a playlist.
 * Returns true only for dedicated playlist URLs or if it's not a Mix and lacks a video ID.
 */
export function isPlaylistUrl(input: string): boolean {
    const url = input.trim();
    if (!YOUTUBE_PLAYLIST_REGEX.test(url)) return false;

    // Ignore YouTube Mixes (IDs starting with RD)
    if (/[?&]list=RD/.test(url)) return false;

    // If it's a dedicated playlist page, it's definitely a playlist
    if (url.includes('playlist?list=')) return true;

    // If it has a video ID (v=) or is a short, prioritize the single video
    // This prevents accidental mass-queuing when sharing a video from within a playlist
    if (url.includes('v=') || url.includes('shorts/')) return false;

    return true;
}

/**
 * Sanitize user query input — trim and limit length.
 */
export function sanitizeQuery(query: string, maxLength: number = 200): string {
    return query.trim().slice(0, maxLength);
}
