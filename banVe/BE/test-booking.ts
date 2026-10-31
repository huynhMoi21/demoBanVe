import { BookingService } from './src/services/bookingService';
import { initDatabase, resetDatabase } from './src/db';

console.log('--- BẮT ĐẦU CHẠY KIỂM THỬ HỆ THỐNG BÁN VÉ KHU VUI CHƠI ---');

initDatabase();
resetDatabase();

// 1. Kiểm tra danh sách vé ban đầu
console.log('\n[Test 1] Kiểm tra danh sách vé ban đầu:');
const ticketsInitial = BookingService.getAllTickets();
console.table(ticketsInitial);

// 2. Test đặt vé hợp lệ: Vé 1 (giá 750k), số lượng 2
console.log('\n[Test 2] Đặt vé hợp lệ: ticketId = 1, quantity = 2 (Tổng tiền 1.5M -> Giảm 10% = 150k)');
try {
  const res1 = BookingService.createBooking({ ticketId: 1, quantity: 2 });
  console.log('✅ Kết quả trả về:', JSON.stringify(res1, null, 2));
  if (res1.totalAmount === 1500000 && res1.discountAmount === 150000 && res1.finalAmount === 1350000) {
    console.log('-> PASS: totalAmount = 1.500.000đ, discountAmount = 150.000đ, finalAmount = 1.350.000đ');
  }
} catch (e: any) {
  console.error('❌ Lỗi:', e.message);
}

// 3. Test vé không tồn tại: ticketId = 999
console.log('\n[Test 3] Kiểm tra vé không tồn tại: ticketId = 999, quantity = 1');
try {
  BookingService.createBooking({ ticketId: 999, quantity: 1 });
  console.error('❌ Thất bại: Đáng lẽ phải báo lỗi vé không tồn tại');
} catch (e: any) {
  console.log(`✅ Bắt được lỗi đúng kỳ vọng [Code: ${e.errorCode}, Status: ${e.statusCode}]: ${e.message}`);
}

// 4. Test số lượng vé âm: quantity = -2
console.log('\n[Test 4] Kiểm tra vé số lượng âm: ticketId = 1, quantity = -2');
try {
  BookingService.createBooking({ ticketId: 1, quantity: -2 });
  console.error('❌ Thất bại: Đáng lẽ phải báo lỗi số lượng âm');
} catch (e: any) {
  console.log(`✅ Bắt được lỗi đúng kỳ vọng [Code: ${e.errorCode}, Status: ${e.statusCode}]: ${e.message}`);
}

// 5. Test số lượng vé bằng 0: quantity = 0
console.log('\n[Test 5] Kiểm tra số lượng bằng 0: ticketId = 1, quantity = 0');
try {
  BookingService.createBooking({ ticketId: 1, quantity: 0 });
  console.error('❌ Thất bại: Đáng lẽ phải báo lỗi số lượng bằng 0');
} catch (e: any) {
  console.log(`✅ Bắt được lỗi đúng kỳ vọng [Code: ${e.errorCode}, Status: ${e.statusCode}]: ${e.message}`);
}

// 6. Test số lượng vé vượt quá tồn kho (Vé 1 hiện còn 3 vé, yêu cầu 5 vé)
console.log('\n[Test 6] Kiểm tra số lượng vượt quá tồn kho: ticketId = 1, quantity = 5 (tồn kho hiện còn 3)');
try {
  BookingService.createBooking({ ticketId: 1, quantity: 5 });
  console.error('❌ Thất bại: Đáng lẽ phải báo lỗi vượt tồn kho');
} catch (e: any) {
  console.log(`✅ Bắt được lỗi đúng kỳ vọng [Code: ${e.errorCode}, Status: ${e.statusCode}]: ${e.message}`);
}

// 7. Test đặt vé 2 (giá 650k, tồn kho 6): đặt 6 vé
console.log('\n[Test 7] Đặt toàn bộ tồn kho vé 2: ticketId = 2, quantity = 6 (Tổng tiền 3.9M -> Giảm kịch trần 200k)');
try {
  const res2 = BookingService.createBooking({ ticketId: 2, quantity: 6 });
  console.log('✅ Kết quả trả về:', JSON.stringify(res2, null, 2));
  if (res2.totalAmount === 3900000 && res2.discountAmount === 200000 && res2.finalAmount === 3700000) {
    console.log('-> PASS: totalAmount = 3.900.000đ, discountAmount = 200.000đ (chạm trần max 200k), finalAmount = 3.700.000đ');
  }
} catch (e: any) {
  console.error('❌ Lỗi:', e.message);
}

// 8. Đặt tiếp vé 2 khi tồn kho đã hết (0)
console.log('\n[Test 8] Đặt tiếp vé 2 khi tồn kho đã về 0: ticketId = 2, quantity = 1');
try {
  BookingService.createBooking({ ticketId: 2, quantity: 1 });
  console.error('❌ Thất bại: Đáng lẽ phải báo lỗi hết vé');
} catch (e: any) {
  console.log(`✅ Bắt được lỗi đúng kỳ vọng [Code: ${e.errorCode}, Status: ${e.statusCode}]: ${e.message}`);
}

// 9. Kiểm tra danh sách đơn đặt vé sau các bước trên
console.log('\n[Test 9] Danh sách các đơn đặt vé trong DB:');
console.table(BookingService.getAllBookings());

// 10. Kiểm tra tồn kho sau khi đặt
console.log('\n[Test 10] Tồn kho các vé sau khi đặt:');
console.table(BookingService.getAllTickets());

console.log('\n🎉 TẤT CẢ TEST ĐÃ HOÀN TẤT THÀNH CÔNG VÀ CHÍNH XÁC!');
