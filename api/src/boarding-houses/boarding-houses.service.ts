import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardingHouseDto } from './dto/create-boarding-house.dto';
import { UpdateBoardingHouseDto } from './dto/update-boarding-house.dto';
import { mapBoardingHouseResponse } from './dto/boarding-house-response.dto';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class BoardingHousesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async findAll(authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const houses = await this.prisma.boardingHouse.findMany({
      where: { ownerId: owner.id },
      orderBy: { createdAt: 'desc' },
    });

    return houses.map((house) => mapBoardingHouseResponse(house));
  }

  async findOne(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const house = await this.prisma.boardingHouse.findFirst({
      where: { id, ownerId: owner.id },
    });

    if (!house) {
      throw new NotFoundException('Boarding house not found.');
    }

    return mapBoardingHouseResponse(house);
  }

  async create(dto: CreateBoardingHouseDto, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const house = await this.prisma.boardingHouse.create({
      data: {
        name: dto.name,
        address: dto.address,
        ownerId: owner.id,
      },
    });

    return mapBoardingHouseResponse(house);
  }

  async update(id: string, authUserId: string, dto: UpdateBoardingHouseDto) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const house = await this.prisma.boardingHouse.findFirst({
      where: { id, ownerId: owner.id },
    });

    if (!house) {
      throw new NotFoundException('Boarding house not found.');
    }

    const updated = await this.prisma.boardingHouse.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.electricityUnitPrice !== undefined && { electricityUnitPrice: dto.electricityUnitPrice }),
        ...(dto.waterUnitPrice !== undefined && { waterUnitPrice: dto.waterUnitPrice }),
      },
    });

    return mapBoardingHouseResponse(updated);
  }

  async remove(id: string, authUserId: string) {
    const owner = await this.authService.requireApplicationUser(authUserId);

    const house = await this.prisma.boardingHouse.findFirst({
      where: { id, ownerId: owner.id },
    });

    if (!house) {
      throw new NotFoundException('Boarding house not found.');
    }

    await this.prisma.boardingHouse.delete({ where: { id } });

    return { message: 'Boarding house deleted.' };
  }
}
