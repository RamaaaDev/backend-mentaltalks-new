import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StreamService } from './stream.service';
import { v4 as uuidv4 } from 'uuid';
import { Prisma, Role } from '@prisma/client';

@Injectable()
export class MeetingService {
  constructor(
    private prisma: PrismaService,
    private streamService: StreamService,
  ) {}

  // ══════════════════════════════════════════════════════════════════════════
  // INTERNAL — dipanggil setelah payment sukses
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Otomatis buat MeetingRoom setelah payment sukses
   * Jika ONLINE → buat Stream.io call
   */
  async createMeetingAfterPayment(bookingId: string) {
    const booking = await this.prisma.bookingPsychologist.findUnique({
      where: { booking_id: bookingId },
      include: {
        booking_schedule: true,
        booking_psychologist: { select: { psychologist_userId: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking tidak ditemukan');

    // Pastikan belum ada meeting room
    const existing = await this.prisma.meetingRoom.findUnique({
      where: { booking_id: bookingId },
    });
    if (existing) return existing;

    const meetingId = uuidv4(); // jadi callId di Stream.io juga

    // Buat Stream call jika ONLINE
    if (booking.booking_type === 'ONLINE') {
      await this.streamService.createCall({
        callId: meetingId,
        hostId: booking.booking_psychologist.psychologist_userId,
        participantId: booking.booking_userId,
        scheduledAt: booking.booking_schedule.schedule_startTime,
      });
    }

    // Simpan MeetingRoom ke DB
    const meeting = await this.prisma.meetingRoom.create({
      data: {
        meeting_id: meetingId,
        booking_id: bookingId,
        meeting_hostId: booking.booking_psychologistId,
        meeting_participantId: booking.booking_userId,
        meeting_scheduleAt: booking.booking_schedule.schedule_startTime,
        meeting_status: 'SCHEDULED',
      },
    });

    // Notifikasi ke user & psikolog
    await this.prisma.notication.createMany({
      data: [
        {
          notification_userId: booking.booking_userId,
          notification_title: 'Sesi Konsultasi Terjadwal',
          notification_body: `Sesi konsultasi Anda telah dikonfirmasi pada ${booking.booking_schedule.schedule_startTime.toLocaleString('id-ID')}.`,
          notification_type: 'MEETING',
          notification_referenceId: 'MEETINGID',
        },
        {
          notification_userId: booking.booking_psychologist.psychologist_userId,
          notification_title: 'Sesi Baru Terjadwal',
          notification_body: `Ada sesi konsultasi baru terjadwal pada ${booking.booking_schedule.schedule_startTime.toLocaleString('id-ID')}.`,
          notification_type: 'MEETING',
          notification_referenceId: 'MEETINGID',
        },
      ],
    });

    return meeting;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GET MEETING DETAIL
  // ══════════════════════════════════════════════════════════════════════════

  async getMeetingDetail(userId: string, meetingId: string, userRole: Role) {
    const meeting = await this.prisma.meetingRoom.findUnique({
      where: { meeting_id: meetingId },
      include: {
        booking: {
          include: {
            booking_schedule: {
              include: { schedule_location: true },
            },
            booking_payment: { select: { status: true, grossAmount: true } },
          },
        },
        host: {
          select: {
            psychologist_id: true,
            psychologist_name: true,
            psychologist_userId: true,
            psychologist_specialties: true,
            psychologist_user: { select: { user_photos: true } },
          },
        },
        participant: {
          select: { user_id: true, user_name: true, user_photos: true },
        },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting tidak ditemukan');

    // Validasi akses: hanya peserta / psikolog host / admin
    const isParticipant = meeting.meeting_participantId === userId;
    const isHost = meeting.host.psychologist_userId === userId;
    if (userRole !== 'ADMIN' && !isParticipant && !isHost) {
      throw new ForbiddenException('Akses ditolak');
    }

    // Jika ONLINE: generate Stream token untuk user yang request
    let streamToken: string | null = null;
    let callId: string | null = null;
    if (meeting.booking.booking_type === 'ONLINE') {
      streamToken = this.streamService.generateUserToken(userId);
      callId = meeting.meeting_id;
    }

    return {
      data: {
        ...meeting,
        stream:
          meeting.booking.booking_type === 'ONLINE'
            ? {
                callId,
                callType: 'default',
                token: streamToken,
                apiKey: process.env.STREAM_API_KEY,
              }
            : null,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // JOIN STREAM — generate token saat user klik "Mulai Sesi"
  // ══════════════════════════════════════════════════════════════════════════

  async joinStream(userId: string, meetingId: string) {
    const meeting = await this.prisma.meetingRoom.findUnique({
      where: { meeting_id: meetingId },
      include: {
        booking: {
          include: {
            booking_schedule: true,
          },
        },
        host: { select: { psychologist_userId: true } },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting tidak ditemukan');

    // 🔐 ACCESS CONTROL
    const isParticipant = meeting.meeting_participantId === userId;
    const isHost = meeting.host.psychologist_userId === userId;

    if (!isParticipant && !isHost) {
      throw new ForbiddenException('Akses ditolak');
    }

    // 🔐 VALIDASI TIPE
    if (meeting.booking.booking_type !== 'ONLINE') {
      throw new BadRequestException('Sesi ini bukan tipe online');
    }

    // 🔐 VALIDASI STATUS MEETING
    if (
      meeting.meeting_status === 'ENDED' ||
      meeting.meeting_status === 'CANCELED'
    ) {
      throw new BadRequestException('Sesi sudah berakhir atau dibatalkan');
    }

    // 🔥 VALIDASI STATUS BOOKING
    const booking = meeting.booking;
    const schedule = booking.booking_schedule;

    if (booking.booking_status !== 'PROGRESS') {
      throw new ForbiddenException('Sesi belum aktif (booking belum PROGRESS)');
    }

    // ⏱ VALIDASI WAKTU SESI
    const now = new Date();
    const start = new Date(schedule.schedule_startTime);
    const end = new Date(schedule.schedule_endTime);

    if (now < start) {
      throw new ForbiddenException('Sesi belum dimulai');
    }

    if (now > end) {
      throw new ForbiddenException('Sesi sudah berakhir');
    }

    // 🚀 UPDATE STATUS LIVE (host only)
    if (isHost && meeting.meeting_status === 'SCHEDULED') {
      await this.prisma.meetingRoom.update({
        where: { meeting_id: meetingId },
        data: {
          meeting_status: 'LIVE',
          meeting_startedAt: new Date(),
        },
      });
    }

    // 🎟 STREAM TOKEN
    const token = this.streamService.generateUserToken(userId);

    return {
      data: {
        callId: meeting.meeting_id,
        callType: 'default',
        token,
        apiKey: process.env.STREAM_API_KEY,
      },
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // END MEETING — hanya host (psikolog)
  // ══════════════════════════════════════════════════════════════════════════

  async endMeeting(userId: string, meetingId: string) {
    const meeting = await this.prisma.meetingRoom.findUnique({
      where: { meeting_id: meetingId },
      include: {
        host: { select: { psychologist_userId: true } },
        booking: { select: { booking_type: true, booking_id: true } },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting tidak ditemukan');
    if (meeting.host.psychologist_userId !== userId) {
      throw new ForbiddenException(
        'Hanya psikolog host yang dapat mengakhiri sesi',
      );
    }
    if (meeting.meeting_status === 'ENDED') {
      throw new BadRequestException('Sesi sudah berakhir');
    }

    // Akhiri call di Stream.io jika online
    if (meeting.booking.booking_type === 'ONLINE') {
      await this.streamService.endCall(meetingId);
    }

    // Update DB
    await this.prisma.$transaction([
      this.prisma.meetingRoom.update({
        where: { meeting_id: meetingId },
        data: { meeting_status: 'ENDED', meeting_endedAt: new Date() },
      }),
      this.prisma.bookingPsychologist.update({
        where: { booking_id: meeting.booking.booking_id },
        data: { booking_status: 'DONE' },
      }),
    ]);

    return { message: 'Sesi berhasil diakhiri' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANCEL — admin atau sebelum LIVE
  // ══════════════════════════════════════════════════════════════════════════

  async cancelMeeting(userId: string, meetingId: string, userRole: string) {
    const meeting = await this.prisma.meetingRoom.findUnique({
      where: { meeting_id: meetingId },
      include: {
        host: { select: { psychologist_userId: true } },
        booking: { select: { booking_type: true, booking_id: true } },
      },
    });

    if (!meeting) throw new NotFoundException('Meeting tidak ditemukan');

    const isHost = meeting.host.psychologist_userId === userId;
    const isAdmin = userRole === 'ADMIN';
    if (!isHost && !isAdmin) throw new ForbiddenException('Akses ditolak');

    if (meeting.meeting_status === 'LIVE') {
      throw new BadRequestException(
        'Tidak bisa membatalkan sesi yang sedang berlangsung',
      );
    }
    if (meeting.meeting_status === 'ENDED') {
      throw new BadRequestException('Sesi sudah berakhir');
    }

    if (meeting.booking.booking_type === 'ONLINE') {
      await this.streamService.deleteCall(meetingId);
    }

    await this.prisma.meetingRoom.update({
      where: { meeting_id: meetingId },
      data: { meeting_status: 'CANCELED' },
    });

    return { message: 'Sesi berhasil dibatalkan' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DAFTAR MEETING
  // ══════════════════════════════════════════════════════════════════════════

  async getMyMeetings(userId: string, userRole: Role, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const where: Prisma.MeetingRoomWhereInput = {};

    if (userRole === 'USER') {
      where.meeting_participantId = userId;
    } else if (userRole === 'PSYCHOLOGIST') {
      // Cari psychologist_id dulu
      const profile = await this.prisma.psychologistProfile.findUnique({
        where: { psychologist_userId: userId },
        select: { psychologist_id: true },
      });
      if (!profile)
        throw new NotFoundException('Profil psikolog tidak ditemukan');
      where.meeting_hostId = profile.psychologist_id;
    }

    const [data, total] = await Promise.all([
      this.prisma.meetingRoom.findMany({
        where,
        include: {
          host: {
            select: {
              psychologist_name: true,
              psychologist_user: { select: { user_photos: true } },
            },
          },
          participant: { select: { user_name: true, user_photos: true } },
          booking: {
            select: {
              booking_type: true,
              booking_schedule: {
                select: { schedule_startTime: true, schedule_endTime: true },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { meeting_scheduleAt: 'desc' },
      }),
      this.prisma.meetingRoom.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── CHAT messages dalam meeting ───────────────────────────────────────────

  async getMeetingMessages(userId: string, meetingId: string) {
    const meeting = await this.prisma.meetingRoom.findUnique({
      where: { meeting_id: meetingId },
      include: { host: { select: { psychologist_userId: true } } },
    });

    if (!meeting) throw new NotFoundException('Meeting tidak ditemukan');

    const isParticipant = meeting.meeting_participantId === userId;
    const isHost = meeting.host.psychologist_userId === userId;
    if (!isParticipant && !isHost)
      throw new ForbiddenException('Akses ditolak');

    const messages = await this.prisma.meetingMessage.findMany({
      where: { meetingMessage_roomId: meetingId },
      include: {
        sender: { select: { user_name: true, user_photos: true } },
      },
      orderBy: { meetingMessage_createdAt: 'asc' },
    });

    return { data: messages };
  }
}
