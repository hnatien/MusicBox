import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'node:crypto';
import { ActivityType } from 'discord.js';
import { logger } from '../core/logger.js';
import type { MusicClient } from '../core/client.js';
import { database } from './database.js';
import { getActiveQueueCount } from './queueManager.js';
import { config } from '../config/environment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatUptime(seconds: number): string {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function parseCookies(header: string): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of header.split(';')) {
        const eq = part.indexOf('=');
        if (eq < 0) continue;
        const k = part.slice(0, eq).trim();
        if (k) out[k] = part.slice(eq + 1).trim();
    }
    return out;
}

// ── Session utilities ────────────────────────────────────────────────────────────
const pendingStates = new Set<string>();

async function getAdminSession(req: express.Request): Promise<{ userId: string } | null> {
    const cookies = parseCookies(req.headers.cookie || '');
    const sid = cookies['mb_admin_sid'];
    if (!sid) return null;
    
    try {
        const session = await database.getSession(sid);
        if (!session || session.expiresAt < Date.now()) {
            if (session) await database.deleteSession(sid);
            return null;
        }
        return { userId: session.userId };
    } catch (error) {
        logger.error(`Error retrieving session ${sid} from DB:`, error);
        return null;
    }
}

async function requireAdminSession(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    const session = await getAdminSession(req);
    if (!session) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }
    next();
}

export function startWebServer(client: MusicClient) {
    const app = express();
    const port = process.env.PORT || 3000;
    const publicPath = path.join(__dirname, '../../public');

    const clientSecret = process.env.CLIENT_SECRET?.trim();
    const redirectUri = process.env.ADMIN_REDIRECT_URI?.trim();
    const oauthConfigured = !!(clientSecret && redirectUri);

    app.use(express.static(publicPath));
    app.use(express.json());

    // ── Public API ───────────────────────────────────────────────────────────
    app.get('/api/stats', async (req, res) => {
        try {
            const songsPlayed = await database.getSongsPlayed();
            const isDatabaseHealthy = await database.isHealthy();
            res.json({
                servers: client.guilds.cache.size,
                songsPlayed: songsPlayed || 0,
                uptime: '99.9',
                status: client.isLocked ? 'maintenance' : 'online',
                database: isDatabaseHealthy ? 'healthy' : 'disconnected',
            });
        } catch (error) {
            logger.error('Error fetching stats for API:', error);
            res.status(500).json({ error: 'Failed to fetch stats', servers: client.guilds.cache.size, songsPlayed: 0 });
        }
    });

    app.get('/health', async (req, res) => {
        try {
            const isDatabaseHealthy = await database.isHealthy();
            const status = {
                status: client.isLocked ? 'maintenance' : 'up',
                client: client.isReady() ? 'connected' : 'connecting',
                database: isDatabaseHealthy ? 'healthy' : 'disconnected',
                guilds: client.guilds.cache.size,
                timestamp: new Date().toISOString(),
            };
            res.status(client.isReady() && isDatabaseHealthy ? 200 : 503).json(status);
        } catch {
            res.status(500).json({ status: 'down', error: 'Health check failed' });
        }
    });

    // ── Discord OAuth ────────────────────────────────────────────────────────
    app.get('/admin/login', (req, res) => {
        if (!oauthConfigured) {
            res.redirect('/admin?error=not_configured');
            return;
        }
        const state = randomUUID();
        pendingStates.add(state);
        setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000);

        const params = new URLSearchParams({
            client_id: config.CLIENT_ID,
            redirect_uri: redirectUri!,
            response_type: 'code',
            scope: 'identify',
            state,
        });
        res.redirect(`https://discord.com/oauth2/authorize?${params}`);
    });

    app.get('/admin/callback', async (req, res) => {
        const code = String(req.query.code || '');
        const state = String(req.query.state || '');

        if (!code || !state || !pendingStates.has(state)) {
            res.redirect('/admin?error=invalid_state');
            return;
        }
        pendingStates.delete(state);

        try {
            const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: config.CLIENT_ID,
                    client_secret: clientSecret!,
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri!,
                }),
            });

            if (!tokenRes.ok) {
                res.redirect('/admin?error=token_exchange');
                return;
            }

            const tokenData = await tokenRes.json() as { access_token: string };

            const userRes = await fetch('https://discord.com/api/users/@me', {
                headers: { Authorization: `Bearer ${tokenData.access_token}` },
            });

            if (!userRes.ok) {
                res.redirect('/admin?error=user_fetch');
                return;
            }

            const user = await userRes.json() as { id: string; username: string; global_name?: string };

            if (!config.ADMIN_IDS.includes(user.id)) {
                res.redirect('/admin?error=unauthorized');
                return;
            }

            const sid = randomUUID();
            const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
            await database.setSession(sid, { userId: user.id, expiresAt });

            res.cookie('mb_admin_sid', sid, {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                maxAge: 86400 * 1000,
                secure: process.env.NODE_ENV === 'production',
            });

            logger.info(`Admin panel login: ${user.global_name ?? user.username} (${user.id})`);
            res.redirect('/admin');
        } catch (error) {
            logger.error('OAuth callback error:', error);
            res.redirect('/admin?error=server_error');
        }
    });

    app.get('/admin/logout', async (req, res) => {
        const cookies = parseCookies(req.headers.cookie || '');
        const sid = cookies['mb_admin_sid'];
        if (sid) await database.deleteSession(sid).catch(() => {});
        res.clearCookie('mb_admin_sid', { path: '/' });
        res.redirect('/admin');
    });

    // ── Admin API ────────────────────────────────────────────────────────────
    app.get('/api/admin/stats', async (req, res) => {
        const session = await getAdminSession(req);
        if (!session) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        try {
            const songsPlayed = await database.getSongsPlayed();
            const isDatabaseHealthy = await database.isHealthy();
            res.json({
                servers: client.guilds.cache.size,
                songsPlayed: songsPlayed || 0,
                activeQueues: getActiveQueueCount(),
                maintenance: client.isLocked,
                clientReady: client.isReady(),
                database: isDatabaseHealthy ? 'healthy' : 'disconnected',
                uptime: formatUptime(process.uptime()),
            });
        } catch (error) {
            logger.error('Error fetching admin stats:', error);
            res.status(500).json({ error: 'Failed to fetch stats' });
        }
    });

    app.post('/api/admin/maintenance', async (req, res) => {
        const session = await getAdminSession(req);
        if (!session) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }

        const { enabled } = req.body as { enabled: unknown };
        if (typeof enabled !== 'boolean') {
            res.status(400).json({ error: 'enabled must be boolean' });
            return;
        }
        client.isLocked = enabled;
        if (enabled) {
            client.user?.setPresence({
                activities: [{ name: '!under maintenance! | back soon', type: ActivityType.Playing }],
                status: 'dnd',
            });
        } else {
            client.updatePresence();
        }
        logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'} via admin panel`);
        res.json({ maintenance: client.isLocked });
    });

    // ── Pages ────────────────────────────────────────────────────────────────
    app.get('/admin', (req, res) => {
        res.sendFile(path.join(publicPath, 'admin.html'));
    });

    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    app.listen(port, () => {
        logger.info(`🌐 [Web] Website đang chạy tại: http://localhost:${port}`);
    });
}
