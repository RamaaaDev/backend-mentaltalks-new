// ══════════════════════════════════════════════════════════════════════════
// PAYMENT STATUS
// ══════════════════════════════════════════════════════════════════════════

export type PaymentStatus =
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'EXPIRED'
  | 'REFUNDED';

// ══════════════════════════════════════════════════════════════════════════
// CREATE PAYMENT INTENT
// ══════════════════════════════════════════════════════════════════════════

export interface CreatePaymentIntentDto {
  scheduleId: string;
  couponCode?: string;
  booking_notes?: string;
}

export interface PaymentPricing {
  originalPrice: number;
  finalPrice: number;
  discount: number;
}

export interface CreatePaymentIntentResponse {
  message: string;
  data: {
    orderId: string;
    /** Diisi orderId untuk backward-compat dengan frontend yang sudah pakai field ini */
    snapToken: string;
    /** URL gambar barcode QRIS statis — tampilkan ke user */
    qrisImageUrl: string;
    pricing: PaymentPricing;
    /** Instruksi langkah-langkah pembayaran untuk ditampilkan ke user */
    paymentInstructions: string[];
  };
}

// ══════════════════════════════════════════════════════════════════════════
// QRIS SERVICE — request & response
// ══════════════════════════════════════════════════════════════════════════

export interface QrisPaymentRequest {
  orderId: string;
  amount: number;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  product: string;
}

export interface QrisPaymentResponse {
  /** Sama dengan orderId — dipakai sebagai token agar shape DB tidak berubah */
  token: string;
  /** Kosong untuk QRIS statis */
  redirectUrl: string;
  /** URL gambar barcode QRIS */
  qrisImageUrl: string;
}

// ══════════════════════════════════════════════════════════════════════════
// SUBMIT REFERENCE NUMBER (user)
// ══════════════════════════════════════════════════════════════════════════

export interface SubmitReferenceDto {
  /** Order ID yang sudah dibayar */
  orderId: string;
  /** Nomor referensi dari struk / riwayat transaksi app bank / e-wallet */
  referenceNumber: string;
}

export interface SubmitReferenceResponse {
  message: string;
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN CONFIRM PAYMENT (menggantikan MidtransNotificationBody)
// ══════════════════════════════════════════════════════════════════════════

export interface AdminConfirmPaymentDto {
  /** Order ID yang dikonfirmasi */
  orderId: string;
  /** Nomor referensi dari user / mutasi rekening admin */
  referenceNumber: string;
  /** Keputusan admin */
  transactionStatus: 'success' | 'failed';
}

export interface AdminConfirmPaymentResponse {
  message: string;
}

// ══════════════════════════════════════════════════════════════════════════
// CHECK PAYMENT STATUS
// ══════════════════════════════════════════════════════════════════════════

export interface PaymentRecord {
  orderId: string;
  token: string;
  redirectUrl: string;
  status: PaymentStatus;
  grossAmount: number;
  transactionId: string | null;
  paymentType: string | null;
  transactionTime: Date | null;
  bookingId: string | null;
  meta: PaymentMeta;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMeta {
  userId: string;
  scheduleId: string;
  couponId: string | null;
  bookingNotes: string | null;
  originalPrice: number;
  finalPrice: number;
  psychologistId: string;
  scheduleType: string;
}

export interface CheckPaymentStatusResponse {
  data: PaymentRecord;
}

// ══════════════════════════════════════════════════════════════════════════
// GET MY PAYMENTS (paginated)
// ══════════════════════════════════════════════════════════════════════════

export interface PaymentListItem extends PaymentRecord {
  booking: {
    booking_type: string;
    booking_schedule: {
      schedule_startTime: Date;
      schedule_psychologistProfile: {
        psychologist_name: string;
      };
    };
  } | null;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface GetMyPaymentsResponse {
  data: PaymentListItem[];
  meta: PaginationMeta;
}

// ══════════════════════════════════════════════════════════════════════════
// ADMIN: GET ALL PAYMENTS (paginated)
// ══════════════════════════════════════════════════════════════════════════

export interface AdminPaymentListItem extends PaymentRecord {
  booking: {
    booking_user: {
      user_name: string;
      user_email: string;
    };
    booking_psychologist: {
      psychologist_name: string;
    };
  } | null;
}

export interface AdminGetAllPaymentsResponse {
  data: AdminPaymentListItem[];
  meta: PaginationMeta;
}

// ══════════════════════════════════════════════════════════════════════════
// GATEWAY INTERFACE
// Implementasi: QrisService
// ══════════════════════════════════════════════════════════════════════════

export interface IPaymentGateway {
  createSnapPayment(params: QrisPaymentRequest): QrisPaymentResponse;
  mapStatus(transactionStatus: string): PaymentStatus;
  verifySignature(..._args: unknown[]): boolean;
}
