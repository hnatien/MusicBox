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
    const scale = 2; // Increase resolution for "Retina" look
    const baseWidth = 800;
    const width = baseWidth * scale;
    const padding = 45 * scale;
    const headerHeight = 160 * scale;
    const categorySpacing = 40 * scale;
    const rowHeight = 85 * scale; 
    const iconSize = 56 * scale;
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

    let baseTotalHeight = 160 + 45; // headerHeight + padding
    for (const cat of categories) {
        baseTotalHeight += 40; 
        baseTotalHeight += cat.commands.length * 85;
        baseTotalHeight += 40;
    }
    const totalHeight = baseTotalHeight * scale;

    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    // High quality settings
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.fillStyle = '#1C1C1E'; 
    ctx.fillRect(0, 0, width, totalHeight);

    ctx.fillStyle = '#FF2D55';
    ctx.beginPath();
    ctx.roundRect(padding + 5 * scale, padding + 10 * scale, 80 * scale, 80 * scale, 18 * scale);
    ctx.fill();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `600 ${44 * scale}px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('♫', padding + 45 * scale, padding + 68 * scale);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 ${48 * scale}px ${fontStack}`;
    ctx.fillText('MusicBox', padding + 105 * scale, padding + 48 * scale);
    
    ctx.fillStyle = '#8E8E93';
    ctx.font = `500 ${24 * scale}px ${fontStack}`;
    ctx.fillText('All commands', padding + 105 * scale, padding + 85 * scale);

    let currentY = headerHeight;

    for (const category of categories) {
        ctx.fillStyle = '#8E8E93';
        ctx.font = `700 ${20 * scale}px ${fontStack}`;
        ctx.fillText(category.name.toUpperCase(), padding + 5 * scale, currentY);
        currentY += 45 * scale;

        for (const cmd of category.commands) {
            const rowX = padding;
            const rowY = currentY;

            ctx.fillStyle = cmd.color || '#2C2C2E';
            ctx.beginPath();
            ctx.roundRect(rowX, rowY, iconSize, iconSize, 14 * scale);
            ctx.fill();

            if (cmd.emojiId && emojiCache.has(cmd.emojiId)) {
                const img = emojiCache.get(cmd.emojiId)!;
                const imgP = 10 * scale;
                ctx.drawImage(img, rowX + imgP, rowY + imgP, iconSize - imgP * 2, iconSize - imgP * 2);
            } else {
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `${30 * scale}px ${fontStack}`;
                ctx.textAlign = 'center';
                ctx.fillText(cmd.icon || '♫', rowX + iconSize/2, rowY + iconSize/2 + 10 * scale);
                ctx.textAlign = 'left';
            }

            ctx.fillStyle = '#FFFFFF';
            ctx.font = `700 ${28 * scale}px ${fontStack}`;
            ctx.fillText(`/${cmd.name}`, rowX + 80 * scale, rowY + 30 * scale);

            if (cmd.args) {
                const nW = ctx.measureText(`/${cmd.name}`).width;
                ctx.fillStyle = '#3A3A3C';
                ctx.beginPath();
                ctx.roundRect(rowX + 88 * scale + nW, rowY + 6 * scale, ctx.measureText(cmd.args).width + 16 * scale, 32 * scale, 8 * scale);
                ctx.fill();
                ctx.fillStyle = '#8E8E93';
                ctx.font = `700 ${18 * scale}px ${fontStack}`;
                ctx.fillText(cmd.args, rowX + 96 * scale + nW, rowY + 28 * scale);
            }

            ctx.fillStyle = '#8E8E93';
            ctx.font = `500 ${22 * scale}px ${fontStack}`;
            ctx.fillText(cmd.description, rowX + 80 * scale, rowY + 62 * scale);

            ctx.strokeStyle = '#3A3A3C';
            ctx.lineWidth = 4 * scale;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(width - padding - 25 * scale, rowY + 18 * scale);
            ctx.lineTo(width - padding - 10 * scale, rowY + 33 * scale);
            ctx.lineTo(width - padding - 25 * scale, rowY + 48 * scale);
            ctx.stroke();

            currentY += rowHeight;
        }
        currentY += categorySpacing;
    }

    return canvas.toBuffer('image/png' as any);
}
