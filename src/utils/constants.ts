export const COLORS = {
    PRIMARY: 0x000000,
    SUCCESS: 0x34C759,
    WARNING: 0xFF9F0A,
    ERROR: 0xFF3B30,
    INFO: 0x007AFF,
    NOW_PLAYING: 0xFF2D55,
    ACCENT: 0xFF2D55,
    SECONDARY: 0x8E8E93,
} as const;

export const EMOJIS = {
    MUSIC: '🎵', 
    SEARCH: '🔍',
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

export const SF_SYMBOLS = {
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

export const UI_ICONS = {
    PLAYING: '●', 
    UP_NEXT: '○',
    SEPARATOR: '·',
    BULLET: '􀄬',
    TIME: '􀐫',
    REQUESTER: '􀝖',
} as const;

export const APP_EMOJIS = {
    ARROWDOWN: '1488384506628014230',
    HELP: '1488384504493244506',
    WAVES: '1488384501930397786',
    REPEAT: '1488384500080840704',
    HEART: '1488384498407178420',
    QUEUE: '1488384495928348925',
    SHUFFLE: '1488384493239668788',
    STOP: '1488384491394433085',
    PLAY: '1488384489309736990',
    SEARCH: '1488384486541623357',
    VOLUME: '1488384484649865267',
    EQUALIZER: '1488384482598977637',
    // Mappings for existing logic
    NOWPLAYING: '1488384501930397786',
    PAUSE: '1488384500080840704',
    SKIP: '1488377182622322868',
    RESUME: '1488384489309736990',
    PING: '1488384482598977637', // Mapping to EQUALIZER
} as const;

export const formatAppEmoji = (name: keyof typeof APP_EMOJIS) => `<:${name.toLowerCase()}:${APP_EMOJIS[name]}>`;
export const getEmojiUrl = (id: string) => `https://cdn.discordapp.com/emojis/${id}.png`;

export const MAX_QUERY_LENGTH = 200;
export const SEARCH_RESULTS_COUNT = 5;
export const QUEUE_PAGE_SIZE = 10;
export const SELECTION_TIMEOUT_MS = 30_000;
export const PROGRESS_BAR_LENGTH = 20;
export const MAX_RECONNECT_ATTEMPTS = 3;
export const STREAM_RETRY_ATTEMPTS = 3;
