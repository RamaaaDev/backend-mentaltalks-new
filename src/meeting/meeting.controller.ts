import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { MeetingService } from './meeting.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';

@Controller('meetings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER', 'PSYCHOLOGIST', 'ADMIN')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  /**
   * GET /meetings/me — Daftar meeting saya
   */
  @Get('me')
  getMyMeetings(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.meetingService.getMyMeetings(
      req.user.user_id,
      req.user.user_role,
      page,
      limit,
    );
  }

  /**
   * GET /meetings/:id — Detail meeting + stream token jika ONLINE
   */
  @Get(':id')
  getMeetingDetail(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.meetingService.getMeetingDetail(
      req.user.user_id,
      id,
      req.user.user_role,
    );
  }

  /**
   * POST /meetings/:id/join — Dapatkan Stream token + update status LIVE
   * Dipakai saat user/psikolog klik tombol "Mulai Sesi"
   */
  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  joinStream(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.meetingService.joinStream(req.user.user_id, id);
  }

  /**
   * PATCH /meetings/:id/end — Akhiri sesi (hanya host/psikolog)
   */
  @Patch(':id/end')
  @Roles('PSYCHOLOGIST')
  @HttpCode(HttpStatus.OK)
  endMeeting(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.meetingService.endMeeting(req.user.user_id, id);
  }

  /**
   * PATCH /meetings/:id/cancel — Batalkan sesi (host atau admin)
   */
  @Patch(':id/cancel')
  @Roles('PSYCHOLOGIST', 'ADMIN')
  @HttpCode(HttpStatus.OK)
  cancelMeeting(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.meetingService.cancelMeeting(
      req.user.user_id,
      id,
      req.user.user_role,
    );
  }

  /**
   * GET /meetings/:id/messages — Riwayat pesan dalam sesi
   */
  @Get(':id/messages')
  getMessages(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.meetingService.getMeetingMessages(req.user.user_id, id);
  }
}
