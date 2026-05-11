// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreatePaymentDto {
  bookingId: string;
}

// ─── Midtrans Snap Request ────────────────────────────────────────────────────

export interface MidtransSnapRequest {
  orderId: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  product: string;
  returnUrl: string;
  cancelUrl: string;
}

export interface MidtransSnapResponse {
  token: string;
  redirectUrl: string;
}

// ─── Midtrans Transaction Status ─────────────────────────────────────────────

export interface MidtransTransactionStatus {
  orderId: string;
  transactionId: string;
  status: PaymentStatus;
  paymentType: string | null;
  fraudStatus?: string;
  raw: Record<string, unknown>;
}

// ─── Midtrans Notification (Webhook) ─────────────────────────────────────────

export interface MidtransNotificationBody {
  transaction_time: string;
  transaction_status: string; // 'capture' | 'settlement' | 'pending' | 'deny' | 'cancel' | 'expire' | 'refund'
  transaction_id: string;
  status_message: string;
  status_code: string;
  signature_key: string;
  payment_type: string;
  order_id: string;
  merchant_id: string;
  gross_amount: string;
  fraud_status?: string; // 'accept' | 'challenge' | 'deny'
  currency: string;
  // VA / bank transfer specific
  va_numbers?: Array<{ bank: string; va_number: string }>;
  // Card specific
  masked_card?: string;
  bank?: string;
  eci?: string;
  channel_response_message?: string;
}

// ─── Payment Status Enum ──────────────────────────────────────────────────────

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

// ─── Payment Gateway Interface (abstraksi) ────────────────────────────────────

export interface IPaymentGateway {
  /**
   * Buat sesi pembayaran baru dan kembalikan redirect URL & token.
   */
  createSnapPayment(params: MidtransSnapRequest): Promise<MidtransSnapResponse>;

  /**
   * Cek status transaksi berdasarkan orderId atau transactionId.
   */
  checkTransactionStatus(orderId: string): Promise<MidtransTransactionStatus>;

  /**
   * Map raw status string dari Midtrans ke PaymentStatus internal.
   */
  mapStatus(transactionStatus: string, fraudStatus?: string): PaymentStatus;

  /**
   * Verifikasi signature key dari webhook Midtrans.
   */
  verifySignature(notification: MidtransNotificationBody): boolean;
}
