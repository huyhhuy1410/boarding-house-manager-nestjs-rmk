import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AuthService } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeterReadingDto } from './dto/create-meter-reading.dto';
import { GetMeterReadingsQueryDto } from './dto/get-meter-readings-query.dto';
import { mapMeterReadingResponse } from './dto/meter-reading-response.dto';
@Injectable()
export class MeterReadingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateMeterReadingDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    try {
      return await this.prisma.$transaction(async (tx) => {
        const room = await tx.room.findFirst({
          where: {
            id: dto.roomId,
            house: {
              ownerId: owner.id,
            },
          },
          select: {
            id: true,
          },
        });

        if (!room) {
          throw new NotFoundException('Room not found.');
        }

        const previousReading = await tx.meterReading.findFirst({
          where: {
            roomId: room.id,
            OR: [
              { year: { lt: dto.year } },
              {
                year: dto.year,
                month: { lt: dto.month },
              },
            ],
          },
          orderBy: [{ year: 'desc' }, { month: 'desc' }],
          select: {
            electricity: true,
            water: true,
          },
        });

        if (
          previousReading &&
          (dto.electricity < previousReading.electricity ||
            dto.water < previousReading.water)
        ) {
          throw new BadRequestException(
            'New meter readings cannot be lower than the previous readings.',
          );
        }

        const reading = await tx.meterReading.create({
          data: {
            roomId: room.id,
            month: dto.month,
            year: dto.year,
            electricity: dto.electricity,
            water: dto.water,
          },
        });

        return mapMeterReadingResponse(reading);
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'A meter reading already exists for this room and period.',
        );
      }

      throw error;
    }
  }
  async findAll(query: GetMeterReadingsQueryDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const room = await this.prisma.room.findFirst({
      where: {
        id: query.roomId,
        house: {
          ownerId: owner.id,
        },
      },
      select: { id: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    const readings = await this.prisma.meterReading.findMany({
      where: {
        roomId: room.id,
        ...(query.month !== undefined && { month: query.month }),
        ...(query.year !== undefined && { year: query.year }),
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return readings.map((reading) => mapMeterReadingResponse(reading));
  }
}
