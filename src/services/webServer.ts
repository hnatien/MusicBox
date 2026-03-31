import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../core/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startWebServer() {
    const app = express();
    // Railway sử dụng PORT từ environment variable, nếu không có thì dùng 3000 cho Localhost
    const port = process.env.PORT || 3000;

    // Phục vụ các file tĩnh trong thư mục 'public' (chứa index.html)
    // Đường dẫn tương đối từ 'dist/services/webServer.js' ra 'public'
    const publicPath = path.join(__dirname, '../../public');
    
    app.use(express.static(publicPath));

    // Route mặc định khi truy cập URL
    app.get('/', (req, res) => {
        res.sendFile(path.join(publicPath, 'index.html'));
    });

    // Bắt đầu lắng nghe
    app.listen(port, () => {
        logger.info(`🌐 [Web] Website đang chạy tại: http://localhost:${port}`);
    });
}
