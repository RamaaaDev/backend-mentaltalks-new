/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  IPaymentGateway,
  IpaymuPaymentRequest,
  IpaymuPaymentResponse,
  IpaymuTransactionStatus,
  IpaymuNotificationBody,
  PaymentStatus,
} from './interface/payment.interface';

@Injectable()
export class IpaymuService implements IPaymentGateway {
  private readonly logger = new Logger(IpaymuService.name);

  private readonly apiKey: string;
  private readonly va: string; // Virtual Account iPaymu (nomor merchant)
  private readonly isProduction: boolean;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('IPAYMU_API_KEY');
    this.va = this.configService.getOrThrow<string>('IPAYMU_VA');
    this.isProduction =
      this.configService.get<string>('IPAYMU_ENV', 'sandbox') === 'production';

    this.baseUrl = this.isProduction
      ? 'https://my.ipaymu.com/api/v2'
      : 'https://sandbox.ipaymu.com/api/v2';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Buat signature iPaymu:
   * SHA256("POST" + ":" + SHA256(body) + ":" + va + ":" + api_key + ":" + timestamp)
   */
  private buildSignature(body: unknown, timestamp: string): string {
    const bodyHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(body))
      .digest('hex');

    const raw = `POST:${bodyHash}:${this.va}:${this.apiKey}:${timestamp}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  private getTimestamp(): string {
    // Format: YYYYMMDDHHmmss (WIB / Asia/Jakarta)
    const now = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }),
    );
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds())
    );
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const timestamp = this.getTimestamp();
    const signature = this.buildSignature(body, timestamp);

    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        va: this.va,
        signature,
        timestamp,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as T & {
      Message?: string;
      Status?: number;
    };

    if (!res.ok || (data as Record<string, unknown>).Status === 400) {
      const msg = (data as Record<string, unknown>)?.Message ?? res.statusText;
      this.logger.error(`iPaymu POST ${path} failed: ${msg}`);
      throw new BadRequestException(`iPaymu error: ${msg}`);
    }

    return data;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: createSnapPayment (redirect payment / payment page)
  // ──────────────────────────────────────────────────────────────────────────

  async createSnapPayment(
    params: IpaymuPaymentRequest,
  ): Promise<IpaymuPaymentResponse> {
    const {
      orderId,
      amount,
      buyerName,
      buyerEmail,
      buyerPhone,
      product,
      returnUrl,
      cancelUrl,
      notifyUrl,
    } = params;

    const payload = {
      product: [product.substring(0, 255)],
      qty: [1],
      price: [amount],
      amount,
      returnUrl,
      cancelUrl,
      notifyUrl,
      referenceId: orderId,
      buyerName,
      buyerEmail,
      buyerPhone,
      paymentMethod: '', // kosong = tampilkan semua metode
      paymentChannel: '',
    };

    const data = await this.post<{
      Status: number;
      Message: string;
      Data: { SessionID: string; Url: string };
    }>('/payment', payload);

    this.logger.log(`iPaymu payment URL created for orderId=${orderId}`);

    return {
      token: data.Data.SessionID,
      redirectUrl: data.Data.Url,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: checkTransactionStatus
  // ──────────────────────────────────────────────────────────────────────────

  async checkTransactionStatus(
    orderId: string,
  ): Promise<IpaymuTransactionStatus> {
    const payload = { referenceId: orderId };

    const data = await this.post<{
      Status: number;
      Message: string;
      Data: {
        TransactionId: string;
        ReferenceId: string;
        Status: string; // status code: '1', '2', '4', dll
        PaymentMethod: string;
      };
    }>('/transaction', payload);

    return {
      orderId: data.Data.ReferenceId,
      transactionId: String(data.Data.TransactionId),
      status: this.mapStatus(data.Data.Status),
      paymentType: data.Data.PaymentMethod ?? null,
      raw: data.Data as Record<string, unknown>,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: mapStatus
  // Status iPaymu: 1=Berhasil, 2=Pending, 3=Dibatalkan, 4=Kadaluarsa, 5=Refund
  // ──────────────────────────────────────────────────────────────────────────

  mapStatus(statusCode: string): PaymentStatus {
    switch (String(statusCode)) {
      case '1':
        return 'SUCCESS';
      case '2':
        return 'PENDING';
      case '3':
        return 'FAILED';
      case '4':
        return 'EXPIRED';
      case '5':
        return 'REFUNDED';
      default:
        this.logger.warn(`Unknown iPaymu status code: ${statusCode}`);
        return 'PENDING';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: verifySignature
  // iPaymu webhook signature = SHA256(va + ":" + api_key + ":" + trx_id)
  // ──────────────────────────────────────────────────────────────────────────

  verifySignature(notification: IpaymuNotificationBody): boolean {
    const raw = `${this.va}:${this.apiKey}:${notification.trx_id}`;
    const expected = crypto.createHash('sha256').update(raw).digest('hex');
    const isValid = expected === notification.signature;

    if (!isValid) {
      this.logger.warn(
        `Invalid iPaymu signature for trxId=${notification.trx_id}`,
      );
    }

    return isValid;
  }
}
