import type { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import type { Message } from 'discord.js';
import type { Readable } from 'node:stream';
import type { Song } from './song.js';

export interface GuildQueue {
    textChannelId: string;
    voiceChannelId: string;
    connection: VoiceConnection;
    player: AudioPlayer;
    songs: Song[];
    currentSong: Song | null;
    volume: number;
    isPlaying: boolean;
    isPaused: boolean;
    playStartTime: number | null;
    inactivityTimer: ReturnType<typeof setTimeout> | null;
    nowPlayingMessage?: Message;
    progressInterval?: ReturnType<typeof setInterval>;
    repeatMode: 'off' | 'one' | 'all';
    repeatCount: number;
    activeStream?: Readable;
    mixContext?: {
        songs: Song[];
        index: number;
        title: string;
    };
}
