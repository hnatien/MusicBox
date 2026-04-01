import { createClient } from 'redis';
import { logger } from '../core/logger.js';
import { config } from '../config/environment.js';

class RedisDatabase {
  private client;
  private connectPromise: Promise<void> | null = null;

  constructor() {
    logger.info(`Initializing Redis connection to: ${config.REDIS.HOST}:${config.REDIS.PORT}`);
    this.client = createClient({ 
      url: config.REDIS.URL,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error('Redis reconnection failed after 10 retries');
            return new Error('Redis reconnection failed');
          }
          const delay = Math.min(retries * 500, 5000);
          return delay;
        }
      }
    });

    this.client.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        logger.warn('Redis connection refused. Ensure Redis is running.');
      } else {
        logger.error('Redis Client Error', err);
      }
    });

    this.client.on('connect', () => {
      logger.info('Redis connection establishing...');
    });

    this.client.on('ready', () => {
      logger.info('Connected to Redis and ready to use');
    });

    this.client.on('end', () => {
      this.connectPromise = null;
    });
  }

  async connect() {
    if (this.client.isOpen) return;
    if (this.connectPromise) return this.connectPromise;

    this.connectPromise = this.client.connect().then(() => {}).catch((error: any) => {
      if (error.message !== 'Socket already opened') {
        logger.error('Failed to connect to Redis', { message: error.message });
      }
    }).finally(() => {
      this.connectPromise = null;
    });

    return this.connectPromise;
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.quit();
      logger.info('Redis connection closed gracefully');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      if (!this.client.isOpen) return false;
      await this.client.ping();
      return true;
    } catch {
      return false;
    }
  }

  async getSongsPlayed(): Promise<number> {
    try {
      await this.connect();
      if (!this.client.isOpen) return 0;
      
      const count = await this.client.get('totalSongsPlayed');
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      logger.error('Error fetching songs played from Redis', error);
      return 0;
    }
  }

  async incrementSongsPlayed(): Promise<void> {
    try {
      await this.connect();
      if (!this.client.isOpen) return;

      await this.client.incr('totalSongsPlayed');
    } catch (error) {
      logger.error('Error incrementing songs played in Redis', error);
    }
  }

  async setSession(sid: string, data: { userId: string; expiresAt: number }): Promise<void> {
    try {
      await this.connect();
      if (!this.client.isOpen) return;

      const ttl = Math.ceil((data.expiresAt - Date.now()) / 1000);
      if (ttl <= 0) return;

      await this.client.setEx(`session:${sid}`, ttl, JSON.stringify(data));
    } catch (error) {
      logger.error(`Error saving session ${sid} to Redis`, error);
    }
  }

  async getSession(sid: string): Promise<{ userId: string; expiresAt: number } | null> {
    try {
      await this.connect();
      if (!this.client.isOpen) return null;

      const data = await this.client.get(`session:${sid}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Error fetching session ${sid} from Redis`, error);
      return null;
    }
  }

  async deleteSession(sid: string): Promise<void> {
    try {
      await this.connect();
      if (!this.client.isOpen) return;

      await this.client.del(`session:${sid}`);
    } catch (error) {
      logger.error(`Error deleting session ${sid} from Redis`, error);
    }
  }
}

export const database = new RedisDatabase();
