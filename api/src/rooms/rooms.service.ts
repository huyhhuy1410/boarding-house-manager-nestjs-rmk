import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { ContractStatus, Prisma } from '../generated/prisma/client';
import { UpdateRoomDto } from './dto/update-room.dto';
import { mapRoomResponse } from './dto/room-response.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(dto: CreateRoomDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const house = await this.prisma.boardingHouse.findFirst({
      where: {
        id: dto.houseId,
        ownerId: owner.id,
      },
      select: {
        id: true,
      },
    });
    if (!house) {
      throw new NotFoundException('Boarding house not found.');
    }

    try {
      const room = await this.prisma.room.create({
        data: {
          code: dto.code,
          rentAmount: dto.rentAmount,
          houseId: house.id,
        },
      });

      return mapRoomResponse(room);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Room code already exists in this house.');
      }

      throw error;
    }
  }

  async findAll(authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const rooms = await this.prisma.room.findMany({
      where: {
        house: {
          ownerId: owner.id,
        },
      },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return rooms.map((room) =>
      mapRoomResponse({
        ...room,
        contract: room.contracts?.[0],
      } as unknown as any),
    );
  }

  async findOne(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        house: {
          ownerId: owner.id,
        },
      },
      include: {
        contracts: {
          where: { status: 'ACTIVE' },
          include: { tenant: true },
          take: 1,
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    return mapRoomResponse({
      ...room,
      contract: room.contracts?.[0],
    });
  }

  async update(id: string, dto: UpdateRoomDto, authUserId: string) {
    if (dto.code === undefined && dto.rentAmount === undefined) {
      throw new BadRequestException(
        'At least one room field must be provided.',
      );
    }

    const owner = await this.authService.requireApplicationUser(authUserId);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        house: {
          ownerId: owner.id,
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    try {
      const updatedRoom = await this.prisma.room.update({
        where: { id },
        data: {
          code: dto.code,
          rentAmount: dto.rentAmount,
        },
      });

      return mapRoomResponse(updatedRoom);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Room code already exists in this house.');
      }

      throw error;
    }
  }

  async remove(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const room = await this.prisma.room.findFirst({
      where: {
        id,
        house: { ownerId: owner.id },
      },
      include: {
        contracts: {
          where: { status: ContractStatus.ACTIVE },
          select: { id: true },
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    if (room.contracts.length > 0) {
      throw new ConflictException('Cannot delete room with active contracts.');
    }

    const deleted = await this.prisma.room.delete({ where: { id } });
    return mapRoomResponse(deleted);
  }
}
