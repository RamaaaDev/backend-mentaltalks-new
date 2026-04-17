import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StreamClient } from '@stream-io/node-sdk';

@Injectable()
export class StreamService {
  private readonly logger = new Logger(StreamService.name);
  private client: StreamClient;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('STREAM_API_KEY', '');
    const apiSecret = this.configService.get<string>('STREAM_API_SECRET', '');
    this.client = new StreamClient(apiKey, apiSecret);
  }

  /**
   * Generate user token untuk join call dari frontend
   */
  generateUserToken(userId: string): string {
    // Token berlaku 24 jam
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
    return this.client.generateUserToken({ user_id: userId, exp: expiresAt });
  }

  /**
   * Buat call room 1-on-1 di Stream.io
   * callId = meeting_id (UUID yang kita generate)
   * Max 2 participant → diset via permission/limit
   */
  async createCall(params: {
    callId: string;
    hostId: string;
    participantId: string;
    scheduledAt: Date;
  }): Promise<{ callId: string; callType: string }> {
    const call = this.client.video.call('default', params.callId);

    await call.getOrCreate({
      data: {
        created_by_id: params.hostId,
        members: [
          { user_id: params.hostId, role: 'host' },
          { user_id: params.participantId, role: 'user' },
        ],
        settings_override: {
          limits: {
            max_duration_seconds: 3600, // max 1 jam per sesi
            max_participants: 2, // 1-on-1 only
          },
          recording: {
            mode: 'disabled', // aktifkan jika mau recording
          },
        },
        starts_at: params.scheduledAt,
        custom: {
          type: 'psychologist_session',
          scheduled_at: params.scheduledAt.toISOString(),
        },
      },
    });

    this.logger.log(`Stream call dibuat: ${params.callId}`);
    return { callId: params.callId, callType: 'default' };
  }

  /**
   * Akhiri / tutup call
   */
  async endCall(callId: string): Promise<void> {
    try {
      const call = this.client.video.call('default', callId);
      await call.end();
      this.logger.log(`Stream call diakhiri: ${callId}`);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Gagal mengakhiri call ${callId}: ${err.message}`);
    }
  }

  async deleteCall(callId: string): Promise<void> {
    try {
      const call = this.client.video.call('default', callId);
      await call.delete();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.logger.warn(`Gagal menghapus call ${callId}: ${err.message}`);
    }
  }
}
