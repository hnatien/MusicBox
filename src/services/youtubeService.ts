import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough, type Readable } from 'node:stream';
import { YouTube } from 'youtube-sr';
import type { Song } from '../models/song.js';
import { logger } from '../core/logger.js';
import { SEARCH_RESULTS_COUNT, STREAM_RETRY_ATTEMPTS } from '../utils/constants.js';
import { config } from '../config/environment.js';
import { formatDuration } from '../utils/formatDuration.js';
import { isValidYouTubeUrl } from '../utils/validation.js';

export interface AudioStreamResult {
    stream: Readable;
}

interface CacheEntry {
    song: Song;
    expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 500;
const metadataCache = new Map<string, CacheEntry>();

const FFMPEG_PROBE_SIZE = 128_000;
const FFMPEG_ANALYZE_DURATION = 0;
const FFMPEG_THREADS = 1;

function cacheSet(key: string, entry: CacheEntry): void {
    if (metadataCache.size >= MAX_CACHE_SIZE) {
        const oldest = metadataCache.keys().next().value;
        if (oldest !== undefined) metadataCache.delete(oldest);
    }
    metadataCache.set(key, entry);
}

let ffmpegBinary = process.env.FFMPEG_BINARY?.trim() || 'ffmpeg';
try {
    const ffmpegStatic = await import('ffmpeg-static');
    const resolved = ffmpegStatic.default ?? ffmpegStatic;
    if (typeof resolved === 'string') {
        const hasSystemFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
        if (!hasSystemFfmpeg || process.platform === 'win32') {
            ffmpegBinary = resolved;
        }
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

setInterval(cleanCache, 15 * 60 * 1000).unref();

// Write YOUTUBE_COOKIE to a Netscape-format file once at startup.
// yt-dlp deprecated --add-header Cookie: as a security risk (exits code 1).
let cookieFilePath: string | null = null;
const rawEnvCookie = process.env.YOUTUBE_COOKIE?.replace(/^["']|["']$/g, '').trim();
if (rawEnvCookie) {
    try {
        const lines = ['# Netscape HTTP Cookie File'];
        for (const part of rawEnvCookie.split(';')) {
            const eq = part.indexOf('=');
            if (eq < 0) continue;
            const name = part.slice(0, eq).trim();
            const value = part.slice(eq + 1).trim();
            if (name) lines.push(`.youtube.com\tTRUE\t/\tFALSE\t0\t${name}\t${value}`);
        }
        cookieFilePath = join(tmpdir(), 'musicbox_yt_cookies.txt');
        writeFileSync(cookieFilePath, lines.join('\n'), 'utf8');
        logger.info('YouTube cookie file written');
    } catch (err) {
        logger.warn(`Failed to write YouTube cookie file: ${err instanceof Error ? err.message : String(err)}`);
    }
}

function getAuthFlags(): string[] {
    const flags = ['--js-runtimes', 'node'];
    if (cookieFilePath) flags.push('--cookies', cookieFilePath);
    return flags;
}

export async function searchByQuery(query: string, requestedBy: string): Promise<Song[]> {
    try {
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
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.warn(`youtube-sr search failed, falling back to yt-dlp: ${message}`);
        return searchByQueryWithYtdlp(query, requestedBy);
    }
}

async function searchByQueryWithYtdlp(query: string, requestedBy: string): Promise<Song[]> {
    const cookieFlags = getAuthFlags();

    const result = await new Promise<any>((resolve, reject) => {
        const args = [
            `ytsearch${SEARCH_RESULTS_COUNT}:${query}`,
            '--dump-single-json',
            '--flat-playlist',
            '--no-warnings',
            '--no-check-certificates',
            ...cookieFlags,
        ];

        const proc = spawn(ytdlpBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stdoutChunks: Buffer[] = [];
        let stderr = '';

        proc.stdout!.on('data', (d: Buffer) => { stdoutChunks.push(d); });
        proc.stderr!.on('data', (d: Buffer) => { if (stderr.length < 10_000) stderr += d.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`yt-dlp search failed (code ${code}): ${stderr}`));
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(stdoutChunks).toString()));
            } catch {
                reject(new Error('Failed to parse yt-dlp search JSON output'));
            }
        });

        proc.on('error', (err: Error) => {
            reject(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}`));
        });
    });

    const entries = (result.entries as any[]) || [];
    return entries
        .filter((entry) => entry.url || entry.id)
        .map((entry) => {
            const duration = Number(entry.duration) || 0;
            const videoId = entry.id || entry.url;

            return {
                title: entry.title || 'Unknown Title',
                url: `https://www.youtube.com/watch?v=${videoId}`,
                duration,
                durationFormatted: formatDuration(duration),
                thumbnail: entry.thumbnails?.[0]?.url || entry.thumbnail || '',
                channelName: entry.uploader || entry.channel || 'Unknown Channel',
                requestedBy,
            };
        });
}

export async function getInfoByUrl(url: string, requestedBy: string): Promise<Song> {
    if (!isValidYouTubeUrl(url)) {
        throw new Error('Invalid YouTube URL');
    }

    const cached = metadataCache.get(url);
    if (cached && cached.expiresAt > Date.now()) {
        metadataCache.delete(url);
        metadataCache.set(url, cached);
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
            '-f', 'ba[acodec=opus][abr<=128]/ba[acodec=vorbis][abr<=128]/ba[abr<=160]/ba',
            ...cookieFlags,
        ];

        const proc = spawn(ytdlpBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stdoutChunks: Buffer[] = [];
        let stderr = '';

        const timeout = setTimeout(() => {
            if (!proc.killed) {
                proc.kill('SIGKILL');
                reject(new Error(`yt-dlp metadata timed out after ${config.YT_METADATA_TIMEOUT_MS}ms`));
            }
        }, config.YT_METADATA_TIMEOUT_MS);

        proc.stdout!.on('data', (d: Buffer) => { stdoutChunks.push(d); });
        proc.stderr!.on('data', (d: Buffer) => { if (stderr.length < 10_000) stderr += d.toString(); });

        proc.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                reject(new Error(`yt-dlp metadata failed (code ${code}): ${stderr}`));
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(stdoutChunks).toString()));
            } catch {
                reject(new Error('Failed to parse yt-dlp JSON output'));
            }
        });

        proc.on('error', (err: Error) => {
            clearTimeout(timeout);
            reject(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}. Ensure it is installed: pip install yt-dlp`));
        });
    });

    const song: Song = {
        title: (result.title as string) ?? 'Unknown Title',
        url: (result.webpage_url as string) ?? url,
        duration: (result.duration as number) ?? 0,
        durationFormatted: formatDuration((result.duration as number) ?? 0),
        thumbnail: (result.thumbnail as string) ?? '',
        channelName: (result.uploader as string) ?? 'Unknown Channel',
        requestedBy,
    };

    const cacheEntry: CacheEntry = { song, expiresAt: Date.now() + CACHE_TTL_MS };

    cacheSet(url, cacheEntry);
    if (song.url !== url) cacheSet(song.url, cacheEntry);

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
            '--playlist-items', '1:100',
            ...cookieFlags,
        ];

        const proc = spawn(ytdlpBinary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
        const stdoutChunks: Buffer[] = [];
        let stderr = '';

        const timeout = setTimeout(() => {
            if (!proc.killed) {
                proc.kill('SIGKILL');
                reject(new Error(`yt-dlp playlist metadata timed out after ${config.YT_PLAYLIST_TIMEOUT_MS}ms`));
            }
        }, config.YT_PLAYLIST_TIMEOUT_MS);

        proc.stdout!.on('data', (d: Buffer) => { stdoutChunks.push(d); });
        proc.stderr!.on('data', (d: Buffer) => { if (stderr.length < 10_000) stderr += d.toString(); });

        proc.on('close', (code) => {
            clearTimeout(timeout);
            if (code !== 0) {
                reject(new Error(`yt-dlp playlist failed (code ${code}): ${stderr}`));
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(stdoutChunks).toString()));
            } catch {
                reject(new Error('Failed to parse yt-dlp playlist JSON output'));
            }
        });

        proc.on('error', (err: Error) => {
            clearTimeout(timeout);
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
            const stream = createYtdlpStream(sanitizedUrl);
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

function createYtdlpStream(url: string): Readable {
    const cookieFlags = getAuthFlags();

    const ytdlpArgs = [
        url,
        '-f', 'ba[acodec=opus][abr<=128]/ba[acodec=vorbis][abr<=128]/ba[abr<=160]/ba',
        '-o', '-',
        '--no-warnings',
        '--no-check-certificates',
        ...cookieFlags,
    ];

    const ffmpegArgs = [
        '-i', 'pipe:0',
        '-analyzeduration', String(FFMPEG_ANALYZE_DURATION),
        '-probesize', String(FFMPEG_PROBE_SIZE),
        '-threads', String(FFMPEG_THREADS),
        '-loglevel', '0',
        '-f', 's16le',
        '-ar', '48000',
        '-ac', '2',
        'pipe:1',
    ];

    const ytdlpProc: ChildProcess = spawn(ytdlpBinary, ytdlpArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    const ffmpegProc: ChildProcess = spawn(ffmpegBinary, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

    ytdlpProc.stdout!.pipe(ffmpegProc.stdin!);

    const passThrough = new PassThrough({ highWaterMark: 128 * 1024 });
    ffmpegProc.stdout!.pipe(passThrough);

    let ytdlpStderr = '';
    const ffmpegStderrChunks: Buffer[] = [];

    ytdlpProc.stderr!.on('data', (d: Buffer) => {
        if (ytdlpStderr.length < 10_000) ytdlpStderr += d.toString();
    });
    ffmpegProc.stderr!.on('data', (d: Buffer) => {
        if (ffmpegStderrChunks.length < 20) ffmpegStderrChunks.push(d);
    });

    // Kill timeout: if FFmpeg produces no output within YT_STREAM_TIMEOUT_MS, abort
    let hasData = false;
    const startupTimeout = setTimeout(() => {
        if (!hasData) {
            ytdlpProc.kill('SIGKILL');
            ffmpegProc.kill('SIGKILL');
            passThrough.destroy(new Error(`Stream startup timed out after ${config.YT_STREAM_TIMEOUT_MS}ms`));
        }
    }, config.YT_STREAM_TIMEOUT_MS);
    startupTimeout.unref();

    ffmpegProc.stdout!.once('data', () => {
        hasData = true;
        clearTimeout(startupTimeout);
    });

    ytdlpProc.on('error', (err: Error) => {
        clearTimeout(startupTimeout);
        if (!ffmpegProc.killed) ffmpegProc.kill('SIGKILL');
        passThrough.destroy(new Error(`Failed to spawn yt-dlp (${ytdlpBinary}): ${err.message}`));
    });

    ffmpegProc.on('error', (err: Error) => {
        clearTimeout(startupTimeout);
        passThrough.destroy(err);
    });

    ffmpegProc.stdout!.on('error', (err: Error) => {
        passThrough.destroy(err);
    });

    ytdlpProc.on('close', (code) => {
        if (code !== 0) {
            logger.warn(`yt-dlp stream exited with code ${code}: ${ytdlpStderr.trim()}`);
            // Destroy stdin so FFmpeg gets EOF and exits cleanly rather than hanging
            if (!ffmpegProc.killed) {
                ffmpegProc.stdin?.destroy();
            }
        }
        // On success, pipe() already ended ffmpegProc.stdin
    });

    ffmpegProc.on('close', (code) => {
        clearTimeout(startupTimeout);
        if (code !== 0) {
            const stderr = Buffer.concat(ffmpegStderrChunks).toString().trim();
            passThrough.destroy(new Error(`ffmpeg exited with code ${code}: ${stderr || 'unknown error'}`));
            return;
        }
        passThrough.end();
    });

    passThrough.on('close', () => {
        if (!ytdlpProc.killed) ytdlpProc.kill('SIGKILL');
        if (!ffmpegProc.killed) ffmpegProc.kill('SIGKILL');
    });

    return passThrough;
}
