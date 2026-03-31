import { createClient } from 'redis';
import { logger } from '../core/logger.js';

class RedisDatabase {
  private client;
  private isConnecting = false;

  constructor() {
    // Ưu tiên REDIS_URL trực tiếp
    let redisUrl = process.env.REDIS_URL;

    // Nếu REDIS_URL bị rỗng hoặc có định dạng lỗi từ Railway (ví dụ: redis://:@:)
    if (!redisUrl || redisUrl === 'redis://:@:' || redisUrl.includes('undefined')) {
      const host = process.env.REDISHOST || process.env.RAILWAY_PRIVATE_DOMAIN || 'localhost';
      const port = process.env.REDISPORT || '6379';
      const user = process.env.REDISUSER || 'default';
      const password = process.env.REDISPASSWORD || process.env.REDIS_PASSWORD || '';
      
      if (password) {
        // Xây dựng URL chuẩn: redis://user:password@host:port
        redisUrl = `redis://${user}:${password}@${host}:${port}`;
      } else {
        redisUrl = `redis://${host}:${port}`;
      }
    }

    logger.info(`Initializing Redis connection to: ${redisUrl.replace(/:[^:@]+@/, ':****@')}`);
    this.client = createClient({ url: redisUrl });

    this.client.on('error', (err) => {
      // Chỉ log lỗi nếu không phải là lỗi kết nối bình thường khi server chưa sẵn sàng
      if (err.code !== 'ECONNREFUSED') {
        logger.error('Redis Client Error', err);
      }
    });

    this.client.on('connect', () => {
      logger.info('Connected to Redis server');
    });

    this.client.on('end', () => {
      this.isConnecting = false;
    });
  }

  async connect() {
    if (this.client.isOpen) return;
    if (this.isConnecting) return;

    this.isConnecting = true;
    try {
      await this.client.connect();
    } catch (error: any) {
      if (error.message !== 'Socket already opened') {
        logger.error('Failed to connect to Redis', { message: error.message });
      }
    } finally {
      this.isConnecting = false;
    }
  }

  async getSongsPlayed(): Promise<number> {
    try {
      await this.connect();
      if (!this.client.isOpen) return 0;
      
      const count = await this.client.get('totalSongsPlayed');
      return count ? parseInt(count, 10) : 0;
    } catch (error) {
      return 0;
    }
  }

  async incrementSongsPlayed(): Promise<void> {
    try {
      await this.connect();
      if (!this.client.isOpen) return;

      await this.client.incr('totalSongsPlayed');
    } catch (error) {
      // Bỏ qua lỗi increment nếu Redis chưa sẵn sàng
    }
  }
}

export const database = new RedisDatabase();
