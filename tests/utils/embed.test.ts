import { describe, it, expect } from 'vitest';
import {
    createNowPlayingEmbed,
    createSongAddedEmbed,
    createPlaylistAddedEmbed,
    createMixStartedEmbed,
    createSearchEmbed,
    createQueueEmbed,
    createErrorEmbed,
    createSuccessEmbed,
} from '../../src/utils/embed.js';
import { COLORS, EMOJIS } from '../../src/utils/constants.js';
import type { Song } from '../../src/models/song.js';

const mockSong: Song = {
    title: 'Test Song',
    url: 'https://www.youtube.com/watch?v=test',
    duration: 240,
    durationFormatted: '4:00',
    thumbnail: 'https://img.youtube.com/vi/test/0.jpg',
    channelName: 'Test Channel',
    requestedBy: '123456789',
};

describe('createNowPlayingEmbed', () => {
    it('has correct color and title', () => {
        const embed = createNowPlayingEmbed(mockSong, 0);
        const json = embed.toJSON();

        expect(json.color).toBe(COLORS.NOW_PLAYING);
        expect(json.title).toContain('Now Playing');
    });

    it('contains song title as link', () => {
        const embed = createNowPlayingEmbed(mockSong, 0);
        const json = embed.toJSON();

        expect(json.description).toContain(`[${mockSong.title}](${mockSong.url})`);
    });

    it('contains channel name', () => {
        const embed = createNowPlayingEmbed(mockSong, 0);
        const json = embed.toJSON();

        expect(json.description).toContain(mockSong.channelName);
    });

    it('contains progress bar and time display', () => {
        const embed = createNowPlayingEmbed(mockSong, 60);
        const json = embed.toJSON();

        expect(json.description).toContain('🔘');
        expect(json.description).toContain('1:00 / 4:00');
    });

    it('contains requester mention', () => {
        const embed = createNowPlayingEmbed(mockSong, 0);
        const json = embed.toJSON();

        expect(json.description).toContain(`<@${mockSong.requestedBy}>`);
    });

    it('sets thumbnail', () => {
        const embed = createNowPlayingEmbed(mockSong, 0);
        const json = embed.toJSON();

        expect(json.thumbnail?.url).toBe(mockSong.thumbnail);
    });

    it('handles empty thumbnail', () => {
        const song = { ...mockSong, thumbnail: '' };
        const embed = createNowPlayingEmbed(song, 0);
        const json = embed.toJSON();

        expect(json.thumbnail).toBeUndefined();
    });

    it('shows "Paused" title when isPaused is true', () => {
        const embed = createNowPlayingEmbed(mockSong, 0, true);
        const json = embed.toJSON();

        expect(json.title).toContain('Paused');
        expect(json.title).not.toContain('Now Playing');
    });

    it('shows "Now Playing" title when isPaused is false', () => {
        const embed = createNowPlayingEmbed(mockSong, 0, false);
        const json = embed.toJSON();

        expect(json.title).toContain('Now Playing');
    });
});

describe('createSongAddedEmbed', () => {
    it('has success color', () => {
        const embed = createSongAddedEmbed(mockSong, 3);
        const json = embed.toJSON();

        expect(json.color).toBe(COLORS.SUCCESS);
    });

    it('shows queue position', () => {
        const embed = createSongAddedEmbed(mockSong, 5);
        const json = embed.toJSON();

        expect(json.description).toContain('Position: **#5**');
    });

    it('contains song info', () => {
        const embed = createSongAddedEmbed(mockSong, 1);
        const json = embed.toJSON();

        expect(json.description).toContain(mockSong.title);
        expect(json.description).toContain(mockSong.channelName);
        expect(json.description).toContain(mockSong.durationFormatted);
    });
});

describe('createPlaylistAddedEmbed', () => {
    it('shows playlist title and count', () => {
        const embed = createPlaylistAddedEmbed('My Playlist', 25);
        const json = embed.toJSON();

        expect(json.color).toBe(COLORS.SUCCESS);
        expect(json.description).toContain('My Playlist');
        expect(json.description).toContain('25');
    });
});

describe('createMixStartedEmbed', () => {
    it('shows mix info and first song', () => {
        const embed = createMixStartedEmbed('My Mix', mockSong, 10);
        const json = embed.toJSON();

        expect(json.color).toBe(COLORS.NOW_PLAYING);
        expect(json.title).toContain('Mix Loaded');
        expect(json.description).toContain('My Mix');
        expect(json.description).toContain('10');
        expect(json.description).toContain(mockSong.title);
    });
});

describe('createSearchEmbed', () => {
    it('shows query in title', () => {
        const embed = createSearchEmbed('test query', [mockSong]);
        const json = embed.toJSON();

        expect(json.title).toContain('test query');
    });

    it('numbers results starting from 1', () => {
        const songs = [mockSong, { ...mockSong, title: 'Song 2' }];
        const embed = createSearchEmbed('query', songs);
        const json = embed.toJSON();

        expect(json.description).toContain('**1.**');
        expect(json.description).toContain('**2.**');
    });

    it('shows channel name and duration per result', () => {
        const embed = createSearchEmbed('query', [mockSong]);
        const json = embed.toJSON();

        expect(json.description).toContain(mockSong.channelName);
        expect(json.description).toContain(mockSong.durationFormatted);
    });

    it('has footer with select prompt', () => {
        const embed = createSearchEmbed('query', [mockSong]);
        const json = embed.toJSON();

        expect(json.footer?.text).toContain('Select a song');
    });
});

describe('createQueueEmbed', () => {
    it('shows current song when provided', () => {
        const embed = createQueueEmbed([], mockSong, 1, 1);
        const json = embed.toJSON();

        expect(json.description).toContain('Now Playing');
        expect(json.description).toContain(mockSong.title);
    });

    it('shows empty message when queue is empty', () => {
        const embed = createQueueEmbed([], null, 1, 1);
        const json = embed.toJSON();

        expect(json.description).toContain('Queue is empty');
        expect(json.description).toContain('/play');
    });

    it('numbers songs with correct offset', () => {
        const songs = [mockSong, { ...mockSong, title: 'Song 2' }];
        const embed = createQueueEmbed(songs, null, 2, 3);
        const json = embed.toJSON();

        // Page 2, offset = (2-1) * 10 = 10
        expect(json.description).toContain('`11.`');
        expect(json.description).toContain('`12.`');
    });

    it('shows page info in footer', () => {
        const embed = createQueueEmbed([mockSong], null, 2, 5, 42);
        const json = embed.toJSON();

        expect(json.footer?.text).toContain('Page 2/5');
        expect(json.footer?.text).toContain('42 song(s)');
    });

    it('uses songs.length when totalSongs not provided', () => {
        const embed = createQueueEmbed([mockSong], null, 1, 1);
        const json = embed.toJSON();

        expect(json.footer?.text).toContain('1 song(s)');
    });

    it('shows total duration in footer when provided', () => {
        const embed = createQueueEmbed([mockSong], null, 1, 1, 5, 3725);
        const json = embed.toJSON();

        expect(json.footer?.text).toContain('1h 2m');
    });

    it('omits total duration when not provided', () => {
        const embed = createQueueEmbed([mockSong], null, 1, 1, 5);
        const json = embed.toJSON();

        expect(json.footer?.text).not.toContain('h');
        expect(json.footer?.text).not.toContain('m');
    });
});

describe('createErrorEmbed', () => {
    it('has error color and emoji', () => {
        const embed = createErrorEmbed('Something went wrong');
        const json = embed.toJSON();

        expect(json.color).toBe(COLORS.ERROR);
        expect(json.description).toContain(EMOJIS.ERROR);
        expect(json.description).toContain('Something went wrong');
    });
});

describe('createSuccessEmbed', () => {
    it('has success color and emoji', () => {
        const embed = createSuccessEmbed('Done!');
        const json = embed.toJSON();

        expect(json.color).toBe(COLORS.SUCCESS);
        expect(json.description).toContain(EMOJIS.SUCCESS);
        expect(json.description).toContain('Done!');
    });
});
