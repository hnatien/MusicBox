import { spawn, type ChildProcess } from 'node:child_process';
import { PassThrough, type Readable } from 'node:stream';
import { YouTube } from 'youtube-sr';
import type { Song } from '../models/song.js';
import { logger } from '../core/logger.js';
import { SEARCH_RESULTS_COUNT, STREAM_RETRY_ATTEMPTS } from '../utils/constants.js';
import { formatDuration } from '../utils/formatDuration.js';
import { isValidYouTubeUrl } from '../utils/validation.js';

export interface AudioStreamResult {
    stream: Readable;
}

interface CacheEntry {
    song: Song;
    streamUrl?: string;
    expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const metadataCache = new Map<string, CacheEntry>();

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
    const ytdl = await import('youtube-dl-exec') as any;
    const constants = ytdl.constants || ytdl.default?.constants;
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
        flags.push('--add-header', `Cookie:${cookie}`);
    }

    return flags;
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

    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const args = [
            url,
            '--dump-single-json',
            '--no-playlist',
            '--no-warnings',
            '--no-check-certificates',
            '-f', 'ba/ba*',
            ...cookieFlags,
        ];

        const proc = spawn(ytdlpBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        proc.stdout!.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr!.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp metadata failed (code ${code}): ${stderr}`));
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            } catch {
                reject(new Error('Failed to parse yt-dlp JSON output'));
            }
        });

        proc.on('error', (err: Error) => {
            reject(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}. Ensure it is installed: pip install yt-dlp`));
        });
    });

    const streamUrl = (result.url as string) || undefined;

    const song: Song = {
        title: (result.title as string) ?? 'Unknown Title',
        url: (result.webpage_url as string) ?? url,
        duration: (result.duration as number) ?? 0,
        durationFormatted: formatDuration((result.duration as number) ?? 0),
        thumbnail: (result.thumbnail as string) ?? '',
        channelName: (result.uploader as string) ?? 'Unknown Channel',
        requestedBy,
    };

    if (metadataCache.size >= MAX_CACHE_SIZE) {
        cleanCache();
    }

    const cacheEntry: CacheEntry = { song, streamUrl, expiresAt: Date.now() + CACHE_TTL_MS };
    metadataCache.set(url, cacheEntry);

    if (song.url !== url) {
        metadataCache.set(song.url, cacheEntry);
    }

    return song;
}

export async function getPlaylistInfo(url: string, requestedBy: string): Promise<{ title: string; songs: Song[] }> {
    const cookieFlags = getAuthFlags();

    const result = await new Promise<any>((resolve, reject) => {
        const args = [
            url,
            '--dump-single-json',
            '--flat-playlist',
            '--no-warnings',
            '--no-check-certificates',
            ...cookieFlags,
        ];

        const proc = spawn(ytdlpBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';
        let stderr = '';

        proc.stdout!.on('data', (d: Buffer) => { stdout += d.toString(); });
        proc.stderr!.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp playlist failed (code ${code}): ${stderr}`));
                return;
            }
            try {
                resolve(JSON.parse(stdout));
            } catch {
                reject(new Error('Failed to parse yt-dlp playlist JSON output'));
            }
        });

        proc.on('error', (err: Error) => {
            reject(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}`));
        });
    });

    const playlistTitle = result.title || 'Unknown Playlist';
    const entries = (result.entries as any[]) || [];

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

function resolveAudioUrl(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const cookieFlags = getAuthFlags();

        const ytdlpArgs = [
            url,
            '-f', 'ba/ba*',
            '-g',
            '--no-warnings',
            '--no-check-certificates',
            ...cookieFlags,
        ];

        const proc = spawn(ytdlpBinary, ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });

        let stdout = '';
        let stderr = '';

        proc.stdout!.on('data', (d: Buffer) => { stdout += d.toString().trim(); });
        proc.stderr!.on('data', (d: Buffer) => { stderr += d.toString(); });

        proc.on('close', (code) => {
            if (code !== 0 || !stdout) {
                reject(new Error(`yt-dlp failed (code ${code}): ${stderr || 'no URL returned'}`));
                return;
            }
            resolve(stdout.split('\n')[0].trim());
        });

        proc.on('error', (err: Error) => {
            reject(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}. Ensure it is installed: pip install yt-dlp`));
        });
    });
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
    const cached = metadataCache.get(url);
    if (cached?.streamUrl && cached.expiresAt > Date.now()) {
        logger.debug(`Stream URL cache hit for: ${url}`);
        return spawnFfmpegStream(cached.streamUrl);
    }

    const audioUrl = await resolveAudioUrl(url);
    return spawnFfmpegStream(audioUrl);
}
