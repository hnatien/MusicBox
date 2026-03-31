import { JSONFilePreset } from 'lowdb/node';

// Định nghĩa cấu trúc dữ liệu của database
type Data = {
  totalSongsPlayed: number;
};

const defaultData: Data = { totalSongsPlayed: 0 };

// Khởi tạo Database (tự động tạo tệp db.json nếu chưa tồn tại)
const db = await JSONFilePreset<Data>('db.json', defaultData);

export const database = {
  // Lấy tổng số bài hát đã phát
  getSongsPlayed: () => db.data.totalSongsPlayed,

  // Tăng số lượng bài hát đã phát và lưu lại
  incrementSongsPlayed: async () => {
    db.data.totalSongsPlayed += 1;
    await db.write();
  }
};
