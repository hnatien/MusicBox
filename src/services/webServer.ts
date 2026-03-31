import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../core/logger.js';
import type { MusicClient } from '../core/client.js';
import { database } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startWebServer(client: MusicClient) {
    const app = express();
    const port = process.env.PORT || 3000;

    const publicPath = path.join(__dirname, '../../public');
    
    app.use(express.static(publicPath));

    app.get('/api/stats', async (req, res) => {
        try {
            const songsPlayed = await database.getSongsPlayed();
            const isDatabaseHealthy = await database.isHealthy();
            
            res.json({
                servers: client.guilds.cache.size,
                songsPlayed: songsPlayed || 0,
                uptime: '99.9',
                status: 'online',
                database: isDatabaseHealthy ? 'healthy' : 'disconnected'
            });
        } catch (error) {
            logger.error('Error fetching stats for API:', error);
            res.status(500).json({ 
                error: 'Failed to fetch stats',
                servers: client.guilds.cache.size,
                songsPlayed: 0
            });
        }
    });

    app.get('/health', async (req, res) => {
        try {
            const isDatabaseHealthy = await database.isHealthy();
            const status = {
                status: 'up',
                client: client.isReady() ? 'connected' : 'connecting',
                database: isDatabaseHealthy ? 'healthy' : 'disconnected',
                guilds: client.guilds.cache.size,
                timestamp: new Date().toISOString()
            };

            const httpStatus = (client.isReady() && isDatabaseHealthy) ? 200 : 503;
            res.status(httpStatus).json(status);
        } catch (error) {
            res.status(500).json({ status: 'down', error: 'Health check failed' });
        }
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    app.listen(port, () => {
        logger.info(`🌐 [Web] Website đang chạy tại: http://localhost:${port}`);
    });
}
