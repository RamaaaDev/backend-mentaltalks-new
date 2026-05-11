// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface CreatePaymentDto {
  bookingId: string;
}

// ─── iPaymu Payment Request ───────────────────────────────────────────────────

export interface IpaymuPaymentRequest {
  orderId: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  product: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface IpaymuPaymentResponse {
  token: string;
  redirectUrl: string;
}

// ─── iPaymu Transaction Status ────────────────────────────────────────────────

export interface IpaymuTransactionStatus {
  orderId: string;
  transactionId: string;
  status: PaymentStatus;
  paymentType: string | null;
  raw: Record<string, unknown>;
}

// ─── iPaymu Notification (Webhook) ───────────────────────────────────────────

export interface IpaymuNotificationBody {
  trx_id: string; // iPaymu transaction ID
  reference_id: string; // orderId yang kita kirim (mapped ke order_id)
  status: string; // 'berhasil' | 'pending' | 'dibatalkan' | 'kadaluarsa'
  status_code: string; // '1' = berhasil, '2' = pending, dst
  via: string; // metode pembayaran (bca, mandiri, qris, dll)
  channel: string;
  price: string; // nominal transaksi
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  signature: string; // SHA256(va:api_key:trx_id)
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
  createSnapPayment(
    params: IpaymuPaymentRequest,
  ): Promise<IpaymuPaymentResponse>;

  /**
   * Cek status transaksi berdasarkan orderId.
   */
  checkTransactionStatus(orderId: string): Promise<IpaymuTransactionStatus>;

  /**
   * Map raw status string dari iPaymu ke PaymentStatus internal.
   */
  mapStatus(statusCode: string): PaymentStatus;

  /**
   * Verifikasi signature dari webhook iPaymu.
   */
  verifySignature(notification: IpaymuNotificationBody): boolean;
}
