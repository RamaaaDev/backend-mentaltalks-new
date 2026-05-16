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
  CreatePaymentIntentDto,
  MidtransNotificationBody,
} from './interface/payment.interface';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('intent')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @HttpCode(HttpStatus.CREATED)
  createPaymentIntent(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreatePaymentIntentDto,
  ) {
    return this.paymentService.createPaymentIntent(req.user.user_id, dto);
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
   * GET /payments/status/:orderId — Cek status payment (re-check ke Midtrans)
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
   * POST /payments/callback — Webhook Midtrans (tanpa auth)
   * Midtrans akan POST ke sini setelah setiap perubahan status transaksi.
   * Signature key diverifikasi di dalam service.
   */
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  handleCallback(@Body() body: MidtransNotificationBody) {
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
