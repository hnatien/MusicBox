export const COLORS = {
    PRIMARY: 0x000000, // Black
    SUCCESS: 0x34C759, // Apple Success Green
    WARNING: 0xFF9F0A, // Apple Warning Orange
    ERROR: 0xFF3B30,   // Apple Error Red
    INFO: 0x007AFF,    // Apple Info Blue
    NOW_PLAYING: 0xFF2D55, // Apple Music Pink/Red
    ACCENT: 0xFF2D55,
    SECONDARY: 0x8E8E93, // Apple Secondary Gray
} as const;

export const EMOJIS = {
    // Apple-inspired minimalist system icons
    MUSIC: '􀑪', 
    SEARCH: '􀊫',
    QUEUE: '􀑬',
    SKIP: '􀊐',
    PAUSE: '􀊄',
    RESUME: '􀊂',
    STOP: '􀊆',
    VOLUME: '􀊩',
    ERROR: '􀀴',
    WARNING: '􀇾',
    SUCCESS: '􀁣',
    LOADING: '􀖇',
} as const;

// Minimalist Text-based Fallbacks for Discord (Clean typography)
export const UI_ICONS = {
    PLAYING: '●', 
    UP_NEXT: '○',
    SEPARATOR: '·',
    BULLET: '􀄬',
    TIME: '􀐫',
    REQUESTER: '􀝖',
} as const;

export const MAX_QUERY_LENGTH = 200;
export const SEARCH_RESULTS_COUNT = 5;
export const QUEUE_PAGE_SIZE = 10;
export const SELECTION_TIMEOUT_MS = 30_000;
export const PROGRESS_BAR_LENGTH = 20;
export const MAX_RECONNECT_ATTEMPTS = 3;
export const STREAM_RETRY_ATTEMPTS = 3;
