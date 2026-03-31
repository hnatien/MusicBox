import { createCanvas, GlobalFonts, loadImage, type Image } from '@napi-rs/canvas';
import { getEmojiUrl } from './constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontPath = path.join(__dirname, '../../assets/fonts/Inter.ttf');

try {
    GlobalFonts.registerFromPath(fontPath, 'Inter');
} catch (e) {
    console.warn('Font registration failed', e);
}

interface HelpCommand {
    name: string;
    description: string;
    icon?: string;
    emojiId?: string;
    args?: string;
    color?: string;
}

interface HelpCategory {
    name: string;
    commands: HelpCommand[];
}

export async function renderHelpImage(categories: HelpCategory[]): Promise<Buffer> {
    const width = 800;
    const padding = 45;
    const headerHeight = 160;
    const categorySpacing = 40;
    const rowHeight = 85; 
    const iconSize = 56;
    const fontStack = '"Inter", sans-serif';

    const emojiCache = new Map<string, Image>();
    for (const cat of categories) {
        for (const cmd of cat.commands) {
            if (cmd.emojiId && !emojiCache.has(cmd.emojiId)) {
                try {
                    const img = await loadImage(getEmojiUrl(cmd.emojiId));
                    emojiCache.set(cmd.emojiId, img);
                } catch (e) {
                    console.warn(`Failed to load emoji ${cmd.emojiId}`);
                }
            }
        }
    }

    let totalHeight = headerHeight + padding;
    for (const cat of categories) {
        totalHeight += 40; 
        totalHeight += cat.commands.length * rowHeight;
        totalHeight += categorySpacing;
    }

    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#1C1C1E'; 
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.fillStyle = '#FF2D55';
    ctx.beginPath();
    ctx.roundRect(padding + 5, padding + 10, 80, 80, 18);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 44px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('♫', padding + 45, padding + 68);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 48px ${fontStack}`;
    ctx.fillText('MusicBox', padding + 105, padding + 48);
    
    ctx.fillStyle = '#8E8E93';
    ctx.font = `500 24px ${fontStack}`;
    ctx.fillText('All commands', padding + 105, padding + 85);

    let currentY = headerHeight;

    for (const category of categories) {
        ctx.fillStyle = '#8E8E93';
        ctx.font = `700 20px ${fontStack}`;
        ctx.fillText(category.name.toUpperCase(), padding + 5, currentY);
        currentY += 45;

        for (const cmd of category.commands) {
            const rowX = padding;
            const rowY = currentY;

            ctx.fillStyle = cmd.color || '#2C2C2E';
            ctx.beginPath();
            ctx.roundRect(rowX, rowY, iconSize, iconSize, 14);
            ctx.fill();

            if (cmd.emojiId && emojiCache.has(cmd.emojiId)) {
                const img = emojiCache.get(cmd.emojiId)!;
                const imgP = 10;
                ctx.drawImage(img, rowX + imgP, rowY + imgP, iconSize - imgP * 2, iconSize - imgP * 2);
            } else {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `30px ${fontStack}`;
                ctx.textAlign = 'center';
                ctx.fillText(cmd.icon || '♫', rowX + iconSize/2, rowY + iconSize/2 + 10);
                ctx.textAlign = 'left';
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `700 28px ${fontStack}`;
            ctx.fillText(`/${cmd.name}`, rowX + 80, rowY + 30);

            if (cmd.args) {
                const nW = ctx.measureText(`/${cmd.name}`).width;
                ctx.fillStyle = '#3A3A3C';
                ctx.beginPath();
                ctx.roundRect(rowX + 88 + nW, rowY + 6, ctx.measureText(cmd.args).width + 16, 32, 8);
                ctx.fill();
                ctx.fillStyle = '#8E8E93';
                ctx.font = `700 18px ${fontStack}`;
                ctx.fillText(cmd.args, rowX + 96 + nW, rowY + 28);
            }

            ctx.fillStyle = '#8E8E93';
            ctx.font = `500 22px ${fontStack}`;
            ctx.fillText(cmd.description, rowX + 80, rowY + 62);

            ctx.strokeStyle = '#3A3A3C';
            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(width - padding - 25, rowY + 18);
            ctx.lineTo(width - padding - 10, rowY + 33);
            ctx.lineTo(width - padding - 25, rowY + 48);
            ctx.stroke();

            currentY += rowHeight;
        }
        currentY += categorySpacing;
    }

    return canvas.toBuffer('image/png');
}
