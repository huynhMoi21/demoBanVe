export interface Ticket {
  id: number;
  name: string;
  price: number;
  stock: number;
  description?: string;
}

export interface BookingRequest {
  ticketId: number | string;
  quantity: number;
}

export interface BookingResponse {
  bookingId: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: 'SUCCESS' | 'FAILED';
  ticketId?: number;
  ticketName?: string;
  unitPrice?: number;
  quantity?: number;
  remainingStock?: number;
  createdAt?: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}
