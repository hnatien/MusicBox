import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoisted mock state so it can be referenced inside vi.mock factories
const mockClient = vi.hoisted(() => ({
  isOpen: true as boolean,
  connect: vi.fn().mockResolvedValue(undefined),
  quit: vi.fn().mockResolvedValue(undefined),
  ping: vi.fn().mockResolvedValue('PONG'),
  get: vi.fn().mockResolvedValue(null),
  incr: vi.fn().mockResolvedValue(1),
  setEx: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  on: vi.fn().mockReturnThis(),
}));

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockClient),
}));

vi.mock('../core/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../config/environment.js', () => ({
  config: {
    REDIS: { HOST: 'localhost', PORT: 6379, URL: 'redis://localhost:6379' },
  },
}));

// Import after mocks are registered
import { database } from './database.js';

beforeEach(() => {
  vi.clearAllMocks();
  mockClient.isOpen = true;
});

describe('isHealthy', () => {
  it('returns true when client is open and ping succeeds', async () => {
    mockClient.isOpen = true;
    mockClient.ping.mockResolvedValueOnce('PONG');
    expect(await database.isHealthy()).toBe(true);
  });

  it('returns false when client is closed', async () => {
    mockClient.isOpen = false;
    expect(await database.isHealthy()).toBe(false);
  });

  it('returns false when ping throws', async () => {
    mockClient.isOpen = true;
    mockClient.ping.mockRejectedValueOnce(new Error('Connection lost'));
    expect(await database.isHealthy()).toBe(false);
  });
});

describe('disconnect', () => {
  it('calls quit when client is open', async () => {
    mockClient.isOpen = true;
    await database.disconnect();
    expect(mockClient.quit).toHaveBeenCalledOnce();
  });

  it('skips quit when client is already closed', async () => {
    mockClient.isOpen = false;
    await database.disconnect();
    expect(mockClient.quit).not.toHaveBeenCalled();
  });
});

describe('getSongsPlayed', () => {
  it('returns parsed count from Redis', async () => {
    mockClient.get.mockResolvedValueOnce('42');
    expect(await database.getSongsPlayed()).toBe(42);
  });

  it('returns 0 when key does not exist', async () => {
    mockClient.get.mockResolvedValueOnce(null);
    expect(await database.getSongsPlayed()).toBe(0);
  });

  it('returns 0 when client is closed', async () => {
    mockClient.isOpen = false;
    expect(await database.getSongsPlayed()).toBe(0);
  });

  it('returns 0 on Redis error', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('Redis error'));
    expect(await database.getSongsPlayed()).toBe(0);
  });
});

describe('incrementSongsPlayed', () => {
  it('calls incr on totalSongsPlayed', async () => {
    await database.incrementSongsPlayed();
    expect(mockClient.incr).toHaveBeenCalledWith('totalSongsPlayed');
  });

  it('skips incr when client is closed', async () => {
    mockClient.isOpen = false;
    await database.incrementSongsPlayed();
    expect(mockClient.incr).not.toHaveBeenCalled();
  });
});

describe('setSession', () => {
  it('stores session with correct TTL', async () => {
    const now = Date.now();
    const expiresAt = now + 60_000; // 60 seconds from now
    await database.setSession('sid-1', { userId: 'u1', expiresAt });

    expect(mockClient.setEx).toHaveBeenCalledOnce();
    const [key, ttl, value] = mockClient.setEx.mock.calls[0];
    expect(key).toBe('session:sid-1');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(60);
    expect(JSON.parse(value)).toMatchObject({ userId: 'u1' });
  });

  it('skips storage when session is already expired', async () => {
    await database.setSession('sid-expired', { userId: 'u1', expiresAt: Date.now() - 1000 });
    expect(mockClient.setEx).not.toHaveBeenCalled();
  });

  it('skips storage when client is closed', async () => {
    mockClient.isOpen = false;
    await database.setSession('sid-1', { userId: 'u1', expiresAt: Date.now() + 60_000 });
    expect(mockClient.setEx).not.toHaveBeenCalled();
  });
});

describe('getSession', () => {
  it('returns parsed session data when found', async () => {
    const data = { userId: 'u1', expiresAt: Date.now() + 60_000 };
    mockClient.get.mockResolvedValueOnce(JSON.stringify(data));

    const result = await database.getSession('sid-1');
    expect(result).toMatchObject({ userId: 'u1' });
  });

  it('returns null when session does not exist', async () => {
    mockClient.get.mockResolvedValueOnce(null);
    expect(await database.getSession('sid-missing')).toBeNull();
  });

  it('returns null when client is closed', async () => {
    mockClient.isOpen = false;
    expect(await database.getSession('sid-1')).toBeNull();
  });

  it('returns null on Redis error', async () => {
    mockClient.get.mockRejectedValueOnce(new Error('Redis error'));
    expect(await database.getSession('sid-err')).toBeNull();
  });
});

describe('deleteSession', () => {
  it('calls del with correct key', async () => {
    await database.deleteSession('sid-1');
    expect(mockClient.del).toHaveBeenCalledWith('session:sid-1');
  });

  it('skips del when client is closed', async () => {
    mockClient.isOpen = false;
    await database.deleteSession('sid-1');
    expect(mockClient.del).not.toHaveBeenCalled();
  });

  it('does not throw on Redis error', async () => {
    mockClient.del.mockRejectedValueOnce(new Error('Redis error'));
    await expect(database.deleteSession('sid-err')).resolves.toBeUndefined();
  });
});

describe('connect (internal path)', () => {
  it('calls client.connect() when client is not open', async () => {
    mockClient.isOpen = false;
    mockClient.connect.mockResolvedValueOnce(undefined);
    await database.getSongsPlayed();
    expect(mockClient.connect).toHaveBeenCalled();
  });

  it('handles a connect() rejection without throwing', async () => {
    mockClient.isOpen = false;
    mockClient.connect.mockRejectedValueOnce(new Error('Connection failed'));
    await expect(database.getSongsPlayed()).resolves.toBe(0);
  });
});

describe('incrementSongsPlayed error path', () => {
  it('does not throw when incr fails', async () => {
    mockClient.incr.mockRejectedValueOnce(new Error('Redis error'));
    await expect(database.incrementSongsPlayed()).resolves.toBeUndefined();
  });
});

describe('setSession error path', () => {
  it('does not throw when setEx fails', async () => {
    mockClient.setEx.mockRejectedValueOnce(new Error('Redis error'));
    const expiresAt = Date.now() + 60_000;
    await expect(
      database.setSession('sid-err', { userId: 'u1', expiresAt }),
    ).resolves.toBeUndefined();
  });
});
