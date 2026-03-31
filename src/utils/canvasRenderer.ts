import { createCanvas, Path2D, GlobalFonts } from '@napi-rs/canvas';
import { COLORS } from './constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontPath = path.join(__dirname, '../../assets/fonts/Inter.ttf');

// Đăng ký font Inter với các trọng số khác nhau
try {
    GlobalFonts.registerFromPath(fontPath, 'Inter');
} catch (e) {
    console.warn('Could not register Inter font from path, falling back to system sans-serif');
}

interface HelpCommand {
    name: string;
    description: string;
    icon?: string;
    args?: string;
    color?: string; // Icon background color
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

    // Calculate dynamic height
    let totalHeight = headerHeight + padding;
    for (const cat of categories) {
        totalHeight += 40; // Category title
        totalHeight += cat.commands.length * rowHeight;
        totalHeight += categorySpacing;
    }

    const canvas = createCanvas(width, totalHeight);
    const ctx = canvas.getContext('2d');

    // 1. Background (Apple Dark Mode Style)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, totalHeight);

    // Rounded background for the whole list
    ctx.fillStyle = '#1C1C1E';
    ctx.beginPath();
    ctx.roundRect(20, 20, width - 40, totalHeight - 40, 36);
    ctx.fill();

    // 2. Header
    // Icon (Mocked Music Icon)
    ctx.fillStyle = '#2C2C2E';
    ctx.beginPath();
    ctx.roundRect(padding + 5, padding + 10, 80, 80, 18);
    ctx.fill();
    
    // Draw a simple musical note ♫
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `44px ${fontStack}`;
    ctx.textAlign = 'center';
    ctx.fillText('♫', padding + 45, padding + 65);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 48px ${fontStack}`;
    ctx.fillText('MusicBox', padding + 105, padding + 48);
    
    ctx.fillStyle = '#8E8E93';
    ctx.font = `500 24px ${fontStack}`;
    ctx.fillText('All commands', padding + 105, padding + 85);

    let currentY = headerHeight;

    // 3. Render Categories
    for (const category of categories) {
        // Category Header
        ctx.fillStyle = '#8E8E93';
        ctx.font = `700 20px ${fontStack}`;
        ctx.fillText(category.name.toUpperCase(), padding + 5, currentY);
        currentY += 45;

        // Command Rows
        for (const cmd of category.commands) {
            const rowX = padding;
            const rowY = currentY;

            // Icon background (Rounded Square)
            ctx.fillStyle = cmd.color || '#2C2C2E';
            ctx.beginPath();
            ctx.roundRect(rowX, rowY, iconSize, iconSize, 14);
            ctx.fill();

            // Render Icon (SF Symbol like)
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `30px ${fontStack}`;
            ctx.textAlign = 'center';
            ctx.fillText(cmd.icon || '􀑪', rowX + iconSize/2, rowY + iconSize/2 + 10);
            ctx.textAlign = 'left';

            // Slash Command Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `700 28px ${fontStack}`;
            ctx.fillText(`/${cmd.name}`, rowX + 80, rowY + 30);

            // Args (if any)
            if (cmd.args) {
                const nameWidth = ctx.measureText(`/${cmd.name}`).width;
                ctx.fillStyle = '#3A3A3C';
                ctx.beginPath();
                ctx.roundRect(rowX + 88 + nameWidth, rowY + 6, ctx.measureText(cmd.args).width + 16, 32, 8);
                ctx.fill();
                
                ctx.fillStyle = '#8E8E93';
                ctx.font = `700 18px ${fontStack}`;
                ctx.fillText(cmd.args, rowX + 96 + nameWidth, rowY + 28);
            }

            // Description
            ctx.fillStyle = '#8E8E93';
            ctx.font = `500 22px ${fontStack}`;
            ctx.fillText(cmd.description, rowX + 80, rowY + 62);

            // Arrow on the right
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
