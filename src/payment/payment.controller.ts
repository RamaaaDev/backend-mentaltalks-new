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
import type { AdminConfirmPaymentDto } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import type {
  CreatePaymentIntentDto,
  SubmitReferenceDto,
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
   * POST /payments/reference — User submit nomor referensi setelah bayar QRIS
   *
   * Status payment tetap PENDING setelah ini.
   * Admin yang akan konfirmasi via POST /payments/callback.
   *
   * Body:
   *  - orderId: string
   *  - referenceNumber: string
   */
  @Post('reference')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER')
  @HttpCode(HttpStatus.OK)
  submitReference(
    @Req() req: AuthenticatedRequest,
    @Body() body: SubmitReferenceDto,
  ) {
    return this.paymentService.submitReferenceNumber(
      req.user.user_id,
      body.orderId,
      body.referenceNumber,
    );
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
    @Query('status') status?: string,
  ) {
    return this.paymentService.getMyPayments(
      req.user.user_id,
      page,
      limit,
      status,
    );
  }

  /**
   * GET /payments/status/:orderId — Cek status payment dari DB
   * (QRIS statis: tidak re-check ke gateway, status ditentukan admin)
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
   * POST /payments/callback — Konfirmasi pembayaran QRIS oleh ADMIN
   *
   * Body:
   *  - orderId: string
   *  - referenceNumber: string  → nomor referensi dari user / mutasi rekening
   *  - transactionStatus: 'success' | 'failed'
   */
  @Post('callback')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  handleCallback(@Body() body: AdminConfirmPaymentDto) {
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
