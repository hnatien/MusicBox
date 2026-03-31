import { createClient } from 'redis';
import { logger } from '../core/logger.js';

class RedisDatabase {
  private client;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.client.on('error', (err) => logger.error('Redis Client Error', err));
    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Connected to Redis server');
    });
  }

  async connect() {
    if (!this.isConnected) {
      try {
        await this.client.connect();
      } catch (error) {
        logger.error('Failed to connect to Redis', { error });
      }
    }
  }

  async getSongsPlayed(): Promise<number> {
    try {
      await this.connect();
      const count = await this.client.get('totalSongsPlayed');
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Failed to get songs played from Redis', { error });
      return 0;
    }
  }

  async incrementSongsPlayed(): Promise<void> {
    try {
      await this.connect();
      await this.client.incr('totalSongsPlayed');
    } catch (error) {
      logger.error('Failed to increment songs played in Redis', { error });
    }
  }
}

export const database = new RedisDatabase();
