import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(skip: number, take: number) {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: true },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  count() {
    return this.prisma.user.count({ where: { deletedAt: null } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, include: { role: true } });
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto) {
    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: { role: true },
    });
  }

  assignRole(id: string, roleId: string) {
    return this.prisma.user.update({
      where: { id },
      data: { roleId },
      include: { role: true },
    });
  }
}
