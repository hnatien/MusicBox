import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, type Readable } from 'node:stream';
import { YouTube } from 'youtube-sr';
import type { Song } from '../models/song.js';
import { logger } from '../core/logger.js';
import { SEARCH_RESULTS_COUNT, STREAM_RETRY_ATTEMPTS, YTDLP_TIMEOUT_MS } from '../utils/constants.js';
import { formatDuration } from '../utils/formatDuration.js';
import { isValidYouTubeUrl } from '../utils/validation.js';

export interface AudioStreamResult {
    stream: Readable;
}

interface YtdlpVideoInfo {
    title?: string;
    webpage_url?: string;
    url?: string;
    duration?: number;
    thumbnail?: string;
    uploader?: string;
}

interface YtdlpPlaylistInfo {
    title?: string;
    entries?: YtdlpPlaylistEntry[];
}

interface YtdlpPlaylistEntry {
    title?: string;
    url?: string;
    id?: string;
    duration?: number;
    thumbnails?: { url: string }[];
    thumbnail?: string;
    uploader?: string;
    channel?: string;
}

interface CacheEntry {
    song: Song;
    streamUrl?: string;
    expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const STREAM_URL_TTL_MS = 5 * 60 * 1000; // YouTube direct URLs expire; keep short
const MAX_CACHE_SIZE = 500;
const metadataCache = new Map<string, CacheEntry>();
const streamUrlCache = new Map<string, { url: string; expiresAt: number }>();
const COOKIE_FILE_PATH = join(tmpdir(), 'musicbox-youtube.cookies.txt');

let lastCookieRaw = '';

let ffmpegBinary = 'ffmpeg';
try {
    const ffmpegStatic = await import('ffmpeg-static');
    const resolved = ffmpegStatic.default ?? ffmpegStatic;
    if (typeof resolved === 'string') {
        ffmpegBinary = resolved;
    }
} catch {
}

let ytdlpBinary = 'yt-dlp';
try {
    const ytdl = await import('youtube-dl-exec') as Record<string, unknown>;
    const constants = (ytdl.constants ?? (ytdl.default as Record<string, unknown>)?.constants) as
        | { YOUTUBE_DL_PATH?: string }
        | undefined;
    if (constants?.YOUTUBE_DL_PATH) {
        ytdlpBinary = constants.YOUTUBE_DL_PATH;
    }
} catch {
}

function cleanCache(): void {
    const now = Date.now();
    for (const [key, entry] of metadataCache) {
        if (entry.expiresAt < now) {
            metadataCache.delete(key);
        }
    }
}

function evictIfNeeded(): void {
    if (metadataCache.size < MAX_CACHE_SIZE) return;

    cleanCache();

    if (metadataCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = metadataCache.keys().next().value;
        if (oldestKey) metadataCache.delete(oldestKey);
    }
}

function getAuthFlags(): string[] {
    const flags: string[] = [];

    flags.push('--js-runtimes', 'node');

    const browser = process.env.YOUTUBE_BROWSER;
    if (browser) {
        flags.push('--cookies-from-browser', browser);
        return flags;
    }

    const rawCookie = process.env.YOUTUBE_COOKIE;
    const cookie = rawCookie?.replace(/^["']|["']$/g, '').trim();
    if (cookie) {
        try {
            ensureCookieFile(cookie);
            flags.push('--cookies', COOKIE_FILE_PATH);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            logger.warn(`Failed to prepare cookie file for yt-dlp: ${message}`);
        }
    }

    return flags;
}

function ensureCookieFile(cookieString: string): void {
    if (!cookieString) return;
    if (cookieString === lastCookieRaw && existsSync(COOKIE_FILE_PATH)) {
        return;
    }

    const cookies = cookieString
        .replace(/\r/g, '')
        .split(/[;\n]+/)
        .map((part) => part.trim())
        .filter(Boolean)
        .map((pair) => {
            const separatorMatch = pair.includes('=') ? '=' : (pair.includes(':') ? ':' : '');
            if (!separatorMatch) return null;
            const separatorIndex = pair.indexOf(separatorMatch);
            if (separatorIndex <= 0) return null;
            const name = pair.slice(0, separatorIndex).trim();
            const value = pair.slice(separatorIndex + 1).trim();
            if (!name || !value) return null;

            // Accept some common shorthand names users copy from browser tools.
            const normalizedName = name.toLowerCase() === 'secure' ? '__Secure-1PSID' : name;

            return { name: normalizedName, value };
        })
        .filter((item): item is { name: string; value: string } => item !== null);

    if (cookies.length === 0) {
        throw new Error('YOUTUBE_COOKIE does not contain valid key=value pairs');
    }

    const lines = ['# Netscape HTTP Cookie File'];
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 90;

    for (const cookie of cookies) {
        lines.push(`.youtube.com\tTRUE\t/\tTRUE\t${expiresAt}\t${cookie.name}\t${cookie.value}`);
    }

    writeFileSync(COOKIE_FILE_PATH, `${lines.join('\n')}\n`, 'utf8');
    lastCookieRaw = cookieString;
}

function spawnYtdlp(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(ytdlpBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stdoutChunks: Buffer[] = [];
        let stderr = '';
        let settled = false;

        const timer = setTimeout(() => {
            if (!settled) {
                settled = true;
                proc.kill('SIGKILL');
                reject(new Error(`yt-dlp timed out after ${YTDLP_TIMEOUT_MS / 1000}s`));
            }
        }, YTDLP_TIMEOUT_MS);

        proc.stdout!.on('data', (d: Buffer) => { stdoutChunks.push(d); });
        proc.stderr!.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            clearTimeout(timer);
            if (settled) return;
            settled = true;

            if (code !== 0) {
                reject(new Error(`yt-dlp failed (code ${code}): ${stderr}`));
                return;
            }
            resolve(Buffer.concat(stdoutChunks).toString());
        });

        proc.on('error', (err: Error) => {
            clearTimeout(timer);
            if (settled) return;
            settled = true;
            reject(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}. Ensure it is installed: pip install yt-dlp`));
        });
    });
}

export async function searchByQuery(query: string, requestedBy: string): Promise<Song[]> {
    const results = await YouTube.search(query, {
        limit: SEARCH_RESULTS_COUNT,
        type: 'video',
    });

    return results.map((video) => ({
        title: video.title ?? 'Unknown Title',
        url: video.url,
        duration: Math.floor((video.duration ?? 0) / 1000),
        durationFormatted: formatDuration(Math.floor((video.duration ?? 0) / 1000)),
        thumbnail: video.thumbnail?.url ?? '',
        channelName: video.channel?.name ?? 'Unknown Channel',
        requestedBy,
    }));
}

export async function getInfoByUrl(url: string, requestedBy: string): Promise<Song> {
    if (!isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL');
    }

    const cached = metadataCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        return { ...cached.song, requestedBy };
    }

    const cookieFlags = getAuthFlags();
    const stdout = await spawnYtdlp([
        url,
        '--dump-single-json',
        '--no-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '-f', 'ba/ba*',
        ...cookieFlags,
    ]);

    let result: YtdlpVideoInfo;
    try {
        result = JSON.parse(stdout);
    } catch {
        throw new Error('Failed to parse yt-dlp JSON output');
    }

    const streamUrl = result.url || undefined;

    const song: Song = {
        title: result.title ?? 'Unknown Title',
        url: result.webpage_url ?? url,
        duration: result.duration ?? 0,
        durationFormatted: formatDuration(result.duration ?? 0),
        thumbnail: result.thumbnail ?? '',
        channelName: result.uploader ?? 'Unknown Channel',
        requestedBy,
    };

    evictIfNeeded();

    const cacheEntry: CacheEntry = { song, streamUrl, expiresAt: Date.now() + CACHE_TTL_MS };
    metadataCache.set(url, cacheEntry);

    if (song.url !== url) {
        metadataCache.set(song.url, cacheEntry);
    }

    return song;
}

export async function getPlaylistInfo(url: string, requestedBy: string): Promise<{ title: string; songs: Song[] }> {
    const cookieFlags = getAuthFlags();
    const stdout = await spawnYtdlp([
        url,
        '--dump-single-json',
        '--flat-playlist',
        '--no-warnings',
        '--no-check-certificates',
        '--playlist-items', '1:100',
        ...cookieFlags,
    ]);

    let result: YtdlpPlaylistInfo;
    try {
        result = JSON.parse(stdout);
    } catch {
        throw new Error('Failed to parse yt-dlp playlist JSON output');
    }

    const playlistTitle = result.title || 'Unknown Playlist';
    const entries = result.entries || [];

    const songs: Song[] = entries
        .filter((entry) => entry.url || entry.id)
        .map((entry) => ({
            title: entry.title || 'Unknown Title',
            url: entry.url?.startsWith('http') ? entry.url : `https://www.youtube.com/watch?v=${entry.url || entry.id}`,
            duration: entry.duration || 0,
            durationFormatted: formatDuration(entry.duration || 0),
            thumbnail: entry.thumbnails?.[0]?.url || entry.thumbnail || '',
            channelName: entry.uploader || entry.channel || 'Unknown Channel',
            requestedBy,
        }));

    return { title: playlistTitle, songs };
}

export async function getAudioStream(url: string): Promise<AudioStreamResult> {
    let lastError: unknown;
    const sanitizedUrl = url.trim();

    for (let attempt = 1; attempt <= STREAM_RETRY_ATTEMPTS; attempt++) {
        try {
            const stream = await createYtdlpStream(sanitizedUrl);
            return { stream };
        } catch (error) {
            lastError = error;
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.warn(`Stream attempt ${attempt}/${STREAM_RETRY_ATTEMPTS} failed: ${errorMsg}`);

            if (attempt < STREAM_RETRY_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    throw new Error(`Failed to get audio stream after ${STREAM_RETRY_ATTEMPTS} attempts: ${lastError}`);
}

async function resolveAudioUrl(url: string): Promise<string> {
    const cookieFlags = getAuthFlags();
    const stdout = await spawnYtdlp([
        url,
        '-f', 'ba/ba*',
        '-g',
        '--no-warnings',
        '--no-check-certificates',
        ...cookieFlags,
    ]);

    const trimmed = stdout.trim();
    if (!trimmed) {
        throw new Error('yt-dlp returned no URL');
    }

    return trimmed.split('\n')[0].trim();
}

function spawnFfmpegStream(audioUrl: string): Readable {
    const ffmpegArgs = [
        '-reconnect', '1',
        '-reconnect_streamed', '1',
        '-reconnect_delay_max', '5',
        '-analyzeduration', '0',
        '-probesize', '32k',
        '-i', audioUrl,
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
    ];

    const ffmpegProc: ChildProcess = spawn(ffmpegBinary, ffmpegArgs, {
        stdio: ['ignore', 'pipe', 'ignore'],
    });

    const passThrough = new PassThrough();

    ffmpegProc.stdout!.pipe(passThrough);

    ffmpegProc.stdout!.on('error', (err: Error) => {
        passThrough.destroy(err);
    });

    ffmpegProc.on('error', (err: Error) => {
        passThrough.destroy(err);
    });

    ffmpegProc.on('close', () => {
        passThrough.end();
    });

    passThrough.on('close', () => {
        if (!ffmpegProc.killed) {
            ffmpegProc.kill('SIGKILL');
        }
    });

    return passThrough;
}

async function createYtdlpStream(url: string): Promise<Readable> {
    const now = Date.now();
    const cached = streamUrlCache.get(url);
    if (cached && cached.expiresAt > now) {
        logger.debug(`Stream URL cache hit for: ${url}`);
        return spawnFfmpegStream(cached.url);
    }

    // Resolve a fresh playable direct URL via yt-dlp (-g). The metadata "url"
    // from --dump-single-json can be a DASH manifest or otherwise non-playable
    // by ffmpeg directly, so we always use -g here.
    const audioUrl = await resolveAudioUrl(url);
    streamUrlCache.set(url, { url: audioUrl, expiresAt: now + STREAM_URL_TTL_MS });
    return spawnFfmpegStream(audioUrl);
}
