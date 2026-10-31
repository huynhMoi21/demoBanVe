import Database from 'better-sqlite3';
import path from 'path';

// Đường dẫn lưu file database SQLite
const dbPath = path.resolve(__dirname, '../tickets.db');
export const db = new Database(dbPath);

// Kích hoạt Foreign Keys và WAL mode để tăng hiệu năng và an toàn giao dịch
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

/**
 * Khởi tạo bảng dữ liệu và dữ liệu ban đầu
 * - Bảng tickets: id, tên vé, giá (750k, 650k), tồn kho (5, 6)
 * - Bảng bookings: lưu thông tin đơn đặt vé
 */
export function initDatabase() {
  // 1. Tạo bảng tickets
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price INTEGER NOT NULL,
      stock INTEGER NOT NULL,
      description TEXT
    );
  `);

  // 2. Tạo bảng bookings
  db.exec(`
    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      ticket_id INTEGER NOT NULL,
      ticket_name TEXT NOT NULL,
      unit_price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      total_amount INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      final_amount INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'SUCCESS',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id)
    );
  `);

  // Đảm bảo migration cho các cột mới nếu bảng đã tồn tại
  try {
    db.exec(`ALTER TABLE bookings ADD COLUMN discount_amount INTEGER NOT NULL DEFAULT 0;`);
  } catch (_e) {
    // Cột đã tồn tại
  }
  try {
    db.exec(`ALTER TABLE bookings ADD COLUMN final_amount INTEGER NOT NULL DEFAULT 0;`);
  } catch (_e) {
    // Cột đã tồn tại
  }

  // 3. Khởi tạo dữ liệu mẫu nếu bảng tickets chưa có dữ liệu
  const countRow = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number };
  if (countRow.count === 0) {
    const insertTicket = db.prepare(`
      INSERT INTO tickets (id, name, price, stock, description)
      VALUES (?, ?, ?, ?, ?)
    `);

    // Dữ liệu theo đúng yêu cầu đề bài:
    // Vé giá 750k (750.000đ), tồn kho: 5
    // Vé giá 650k (650.000đ), tồn kho: 6
    insertTicket.run(
      1,
      'Vé vin wonders',
      750000,
      5,
      'Vé trải nghiệm toàn bộ trò chơi không giới hạn và lối đi ưu tiên VIP'
    );

    insertTicket.run(
      2,
      'Vé safari',
      650000,
      6,
      'Vé tiêu chuẩn vào cổng tham quan và hơn 25 khu trò chơi gia đình, trẻ em'
    );

    console.log('✅ Đã khởi tạo dữ liệu vé mẫu thành công:');
    console.log(' - Vé ID 1: Giá 750.000đ | Tồn kho: 5');
    console.log(' - Vé ID 2: Giá 650.000đ | Tồn kho: 6');
  }
}


export function resetDatabase() {
  db.exec(`
    DELETE FROM bookings;
    DELETE FROM tickets;
    DELETE FROM sqlite_sequence;
  `);

  const insertTicket = db.prepare(`
    INSERT INTO tickets (id, name, price, stock, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertTicket.run(
    1,
    'Vé vin wonders',
    750000,
    5,
    'Vé trải nghiệm toàn bộ trò chơi không giới hạn và lối đi ưu tiên VIP'
  );

  insertTicket.run(
    2,
    'Vé safari',
    650000,
    6,
    'Vé tiêu chuẩn vào cổng tham quan và hơn 25 khu trò chơi gia đình, trẻ em'
  );
}
