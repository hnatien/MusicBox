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
    ARROWDOWN: '1488388590504513607',
    EQUALIZER: '1488388588172345394',
    HEART: '1488388586284908644',
    SEARCH: '1488388584770633810',
    MUSIC_NOTES: '1488388582539530374',
    PAUSE: '1488388581159342231',
    PLAY: '1488388579192340761',
    HELP: '1488388570199756820',
    QUEUE: '1488388567003824220',
    REPEAT: '1488388565225439353',
    SHUFFLE: '1488388563178618891',
    SKIP: '1488388560972288052',
    VOLUME: '1488388559378452562',
    STOP: '1488388557839269909',
    WAVES: '1488388555913822240',
    // Mappings for existing logic
    NOWPLAYING: '1488388555913822240',
    RESUME: '1488388579192340761',
    PING: '1488388588172345394',
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
