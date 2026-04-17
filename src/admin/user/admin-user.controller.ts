import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from 'src/auth/guards/roles.guard';
import { AdminUserService } from './admin-user.service';
import type { AuthenticatedRequest } from 'src/common/interface/authenticated-request.interface';
import { UpdateUserDto } from '../dto/admin-user.dto';

@Controller('admin/user')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  /**
   * GET /users
   * Daftar semua user
   * Query params: page, limit, role, isActive, search
   */
  @Get()
  @Roles('ADMIN')
  findAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const isActiveBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;

    return this.adminUserService.findAllUsers({
      page,
      limit,
      role,
      isActive: isActiveBool,
      search,
    });
  }

  /**
   * GET /users/:id
   * Detail satu user berdasarkan ID — khusus ADMIN
   */
  @Get(':id')
  @Roles('ADMIN')
  findUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminUserService.findUserById(id);
  }

  @Patch(':id')
  @Roles('ADMIN')
  updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: UpdateUserDto,
  ) {
    return this.adminUserService.updateProfile(
      req.user.user_id,
      req.user.user_role,
      id,
      dto,
    );
  }
}
