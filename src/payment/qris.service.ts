import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  IPaymentGateway,
  QrisPaymentRequest,
  QrisPaymentResponse,
  PaymentStatus,
} from './interface/payment.interface';

/**
 * QrisService — pengganti MidtransService.
 *
 * Karena QRIS statis (1 barcode untuk semua transaksi), service ini hanya:
 *  1. Menyediakan URL gambar QRIS dari env (QRIS_IMAGE_URL)
 *  2. Menyediakan helper mapStatus untuk dipakai PaymentService
 *
 * Konfirmasi pembayaran dilakukan manual oleh admin via endpoint /payments/callback.
 */
@Injectable()
export class QrisService implements IPaymentGateway {
  private readonly logger = new Logger(QrisService.name);
  private readonly qrisImageUrl: string;

  constructor(private configService: ConfigService) {
    this.qrisImageUrl = this.configService.getOrThrow<string>('QRIS_IMAGE_URL');
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: createSnapPayment
  // Nama method sengaja dipertahankan agar PaymentService tidak perlu diubah
  // banyak — hanya tipe return yang berbeda.
  // ──────────────────────────────────────────────────────────────────────────

  createSnapPayment(params: QrisPaymentRequest): QrisPaymentResponse {
    this.logger.log(
      `QRIS payment order created: orderId=${params.orderId}, amount=${params.amount}`,
    );

    // Untuk QRIS statis tidak ada token dari gateway.
    // Kita pakai orderId sebagai "token" agar struktur DB tidak berubah.
    return {
      token: params.orderId,
      redirectUrl: '', // tidak dipakai untuk QRIS statis
      qrisImageUrl: this.qrisImageUrl,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: mapStatus
  // Dipakai PaymentService saat admin konfirmasi manual.
  // ──────────────────────────────────────────────────────────────────────────

  mapStatus(transactionStatus: string): PaymentStatus {
    switch (transactionStatus) {
      case 'success':
      case 'settlement':
        return 'SUCCESS';
      case 'pending':
        return 'PENDING';
      case 'failed':
      case 'cancel':
        return 'FAILED';
      case 'expired':
        return 'EXPIRED';
      case 'refund':
        return 'REFUNDED';
      default:
        this.logger.warn(`Unknown status: ${transactionStatus}`);
        return 'PENDING';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: verifySignature
  // Dipertahankan agar interface tetap kompatibel — untuk QRIS statis
  // verifikasi dilakukan lewat session/role admin, bukan signature,
  // sehingga selalu return true di sini.
  // ──────────────────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  verifySignature(..._args: unknown[]): boolean {
    return true;
  }
}
