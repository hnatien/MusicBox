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

    // API endpoint để lấy dữ liệu thực từ database cục bộ
    app.get('/api/stats', async (req, res) => {
        try {
            const songsPlayed = await database.getSongsPlayed();
            res.json({
                servers: client.guilds.cache.size,
                songsPlayed: songsPlayed,
                uptime: '99.9%' 
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    app.listen(port, () => {
        logger.info(`🌐 [Web] Website đang chạy tại: http://localhost:${port}`);
    });
}
