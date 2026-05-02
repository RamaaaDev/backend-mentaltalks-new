import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Catches all HttpExceptions and returns a consistent, user-friendly JSON shape.
 *
 * Raw class-validator errors look like:
 *   { message: ["property x should not exist", "x must be a string"], ... }
 *
 * This filter collapses that array into a single friendly string so the
 * frontend never has to deal with raw validation noise.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const raw = exception.getResponse();

    const message = this.resolveMessage(status, raw);

    // Log 5xx errors server-side; 4xx are expected and don't need noise in logs
    if (status >= (HttpStatus.INTERNAL_SERVER_ERROR as number)) {
      this.logger.error(exception.message, exception.stack);
    }

    response.status(status).json({ message, statusCode: status });
  }

  private resolveMessage(status: number, raw: string | object): string {
    // class-validator sends an array of constraint strings — pick the first one
    // that makes sense or fall back to a generic message
    if (typeof raw === 'object' && 'message' in raw) {
      const msg = (raw as { message: unknown }).message;

      if (Array.isArray(msg) && msg.length > 0) {
        // Validation error array — return generic message to avoid leaking
        // internal field names (e.g. "property identifier should not exist")
        return this.friendlyValidationMessage(status);
      }

      if (typeof msg === 'string' && msg.trim()) {
        return msg;
      }
    }

    if (typeof raw === 'string' && raw.trim()) {
      return raw;
    }

    return this.friendlyValidationMessage(status);
  }

  private friendlyValidationMessage(status: number): string {
    const map: Record<number, string> = {
      400: 'Data yang dikirim tidak valid. Periksa kembali isian Anda.',
      401: 'Sesi Anda tidak valid. Silakan masuk kembali.',
      403: 'Anda tidak memiliki akses untuk melakukan tindakan ini.',
      404: 'Data yang diminta tidak ditemukan.',
      409: 'Data sudah digunakan. Silakan gunakan data lain.',
      422: 'Data yang dikirim tidak dapat diproses.',
      429: 'Terlalu banyak permintaan. Silakan coba beberapa saat lagi.',
      500: 'Terjadi kesalahan pada server. Silakan coba beberapa saat lagi.',
    };

    return map[status] ?? 'Terjadi kesalahan. Silakan coba beberapa saat lagi.';
  }
}
