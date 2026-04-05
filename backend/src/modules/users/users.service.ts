import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationQueryDto } from 'src/shared/dto/pagination-query.dto';
import { buildPaginationMeta } from 'src/common/utils/pagination.util';
import { AssignRoleDto } from './dto/assign-role.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async list(query: PaginationQueryDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      this.usersRepository.findMany(skip, query.pageSize),
      this.usersRepository.count(),
    ]);

    return {
      data: rows,
      meta: buildPaginationMeta(query.page, query.pageSize, total),
    };
  }

  async getById(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { data: user };
  }

  async updateProfile(id: string, dto: UpdateUserProfileDto) {
    return { data: await this.usersRepository.updateProfile(id, dto) };
  }

  async assignRole(id: string, dto: AssignRoleDto) {
    return { data: await this.usersRepository.assignRole(id, dto.roleId) };
  }
}
