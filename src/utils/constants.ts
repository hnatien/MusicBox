export const COLORS = {
    PRIMARY: 0x5865f2, // Discord Blurple
    SUCCESS: 0x57f287, // Green
    WARNING: 0xfee75c, // Yellow
    ERROR: 0xed4245, // Red
    INFO: 0x5865f2, // Blurple
    NOW_PLAYING: 0xeb459e, // Fuchsia
} as const;

export const EMOJIS = {
    MUSIC: '🎵',
    SEARCH: '🔎',
    QUEUE: '📜',
    SKIP: '⏭️',
    PAUSE: '⏸️',
    RESUME: '▶️',
    STOP: '⏹️',
    VOLUME: '🔊',
    ERROR: '❌',
    WARNING: '⚠️',
    SUCCESS: '✅',
    LOADING: '⏳',
} as const;

export const MAX_QUERY_LENGTH = 200;
export const SEARCH_RESULTS_COUNT = 5;
export const QUEUE_PAGE_SIZE = 10;
export const SELECTION_TIMEOUT_MS = 30_000;
export const PROGRESS_BAR_LENGTH = 20;
export const MAX_RECONNECT_ATTEMPTS = 3;
export const STREAM_RETRY_ATTEMPTS = 3;
