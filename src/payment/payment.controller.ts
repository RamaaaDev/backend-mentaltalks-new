import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import type {
  CreatePaymentDto,
  IpaymuNotificationBody,
} from './interface/payment.interface';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * POST /payments — User buat payment untuk booking
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @HttpCode(HttpStatus.CREATED)
  createPayment(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentService.createPayment(req.user.user_id, dto.bookingId);
  }

  /**
   * GET /payments/me — Riwayat payment user sendiri
   */
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  getMyPayments(
    @Req() req: AuthenticatedRequest,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.paymentService.getMyPayments(req.user.user_id, page, limit);
  }

  /**
   * GET /payments/status/:orderId — Cek status payment (re-check ke iPaymu)
   */
  @Get('status/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  checkStatus(
    @Req() req: AuthenticatedRequest,
    @Param('orderId') orderId: string,
  ) {
    return this.paymentService.checkPaymentStatus(req.user.user_id, orderId);
  }

  /**
   * POST /payments/callback — Webhook iPaymu (tanpa auth)
   * iPaymu akan POST ke sini setelah setiap perubahan status transaksi.
   * Signature diverifikasi di dalam service.
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  handleCallback(@Body() body: IpaymuNotificationBody) {
    return this.paymentService.handleCallback(body);
  }
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class PaymentAdminController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  adminGetAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.paymentService.adminGetAllPayments(page, limit, status);
  }
}
