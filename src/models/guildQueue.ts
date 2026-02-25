import type { AudioPlayer, VoiceConnection } from '@discordjs/voice';
import type { Message } from 'discord.js';
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
    mixContext?: {
        songs: Song[];
        index: number;
        title: string;
    };
}
