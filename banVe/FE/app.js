/**
 * Frontend logic cho Wonderland Theme Park Ticket Booking System
 */
const API_BASE_URL = 'http://localhost:5000/api';

// Biến lưu trữ trạng thái local
let ticketsCache = [];
let currentSelectedTicket = null;

// DOM Elements
const ticketsGrid = document.getElementById('tickets-grid');
const selectTicket = document.getElementById('select-ticket');
const inputTicketId = document.getElementById('input-ticket-id');
const inputQuantity = document.getElementById('input-quantity');
const btnQtyMinus = document.getElementById('btn-qty-minus');
const btnQtyPlus = document.getElementById('btn-qty-plus');
const displayUnitPrice = document.getElementById('display-unit-price');
const displayStockStatus = document.getElementById('display-stock-status');
const displayTotalRaw = document.getElementById('display-total-raw');
const displayDiscountEstimate = document.getElementById('display-discount-estimate');
const displayTotalEstimate = document.getElementById('display-total-estimate');
const btnSubmitBooking = document.getElementById('btn-submit-booking');
const bookingsTableBody = document.getElementById('bookings-table-body');
const jsonResponseCode = document.getElementById('json-response-code');
const responseHttpCode = document.getElementById('response-http-code');
const responseStatusBadge = document.getElementById('response-status-badge');
const bookingAlertBox = document.getElementById('booking-alert-box');
const backendStatusText = document.getElementById('backend-status-text');
const statusDot = document.querySelector('.status-dot');
const btnResetData = document.getElementById('btn-reset-data');
const btnRefreshTickets = document.getElementById('btn-refresh-tickets');
const btnRefreshBookings = document.getElementById('btn-refresh-bookings');

// Format tiền tệ VND
function formatCurrency(amount) {
  if (typeof amount !== 'number' || isNaN(amount)) return '0 đ';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Format ngày giờ
function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// 1. Kiểm tra trạng thái Backend
async function checkBackendHealth() {
  try {
    const res = await fetch('http://localhost:5000/health');
    if (res.ok) {
      statusDot.className = 'status-dot online';
      backendStatusText.textContent = 'Backend Online (Port 5000)';
      return true;
    }
  } catch (err) {
    statusDot.className = 'status-dot offline';
    backendStatusText.textContent = 'Chưa kết nối Server';
    return false;
  }
}

// 2. Tải danh sách vé từ API GET /api/tickets
async function loadTickets() {
  try {
    const res = await fetch(`${API_BASE_URL}/tickets`);
    const data = await res.json();
    
    if (data.success && Array.isArray(data.data)) {
      ticketsCache = data.data;
      renderTicketsGrid(ticketsCache);
      populateTicketSelect(ticketsCache);
      checkBackendHealth();
    }
  } catch (err) {
    console.error('Lỗi khi tải danh sách vé:', err);
    ticketsGrid.innerHTML = `
      <div style="grid-column: 1/-1; padding: 2rem; text-align: center; color: #ef4444; background: rgba(239, 68, 68, 0.1); border-radius: 12px;">
        ⚠️ Không thể kết nối tới Backend (http://localhost:5000/api/tickets).<br>
        Vui lòng đảm bảo server backend đang chạy (<code>npm run dev</code> trong thư mục BE).
      </div>
    `;
  }
}

// 3. Render danh sách thẻ vé
function renderTicketsGrid(tickets) {
  ticketsGrid.innerHTML = '';
  
  tickets.forEach((ticket, idx) => {
    const isVip = ticket.price >= 700000;
    const stockClass = ticket.stock > 3 ? 'in-stock' : ticket.stock > 0 ? 'low-stock' : 'out-stock';
    const stockText = ticket.stock > 0 ? `Còn ${ticket.stock} vé` : 'HẾT VÉ';
    
    const card = document.createElement('div');
    card.className = `ticket-card ${idx === 0 ? 'featured' : ''}`;
    card.innerHTML = `
      <span class="ticket-badge-pill ${isVip ? 'badge-vip' : 'badge-standard'}">
        ${isVip ? '👑 VIP EXPERIENCE' : '🌟 TIÊU CHUẨN'}
      </span>
      <div class="ticket-title-row">
        <span class="ticket-id-tag">MÃ VÉ: TICKET-#0${ticket.id}</span>
        <h4>${ticket.name}</h4>
      </div>
      <p class="ticket-description">${ticket.description || 'Trải nghiệm khu vui chơi Wonderland đầy màu sắc.'}</p>
      
      <div class="ticket-meta">
        <div class="ticket-price-box">
          <div class="price-label">Giá niêm yết (BE)</div>
          <div class="price-val">${formatCurrency(ticket.price)}</div>
        </div>
        <div class="ticket-stock-box">
          <div class="stock-label">Tồn kho hiện tại</div>
          <span class="stock-tag ${stockClass}">${stockText}</span>
        </div>
      </div>
      
      <button class="btn-choose-ticket" data-id="${ticket.id}">
        Chọn Đặt Vé Này ➔
      </button>
    `;

    // Sự kiện khi bấm "Chọn Đặt Vé Này"
    card.querySelector('.btn-choose-ticket').addEventListener('click', () => {
      selectTicketById(ticket.id);
      document.querySelector('.booking-card').scrollIntoView({ behavior: 'smooth' });
    });

    ticketsGrid.appendChild(card);
  });
}

// 4. Đổ dữ liệu vào Select Box
function populateTicketSelect(tickets) {
  const currentVal = selectTicket.value;
  selectTicket.innerHTML = '<option value="">-- Vui lòng chọn loại vé --</option>';
  
  tickets.forEach(ticket => {
    const option = document.createElement('option');
    option.value = ticket.id;
    option.textContent = `[ID: ${ticket.id}] ${ticket.name} - ${formatCurrency(ticket.price)} (Tồn: ${ticket.stock})`;
    selectTicket.appendChild(option);
  });

  if (currentVal && tickets.some(t => t.id == currentVal)) {
    selectTicket.value = currentVal;
  }
}

// 5. Chọn vé theo ID
function selectTicketById(id) {
  selectTicket.value = id;
  inputTicketId.value = id;
  updateTicketDetails();
}

// 6. Cập nhật thông tin chi tiết vé & tính nhẩm tổng tiền
function updateTicketDetails() {
  const ticketId = Number(inputTicketId.value);
  currentSelectedTicket = ticketsCache.find(t => t.id === ticketId);
  
  if (currentSelectedTicket) {
    displayUnitPrice.textContent = formatCurrency(currentSelectedTicket.price);
    const stockClass = currentSelectedTicket.stock > 0 ? 'stock-tag in-stock' : 'stock-tag out-stock';
    displayStockStatus.className = stockClass;
    displayStockStatus.textContent = currentSelectedTicket.stock > 0 
      ? `Còn ${currentSelectedTicket.stock} vé` 
      : 'HẾT VÉ';
  } else {
    displayUnitPrice.textContent = '0 đ';
    displayStockStatus.className = 'stock-badge';
    displayStockStatus.textContent = '--';
  }

  calculateEstimate();
}

// Tính ước lượng giá & giảm giá mô phỏng theo đúng chính sách BE
function calculateEstimate() {
  const qty = Number(inputQuantity.value);
  if (currentSelectedTicket && !isNaN(qty) && qty > 0) {
    const totalRaw = currentSelectedTicket.price * qty;
    
    // Quy tắc giảm giá: Đơn từ 1.000.000đ trở lên giảm 10%, tối đa 200.000đ
    let discount = 0;
    if (totalRaw >= 1000000) {
      discount = Math.min(Math.round(totalRaw * 0.10), 200000);
    }
    const finalAmount = totalRaw - discount;

    displayTotalRaw.textContent = formatCurrency(totalRaw);
    displayDiscountEstimate.textContent = discount > 0 ? `- ${formatCurrency(discount)}` : '0 đ';
    displayTotalEstimate.textContent = formatCurrency(finalAmount);
  } else {
    displayTotalRaw.textContent = '0 đ';
    displayDiscountEstimate.textContent = '0 đ';
    displayTotalEstimate.textContent = '0 đ';
  }
}

// 7. Tải lịch sử đơn đặt vé từ API GET /api/bookings
async function loadBookings() {
  try {
    const res = await fetch(`${API_BASE_URL}/bookings`);
    const data = await res.json();
    
    if (data.success && Array.isArray(data.data)) {
      renderBookingsTable(data.data);
    }
  } catch (err) {
    console.error('Lỗi tải danh sách bookings:', err);
  }
}

function renderBookingsTable(bookings) {
  if (bookings.length === 0) {
    bookingsTableBody.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted" style="padding: 2rem;">Chưa có đơn đặt nào. Hãy đặt vé để xem đơn hàng được tạo!</td>
      </tr>
    `;
    return;
  }

  bookingsTableBody.innerHTML = '';
  bookings.forEach(b => {
    const tr = document.createElement('tr');
    const discount = b.discount_amount || 0;
    const finalAmt = b.final_amount || b.total_amount;
    
    tr.innerHTML = `
      <td><span class="booking-id-badge">${b.id}</span></td>
      <td><strong>${b.ticket_name}</strong></td>
      <td>${formatCurrency(b.unit_price)}</td>
      <td><span style="font-weight: 700;">${b.quantity}</span> vé</td>
      <td><span style="color: var(--text-secondary);">${formatCurrency(b.total_amount)}</span></td>
      <td><span style="color: #f87171; font-weight: 600;">${discount > 0 ? '-' + formatCurrency(discount) : '0 đ'}</span></td>
      <td><span style="color: #4ade80; font-weight: 800;">${formatCurrency(finalAmt)}</span></td>
      <td><span class="status-badge-ok">${b.status}</span></td>
      <td style="color: var(--text-secondary); font-size: 0.8rem;">${formatDateTime(b.created_at)}</td>
    `;
    bookingsTableBody.appendChild(tr);
  });
}

// 8. Gửi yêu cầu đặt vé POST /api/bookings
async function submitBooking() {
  const ticketIdRaw = inputTicketId.value.trim();
  const quantityRaw = inputQuantity.value.trim();

  // Cho phép gửi cả giá trị rỗng/chuỗi để test khả năng bắt lỗi của BE
  const payload = {
    ticketId: ticketIdRaw === '' ? '' : isNaN(Number(ticketIdRaw)) ? ticketIdRaw : Number(ticketIdRaw),
    quantity: quantityRaw === '' ? '' : isNaN(Number(quantityRaw)) ? quantityRaw : Number(quantityRaw)
  };

  btnSubmitBooking.disabled = true;
  btnSubmitBooking.querySelector('.btn-text').textContent = 'Đang xử lý đặt vé...';
  
  responseStatusBadge.className = 'badge-status idle';
  responseStatusBadge.textContent = 'ĐANG GỬI...';
  responseHttpCode.textContent = 'Đang gửi...';

  try {
    const res = await fetch(`${API_BASE_URL}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const statusCode = res.status;
    const data = await res.json();

    responseHttpCode.textContent = `HTTP ${statusCode}`;
    jsonResponseCode.textContent = JSON.stringify(data, null, 2);

    if (res.ok && data.success) {
      // Đặt vé thành công
      responseStatusBadge.className = 'badge-status success';
      responseStatusBadge.textContent = 'THÀNH CÔNG (201)';

      const discountMsg = data.discountAmount > 0 
        ? ` | Giảm giá: <strong style="color: #f87171;">-${formatCurrency(data.discountAmount)}</strong>` 
        : '';

      bookingAlertBox.className = 'alert-box alert-success';
      bookingAlertBox.innerHTML = `
        <strong>🎉 Đặt vé thành công!</strong><br>
        Mã đơn: <strong>${data.bookingId}</strong> | 
        Tổng tiền gốc: <strong>${formatCurrency(data.totalAmount)}</strong>${discountMsg} | 
        Số tiền thanh toán (finalAmount): <strong style="color: #4ade80;">${formatCurrency(data.finalAmount)}</strong> | 
        Trạng thái: <strong>${data.status}</strong>
      `;

      // Cập nhật lại tồn kho vé và danh sách đơn
      await loadTickets();
      await loadBookings();
    } else {
      // Báo lỗi rõ ràng từ Backend
      responseStatusBadge.className = 'badge-status error';
      responseStatusBadge.textContent = `LỖI (${statusCode})`;

      bookingAlertBox.className = 'alert-box alert-danger';
      bookingAlertBox.innerHTML = `
        <strong>❌ Đặt vé thất bại:</strong> ${data.message || 'Lỗi không xác định.'}<br>
        <small style="opacity: 0.85;">Mã lỗi (errorCode): <code>${data.errorCode || 'UNKNOWN'}</code> | Mã HTTP: ${statusCode}</small>
      `;

      // Cập nhật lại tồn kho phòng trường hợp vừa thay đổi
      loadTickets();
    }
  } catch (err) {
    responseStatusBadge.className = 'badge-status error';
    responseStatusBadge.textContent = 'LỖI MẠNG';
    responseHttpCode.textContent = 'HTTP ERROR';
    jsonResponseCode.textContent = JSON.stringify({ error: err.message }, null, 2);

    bookingAlertBox.className = 'alert-box alert-danger';
    bookingAlertBox.innerHTML = `<strong>⚠️ Không thể kết nối tới máy chủ backend:</strong> ${err.message}`;
  } finally {
    btnSubmitBooking.disabled = false;
    btnSubmitBooking.querySelector('.btn-text').textContent = 'Xác Nhận Đặt Vé';
  }
}

// 9. Reset dữ liệu về ban đầu
async function resetData() {
  if (!confirm('Bạn có chắc chắn muốn khôi phục lại tồn kho vé và xóa các đơn đã đặt về trạng thái ban đầu?')) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/reset`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      alert('Đã khôi phục dữ liệu gốc thành công: Vé 1 (tồn 5), Vé 2 (tồn 6).');
      loadTickets();
      loadBookings();
      bookingAlertBox.className = 'alert-box hidden';
      jsonResponseCode.textContent = '// Dữ liệu đã được reset về ban đầu.';
      responseHttpCode.textContent = 'HTTP ---';
      responseStatusBadge.className = 'badge-status idle';
      responseStatusBadge.textContent = 'SẴN SÀNG';
    }
  } catch (err) {
    alert('Lỗi khi khôi phục: ' + err.message);
  }
}

// --- GẮN SỰ KIỆN GIAO DIỆN ---
selectTicket.addEventListener('change', () => {
  inputTicketId.value = selectTicket.value;
  updateTicketDetails();
});

inputTicketId.addEventListener('input', () => {
  const val = inputTicketId.value.trim();
  selectTicket.value = val;
  updateTicketDetails();
});

inputQuantity.addEventListener('input', calculateEstimate);

btnQtyMinus.addEventListener('click', () => {
  let val = parseInt(inputQuantity.value, 10) || 1;
  inputQuantity.value = val - 1;
  calculateEstimate();
});

btnQtyPlus.addEventListener('click', () => {
  let val = parseInt(inputQuantity.value, 10) || 0;
  inputQuantity.value = val + 1;
  calculateEstimate();
});

btnSubmitBooking.addEventListener('click', submitBooking);
btnResetData.addEventListener('click', resetData);
btnRefreshTickets.addEventListener('click', loadTickets);
btnRefreshBookings.addEventListener('click', loadBookings);

// --- KỊCH BẢN TEST NHANH (NẾU CÓ TRÊN GIAO DIỆN) ---
document.getElementById('test-valid')?.addEventListener('click', () => {
  selectTicketById(1);
  inputQuantity.value = 1;
  calculateEstimate();
  submitBooking();
});

// Test 2 vé VIP (1.5 triệu -> giảm 10% = 150k)
document.getElementById('test-discount-10')?.addEventListener('click', () => {
  selectTicketById(1);
  inputQuantity.value = 2;
  calculateEstimate();
  submitBooking();
});

// Test 3 vé VIP (2.25 triệu -> 10% = 225k -> tối đa 200k)
document.getElementById('test-discount-max')?.addEventListener('click', () => {
  selectTicketById(1);
  inputQuantity.value = 3;
  calculateEstimate();
  submitBooking();
});

document.getElementById('test-negative')?.addEventListener('click', () => {
  selectTicketById(1);
  inputQuantity.value = -2;
  calculateEstimate();
  submitBooking();
});

document.getElementById('test-exceed')?.addEventListener('click', () => {
  selectTicketById(1);
  inputQuantity.value = 99;
  calculateEstimate();
  submitBooking();
});

document.getElementById('test-notfound')?.addEventListener('click', () => {
  inputTicketId.value = '999';
  selectTicket.value = '';
  inputQuantity.value = 1;
  updateTicketDetails();
  submitBooking();
});

// Khởi chạy khi load trang
window.addEventListener('DOMContentLoaded', () => {
  loadTickets();
  loadBookings();
  // Tự động chọn vé đầu tiên nếu có
  setTimeout(() => {
    if (ticketsCache.length > 0) {
      selectTicketById(ticketsCache[0].id);
    }
  }, 300);
});
