import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLocationDto, UpdateLocationDto } from './dto/location.dto';
import {
  ICreateLocationBody,
  ILocationDeleteResponse,
  ILocationListResponse,
  ILocationResponse,
  IUpdateLocationBody,
} from './location.interface';

@Injectable()
export class LocationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateLocationDto): Promise<ILocationResponse> {
    const data: ICreateLocationBody = {
      location_name: dto.location_name,
      location_address: dto.location_address,
      location_addressDetail: dto.location_addressDetail,
      location_photos: dto.location_photos ?? [],
    };

    const location = await this.prisma.locationOffice.create({ data });

    return {
      message: 'Location created successfully',
      data: location,
    };
  }

  async findAll(): Promise<ILocationListResponse> {
    const locations = await this.prisma.locationOffice.findMany({
      orderBy: { location_createdAt: 'desc' },
      include: {
        _count: {
          select: {
            location_review: true,
            location_schedules: true,
          },
        },
      },
    });

    return {
      message: 'Locations retrieved successfully',
      data: locations,
    };
  }

  async findOne(id: string): Promise<ILocationResponse> {
    const location = await this.prisma.locationOffice.findUnique({
      where: { location_id: id },
      include: {
        location_review: true,
        location_schedules: true,
      },
    });

    if (!location) {
      throw new NotFoundException(`Location with id ${id} not found`);
    }

    return {
      message: 'Location retrieved successfully',
      data: location,
    };
  }

  async update(id: string, dto: UpdateLocationDto): Promise<ILocationResponse> {
    await this.findOne(id);

    const data: IUpdateLocationBody = {
      ...(dto.location_name !== undefined && {
        location_name: dto.location_name,
      }),
      ...(dto.location_address !== undefined && {
        location_address: dto.location_address,
      }),
      ...(dto.location_addressDetail !== undefined && {
        location_addressDetail: dto.location_addressDetail,
      }),
      ...(dto.location_photos !== undefined && {
        location_photos: dto.location_photos,
      }),
    };

    const updated = await this.prisma.locationOffice.update({
      where: { location_id: id },
      data,
    });

    return {
      message: 'Location updated successfully',
      data: updated,
    };
  }

  async remove(id: string): Promise<ILocationDeleteResponse> {
    await this.findOne(id);

    await this.prisma.locationOffice.delete({
      where: { location_id: id },
    });

    return { message: 'Location deleted successfully' };
  }
}
