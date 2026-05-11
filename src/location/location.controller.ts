import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import { LocationService } from './location.service';

// ── PUBLIC ────────────────────────────────────────────────────────────────────
@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  findAll() {
    return this.locationService.findAll();
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.findOne(id);
  }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
@Controller('admin/locations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class LocationAdminController {
  constructor(private readonly locationService: LocationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateLocationDto) {
    return this.locationService.create(dto);
  }

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    return this.locationService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.locationService.remove(id);
  }
}
