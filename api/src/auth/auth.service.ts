import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../generated/prisma/enums';
import { mapApplicationUserResponse } from './dto/application-user-response.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async requireApplicationUser(authUserId: string) {
    const user = await this.prisma.user.findUnique({
      where: { authUserId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new ForbiddenException(
        'Authenticated user is not provisioned in the application.',
      );
    }

    return user;
  }

  async me(authUserId: string) {
    const user = await this.requireApplicationUser(authUserId);

    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    return mapApplicationUserResponse(fullUser!);
  }

  async bootstrap(authUserId: string, email?: string) {
    if (!email) {
      throw new ForbiddenException(
        'You are not allowed to perform this action.',
      );
    }
    const user = await this.prisma.user.upsert({
      where: {
        authUserId,
      },
      update: {
        email,
      },
      create: {
        authUserId,
        email,
        name: email.split('@')[0],
        role: UserRole.OWNER,
      },
    });

    return mapApplicationUserResponse(user);
  }
}
