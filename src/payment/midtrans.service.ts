/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import type {
  IPaymentGateway,
  MidtransSnapRequest,
  MidtransSnapResponse,
  MidtransTransactionStatus,
  MidtransNotificationBody,
  PaymentStatus,
} from './interface/payment.interface';

@Injectable()
export class MidtransService implements IPaymentGateway {
  private readonly logger = new Logger(MidtransService.name);

  private readonly serverKey: string;
  private readonly isProduction: boolean;
  private readonly snapBaseUrl: string;
  private readonly coreBaseUrl: string;

  constructor(private configService: ConfigService) {
    this.serverKey = this.configService.getOrThrow<string>(
      'MIDTRANS_SERVER_KEY',
    );
    this.isProduction =
      this.configService.get<string>('MIDTRANS_ENV', 'sandbox') ===
      'production';

    this.snapBaseUrl = this.isProduction
      ? 'https://app.midtrans.com/snap/v1'
      : 'https://app.sandbox.midtrans.com/snap/v1';

    this.coreBaseUrl = this.isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  private get authHeader(): string {
    return `Basic ${Buffer.from(`${this.serverKey}:`).toString('base64')}`;
  }

  private async post<T>(url: string, body: unknown): Promise<T> {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: this.authHeader,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json()) as T & { error_messages?: string[] };

    if (!res.ok) {
      const errorMessages = (data as Record<string, unknown>)?.error_messages;
      const errors = Array.isArray(errorMessages)
        ? (errorMessages as string[]).join(', ')
        : res.statusText;
      this.logger.error(`Midtrans POST ${url} failed: ${errors}`);
      throw new BadRequestException(`Midtrans error: ${errors}`);
    }

    return data;
  }

  private async get<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: this.authHeader,
      },
    });

    const data = (await res.json()) as T;

    if (!res.ok) {
      this.logger.error(`Midtrans GET ${url} failed: ${res.statusText}`);
      throw new BadRequestException(`Midtrans error: ${res.statusText}`);
    }

    return data;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: createSnapPayment
  // ──────────────────────────────────────────────────────────────────────────

  async createSnapPayment(
    params: MidtransSnapRequest,
  ): Promise<MidtransSnapResponse> {
    const { orderId, amount, buyerName, buyerEmail, buyerPhone, product } =
      params;

    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [
        {
          id: orderId,
          price: amount,
          quantity: 1,
          name: product.substring(0, 50), // Midtrans max 50 chars
        },
      ],
      customer_details: {
        first_name: buyerName,
        email: buyerEmail,
        phone: buyerPhone,
      },
      callbacks: {
        finish: params.returnUrl,
        unfinish: params.cancelUrl,
        error: params.cancelUrl,
      },
    };

    const data = await this.post<{ token: string; redirect_url: string }>(
      `${this.snapBaseUrl}/transactions`,
      payload,
    );

    this.logger.log(`Snap token created for orderId=${orderId}`);

    return {
      token: data.token,
      redirectUrl: data.redirect_url,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: checkTransactionStatus
  // ──────────────────────────────────────────────────────────────────────────

  async checkTransactionStatus(
    orderId: string,
  ): Promise<MidtransTransactionStatus> {
    const data = await this.get<Record<string, string>>(
      `${this.coreBaseUrl}/${orderId}/status`,
    );

    return {
      orderId: data.order_id,
      transactionId: data.transaction_id,
      status: this.mapStatus(data.transaction_status, data.fraud_status),
      paymentType: data.payment_type ?? null,
      fraudStatus: data.fraud_status,
      raw: data,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: mapStatus
  // ──────────────────────────────────────────────────────────────────────────

  mapStatus(transactionStatus: string, fraudStatus?: string): PaymentStatus {
    switch (transactionStatus) {
      case 'capture':
        // Untuk kartu kredit, cek fraud_status
        return fraudStatus === 'challenge' ? 'PENDING' : 'SUCCESS';
      case 'settlement':
        return 'SUCCESS';
      case 'pending':
        return 'PENDING';
      case 'deny':
      case 'cancel':
        return 'FAILED';
      case 'expire':
        return 'EXPIRED';
      case 'refund':
      case 'partial_refund':
        return 'REFUNDED';
      default:
        this.logger.warn(`Unknown Midtrans status: ${transactionStatus}`);
        return 'PENDING';
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PUBLIC: verifySignature
  // ──────────────────────────────────────────────────────────────────────────

  verifySignature(notification: MidtransNotificationBody): boolean {
    // Midtrans signature = SHA512(order_id + status_code + gross_amount + server_key)
    const raw = `${notification.order_id}${notification.status_code}${notification.gross_amount}${this.serverKey}`;
    const expected = crypto.createHash('sha512').update(raw).digest('hex');
    const isValid = expected === notification.signature_key;

    if (!isValid) {
      this.logger.warn(
        `Invalid Midtrans signature for orderId=${notification.order_id}`,
      );
    }

    return isValid;
  }
}
