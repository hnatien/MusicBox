import ytdl from 'youtube-dl-exec';

const browser = process.env.MUSICBOX_COOKIE_BROWSER || 'brave';
const cookieFile = process.env.MUSICBOX_COOKIE_FILE || './secrets/youtube-cookies.txt';
const probeUrl = process.env.MUSICBOX_COOKIE_PROBE_URL || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

try {
    await ytdl(probeUrl, {
        skipDownload: true,
        noWarnings: true,
        dumpSingleJson: true,
        noPlaylist: true,
        ignoreNoFormatsError: true,
        extractorArgs: 'youtubetab:skip=authcheck',
        cookiesFromBrowser: browser,
        cookies: cookieFile,
    });
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exit(1);
}
