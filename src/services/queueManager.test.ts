import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@discordjs/voice', () => ({
  createAudioPlayer: vi.fn(() => ({
    stop: vi.fn(),
  })),
  NoSubscriberBehavior: { Play: 'play' },
}));

vi.mock('../core/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../config/environment.js', () => ({
  config: { MAX_QUEUE_SIZE: 3 },
}));

import type { VoiceConnection } from '@discordjs/voice';
import {
  getQueue,
  hasQueue,
  createQueue,
  deleteQueue,
  addSong,
  getNextSong,
  clearQueue,
  getQueueSize,
  setMixContext,
  getNextMixSong,
  getActiveQueueCount,
  clearMixContext,
} from './queueManager.js';
import type { Song } from '../models/song.js';

// Minimal mock objects
function makeConnection() {
  return { subscribe: vi.fn(), destroy: vi.fn() } as unknown as VoiceConnection;
}

function makeSong(title = 'Test Song'): Song {
  return {
    title,
    url: 'https://youtu.be/test',
    duration: 180,
    durationFormatted: '3:00',
    thumbnail: 'https://img.youtube.com/test.jpg',
    channelName: 'Test Channel',
    requestedBy: 'user-123',
  };
}

const GUILD = 'guild-test';

beforeEach(() => {
  // Ensure clean state before each test
  deleteQueue(GUILD);
});

afterEach(() => {
  deleteQueue(GUILD);
});

describe('hasQueue / getQueue', () => {
  it('returns false and undefined for unknown guild', () => {
    expect(hasQueue(GUILD)).toBe(false);
    expect(getQueue(GUILD)).toBeUndefined();
  });

  it('returns true and the queue after createQueue', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    expect(hasQueue(GUILD)).toBe(true);
    expect(getQueue(GUILD)).toBeDefined();
  });
});

describe('createQueue', () => {
  it('initialises queue with default values', () => {
    const conn = makeConnection();
    const queue = createQueue(GUILD, {
      textChannelId: 'ch',
      voiceChannelId: 'vc',
      connection: conn,
    });

    expect(queue.songs).toEqual([]);
    expect(queue.currentSong).toBeNull();
    expect(queue.isPlaying).toBe(false);
    expect(queue.isPaused).toBe(false);
    expect(queue.repeatMode).toBe('off');
    expect(queue.repeatCount).toBe(0);
    expect(queue.inactivityTimer).toBeNull();
  });

  it('subscribes the connection to the player', () => {
    const conn = makeConnection();
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: conn });
    expect(conn.subscribe).toHaveBeenCalledOnce();
  });
});

describe('deleteQueue', () => {
  it('is a no-op for unknown guild', () => {
    expect(() => deleteQueue('unknown-guild')).not.toThrow();
  });

  it('removes the queue so hasQueue returns false', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    deleteQueue(GUILD);
    expect(hasQueue(GUILD)).toBe(false);
  });

  it('calls connection.destroy()', () => {
    const conn = makeConnection();
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: conn });
    deleteQueue(GUILD);
    expect(conn.destroy).toHaveBeenCalledOnce();
  });

  it('clears inactivity timer if set', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    const queue = getQueue(GUILD)!;
    const timer = setTimeout(() => {}, 99999);
    queue.inactivityTimer = timer;
    expect(() => deleteQueue(GUILD)).not.toThrow();
  });

  it('clears progressInterval if set', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    const queue = getQueue(GUILD)!;
    queue.progressInterval = setInterval(() => {}, 99999);
    expect(() => deleteQueue(GUILD)).not.toThrow();
  });
});

describe('addSong', () => {
  beforeEach(() => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
  });

  it('throws when no queue exists', () => {
    expect(() => addSong('no-such-guild', makeSong())).toThrow('No queue exists');
  });

  it('returns 0 when queue is empty (first song plays immediately)', () => {
    expect(addSong(GUILD, makeSong())).toBe(0);
  });

  it('returns queue position for subsequent songs', () => {
    addSong(GUILD, makeSong('Song 1'));
    expect(addSong(GUILD, makeSong('Song 2'))).toBe(2);
  });

  it('throws when queue is full (MAX_QUEUE_SIZE = 3)', () => {
    addSong(GUILD, makeSong('1'));
    addSong(GUILD, makeSong('2'));
    addSong(GUILD, makeSong('3'));
    expect(() => addSong(GUILD, makeSong('4'))).toThrow('Queue is full');
  });
});

describe('getNextSong', () => {
  it('returns undefined for unknown guild', () => {
    expect(getNextSong('no-such-guild')).toBeUndefined();
  });

  it('returns and removes the first song in the queue', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    addSong(GUILD, makeSong('Song 1'));
    addSong(GUILD, makeSong('Song 2'));

    const next = getNextSong(GUILD);
    expect(next?.title).toBe('Song 1');
    expect(getQueueSize(GUILD)).toBe(1);
  });

  it('returns undefined when queue is empty', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    expect(getNextSong(GUILD)).toBeUndefined();
  });
});

describe('clearQueue', () => {
  it('is a no-op for unknown guild', () => {
    expect(() => clearQueue('no-such-guild')).not.toThrow();
  });

  it('clears progressInterval if set', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    const queue = getQueue(GUILD)!;
    queue.progressInterval = setInterval(() => {}, 99999);
    clearQueue(GUILD);
    expect(queue.progressInterval).toBeUndefined();
  });

  it('empties songs array and resets playback state', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    addSong(GUILD, makeSong('Song 1'));
    const queue = getQueue(GUILD)!;
    queue.isPlaying = true;
    queue.isPaused = true;

    clearQueue(GUILD);

    expect(queue.songs).toEqual([]);
    expect(queue.currentSong).toBeNull();
    expect(queue.isPlaying).toBe(false);
    expect(queue.isPaused).toBe(false);
    expect(queue.mixContext).toBeUndefined();
  });
});

describe('getQueueSize', () => {
  it('returns 0 for unknown guild', () => {
    expect(getQueueSize('no-such-guild')).toBe(0);
  });

  it('returns correct count after adding songs', () => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    addSong(GUILD, makeSong('1'));
    addSong(GUILD, makeSong('2'));
    expect(getQueueSize(GUILD)).toBe(2);
  });
});

describe('getActiveQueueCount', () => {
  it('reflects the number of active queues', () => {
    const before = getActiveQueueCount();
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
    expect(getActiveQueueCount()).toBe(before + 1);
    deleteQueue(GUILD);
    expect(getActiveQueueCount()).toBe(before);
  });
});

describe('mix context', () => {
  beforeEach(() => {
    createQueue(GUILD, { textChannelId: 'ch', voiceChannelId: 'vc', connection: makeConnection() });
  });

  it('setMixContext is a no-op for unknown guild', () => {
    expect(() => setMixContext('no-such-guild', [makeSong()], 'title')).not.toThrow();
  });

  it('getNextMixSong returns undefined when no mix context', () => {
    expect(getNextMixSong(GUILD)).toBeUndefined();
  });

  it('getNextMixSong returns songs in order', () => {
    const songs = [makeSong('A'), makeSong('B'), makeSong('C')];
    setMixContext(GUILD, songs, 'Mix Title');

    expect(getNextMixSong(GUILD)?.title).toBe('A');
    expect(getNextMixSong(GUILD)?.title).toBe('B');
    expect(getNextMixSong(GUILD)?.title).toBe('C');
  });

  it('returns undefined and clears context after exhausting mix', () => {
    setMixContext(GUILD, [makeSong('Only')], 'Mix');
    getNextMixSong(GUILD); // consume the only song
    expect(getNextMixSong(GUILD)).toBeUndefined();
    expect(getQueue(GUILD)?.mixContext).toBeUndefined();
  });

  it('clearMixContext removes mix context', () => {
    setMixContext(GUILD, [makeSong()], 'Mix');
    clearMixContext(GUILD);
    expect(getQueue(GUILD)?.mixContext).toBeUndefined();
  });

  it('clearMixContext is a no-op for unknown guild', () => {
    expect(() => clearMixContext('no-such-guild')).not.toThrow();
  });
});
