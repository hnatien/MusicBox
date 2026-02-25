const YOUTUBE_URL_REGEX =
    /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|playlist\?list=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)/;

const YOUTUBE_PLAYLIST_REGEX = /[?&]list=([a-zA-Z0-9_-]+)/;

export function isValidYouTubeUrl(input: string): boolean {
    return YOUTUBE_URL_REGEX.test(input.trim());
}

export function isPlaylistUrl(input: string): boolean {
    const url = input.trim();
    if (!YOUTUBE_PLAYLIST_REGEX.test(url)) return false;

    if (/[?&]list=RD/.test(url)) return false;

    if (url.includes('playlist?list=')) return true;

    if (url.includes('v=') || url.includes('shorts/')) return false;

    return true;
}

export function isMixUrl(input: string): boolean {
    return /[?&]list=RD/.test(input.trim());
}

export function sanitizeQuery(query: string, maxLength: number = 200): string {
    return query.trim().slice(0, maxLength);
}
