import { createClient } from 'redis';
import 'dotenv/config';

async function check() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    console.log(`🔍 Đang kiểm tra Redis tại: ${url.replace(/:[^:@]+@/, ':****@')}`);
    
    const client = createClient({ url });
    client.on('error', (err) => console.error('❌ Lỗi kết nối Redis:', err.message));

    try {
        await client.connect();
        console.log('✅ Đã kết nối thành công!');

        const keys = await client.keys('*');
        console.log('📋 Danh sách keys:', keys);

        const totalSongs = await client.get('totalSongsPlayed');
        console.log('🎵 totalSongsPlayed:', totalSongs || 'Chưa có dữ liệu (null)');

        await client.disconnect();
    } catch (error: any) {
        console.error('❌ Thất bại:', error.message);
    }
}

check();