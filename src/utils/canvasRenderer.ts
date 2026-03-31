import { createCanvas, Path2D, GlobalFonts } from '@napi-rs/canvas';
import { COLORS } from './constants.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontPath = path.join(__dirname, '../../assets/fonts/Inter.ttf');

// Đăng ký font Inter để sử dụng trên mọi môi trường (macOS/Docker)
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
}

interface HelpCategory {
    name: string;
    commands: HelpCommand[];
}

export async function renderHelpImage(categories: HelpCategory[]): Promise<Buffer> {
    const width = 800;
    const padding = 40;
    const headerHeight = 160;
    const categorySpacing = 40;
    const rowHeight = 72;
    const cardPadding = 16;
    const iconSize = 44;

    const fontStack = '"Inter", "DejaVu Sans", sans-serif';

    // Calculate dynamic height
    let totalHeight = headerHeight + padding;
    for (const cat of categories) {
        totalHeight += 30; // Category title
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
    ctx.roundRect(20, 20, width - 40, totalHeight - 40, 32);
    ctx.fill();

    // 2. Header
    // Icon (Mocked Music Icon)
    ctx.fillStyle = '#2C2C2E';
    ctx.beginPath();
    ctx.roundRect(padding + 10, padding + 10, 64, 64, 14);
    ctx.fill();
    
    // Draw a simple musical note
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `32px ${fontStack}`;
    ctx.fillText('♫', padding + 28, padding + 54);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold 36px ${fontStack}`;
    ctx.fillText('MusicBox', padding + 90, padding + 44);
    
    ctx.fillStyle = '#8E8E93';
    ctx.font = `22px ${fontStack}`;
    ctx.fillText('All commands', padding + 90, padding + 76);

    let currentY = headerHeight;

    // 3. Render Categories
    for (const category of categories) {
        // Category Header
        ctx.fillStyle = '#8E8E93';
        ctx.font = `bold 18px ${fontStack}`;
        ctx.fillText(category.name.toUpperCase(), padding + 10, currentY);
        currentY += 30;

        // Command Rows
        for (const cmd of category.commands) {
            const rowX = padding;
            const rowY = currentY;
            const rowW = width - (padding * 2);

            // Icon background (Rounded Square)
            ctx.fillStyle = '#3A3A3C';
            ctx.beginPath();
            ctx.roundRect(rowX + 10, rowY + 10, iconSize, iconSize, 10);
            ctx.fill();

            // Slash Command Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `bold 24px ${fontStack}`;
            ctx.fillText(`/${cmd.name}`, rowX + 70, rowY + 36);

            // Args (if any)
            if (cmd.args) {
                const nameWidth = ctx.measureText(`/${cmd.name}`).width;
                ctx.fillStyle = '#3A3A3C';
                ctx.beginPath();
                ctx.roundRect(rowX + 75 + nameWidth, rowY + 16, ctx.measureText(cmd.args).width + 16, 26, 6);
                ctx.fill();
                
                ctx.fillStyle = '#8E8E93';
                ctx.font = `bold 16px ${fontStack}`;
                ctx.fillText(cmd.args, rowX + 83 + nameWidth, rowY + 35);
            }

            // Description
            ctx.fillStyle = '#8E8E93';
            ctx.font = `20px ${fontStack}`;
            ctx.fillText(cmd.description, rowX + 70, rowY + 64);

            // Arrow on the right
            ctx.strokeStyle = '#3A3A3C';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(width - padding - 30, rowY + 25);
            ctx.lineTo(width - padding - 20, rowY + 35);
            ctx.lineTo(width - padding - 30, rowY + 45);
            ctx.stroke();

            currentY += rowHeight;
        }
        currentY += categorySpacing;
    }

    return canvas.toBuffer('image/png');
}
