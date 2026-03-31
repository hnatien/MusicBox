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
    HEART: '1488377211693301925',
    HELP: '1488377208442458232',
    NOWPLAYING: '1488377206215413790',
    PAUSE: '1488377204516847637',
    PING: '1488377202792726538',
    PLAY: '1488377200540385341',
    QUEUE: '1488377199198474420',
    REPEAT: '1488377196899995709',
    RESUME: '1488377189257973921',
    SEARCH: '1488377187064352808',
    SHUFFLE: '1488377184362958870',
    SKIP: '1488377182622322868',
    STOP: '1488377180819030186',
    UPDATE: '1488377178356977664',
    VOLUME: '1488377176221945957',
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
