import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { CouponService } from './coupon.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  QueryCouponDto,
  ApplyCouponDto,
} from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';

// ── PUBLIC / ALL AUTHENTICATED ROLES ─────────────────────────────────────────
@Controller('coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'PSYCHOLOGIST', 'USER')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  /**
   * GET /coupons
   * Ambil semua kupon dengan pagination & filter
   */
  @Get()
  findAll(@Query() query: QueryCouponDto) {
    return this.couponService.findAll(query);
  }

  /**
   * GET /coupons/:id
   * Ambil detail satu kupon berdasarkan ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponService.findOne(id);
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
@Controller('admin/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class CouponAdminController {
  constructor(private readonly couponService: CouponService) {}

  /**
   * POST /admin/coupons
   * Buat kupon baru
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateCouponDto) {
    return this.couponService.create(dto);
  }

  /**
   * PATCH /admin/coupons/:id
   * Update kupon
   */
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  /**
   * DELETE /admin/coupons/:id
   * Hapus kupon (hanya jika belum digunakan dalam booking)
   */
  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponService.remove(id);
  }
}

// ── USER ──────────────────────────────────────────────────────────────────────
@Controller('user/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('USER')
export class CouponUserController {
  constructor(private readonly couponService: CouponService) {}

  /**
   * POST /user/coupons/apply
   * Validasi kode kupon & preview kalkulasi diskon (tidak mengubah DB)
   */
  @Post('apply')
  apply(@Req() req: AuthenticatedRequest, @Body() dto: ApplyCouponDto) {
    return this.couponService.apply(req.user.user_id, dto);
  }

  /**
   * POST /user/coupons/:id/use
   * Tandai kupon sebagai terpakai setelah booking sukses
   */
  @Post(':id/use')
  @HttpCode(HttpStatus.OK)
  markAsUsed(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.couponService.markAsUsed(req.user.user_id, id);
  }
}
