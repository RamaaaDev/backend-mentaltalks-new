import { IsString, IsUUID } from 'class-validator';

export interface CreateMeetingRoomInput {
  bookingId: string;
  psychologistId: string;
  userId: string;
  scheduleAt: Date;
}

export class JoinMeetingDto {
  // Tidak perlu body — diambil dari JWT user_id
}

export class EndMeetingDto {
  // Admin / psikolog bisa force-end meeting
}
