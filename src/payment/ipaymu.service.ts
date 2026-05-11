// file baru
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import axios from 'axios';
import {
  IpaymuCreatePaymentParams,
  IpaymuResponse,
  IpaymuTransactionResponse,
} from './interface/payment.interface';
import { AxiosError } from 'axios';

@Injectable()
export class IpaymuService {
  private readonly logger = new Logger(IpaymuService.name);
  private readonly baseUrl: string;
  private readonly va: string;
  private readonly apiKey: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'IPAYMU_BASE_URL',
      'https://sandbox.ipaymu.com',
    );
    this.va = this.configService.get<string>('IPAYMU_VA', '');
    this.apiKey = this.configService.get<string>('IPAYMU_API_KEY', '');
  }

  /**
   * Generate signature iPaymu
   * Format: SHA256(uppercase(method) + ":" + endpoint + ":" + lowercase(body_hash) + ":" + apiKey + ":" + timestamp)
   */
  private generateSignature(body: object): {
    signature: string;
    timestamp: string;
  } {
    const jsonBody = JSON.stringify(body);

    const bodyHash = crypto
      .createHash('sha256')
      .update(jsonBody)
      .digest('hex')
      .toLowerCase();

    const stringToSign = ['POST', this.va, bodyHash, this.apiKey].join(':');

    const signature = crypto
      .createHmac('sha256', this.apiKey)
      .update(stringToSign)
      .digest('hex');

    // timestamp tetap dikirim (required header), tapi TIDAK masuk signature
    const now = new Date();
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    const timestamp =
      now.getFullYear().toString() +
      pad(now.getMonth() + 1) +
      pad(now.getDate()) +
      pad(now.getHours()) +
      pad(now.getMinutes()) +
      pad(now.getSeconds());

    return { signature, timestamp };
  }

  /**
   * Buat payment via iPaymu redirect
   */
  async createRedirectPayment(params: IpaymuCreatePaymentParams): Promise<{
    paymentUrl: string;
    sessionId: string;
    trxId: string;
  }> {
    const endpoint = '/api/v2/payment';
    const body = {
      account: this.va,
      amount: params.amount,
      buyerName: params.buyerName,
      buyerEmail: params.buyerEmail,
      buyerPhone: params.buyerPhone,
      product: [params.product],
      qty: [1],
      price: [params.amount],
      returnUrl: params.returnUrl,
      cancelUrl: params.cancelUrl,
      notifyUrl: params.notifyUrl,
      referenceId: params.orderId,
      comments: `Booking konsultasi psikolog - ${params.orderId}`,
    };

    const { signature, timestamp } = this.generateSignature(body);

    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
        headers: {
          'Content-Type': 'application/json',
          va: this.va,
          signature,
          timestamp,
        },
      });

      const data = response.data as IpaymuResponse;
      if (data.Status !== 200) {
        throw new Error(`iPaymu error: ${data.Message}`);
      }

      return {
        paymentUrl: data.Data.Url,
        sessionId: data.Data.SessionId,
        trxId: data.Data.TransactionId?.toString() ?? '',
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      const axiosError = error as import('axios').AxiosError;

      this.logger.error(
        'iPaymu createPayment error',
        axiosError.response?.data ?? err.message,
      );
      throw error;
    }
  }

  /**
   * Cek status transaksi by trx_id
   */
  async checkTransactionStatus(trxId: string): Promise<{
    status: string;
    statusCode: number;
    paymentMethod: string;
  }> {
    const endpoint = '/api/v2/transaction';
    const body = { account: this.va, transactionId: trxId };
    const { signature, timestamp } = this.generateSignature(body);

    try {
      const response = await axios.post(`${this.baseUrl}${endpoint}`, body, {
        headers: {
          'Content-Type': 'application/json',
          va: this.va,
          signature,
          timestamp,
        },
      });

      const data = response.data as IpaymuTransactionResponse;
      return {
        statusCode: data.Data?.Status ?? 1,
        status: this.mapStatus(data.Data?.Status),
        paymentMethod: data.Data?.PaymentMethod ?? '',
      };
    } catch (error) {
      if (error instanceof AxiosError) {
        this.logger.error('iPaymu checkStatus error', error.response?.data);
      } else if (error instanceof Error) {
        this.logger.error('iPaymu checkStatus error', error.message);
      }
      throw error;
    }
  }

  /**
   * Map status code iPaymu ke string
   * 1 = pending, 2 = success, 3 = failed, 4 = expired
   */
  mapStatus(code: number | string): string {
    const map: Record<string, string> = {
      '1': 'PENDING',
      '2': 'SUCCESS',
      '3': 'FAILED',
      '4': 'EXPIRED',
    };
    return map[String(code)] ?? 'UNKNOWN';
  }
}
