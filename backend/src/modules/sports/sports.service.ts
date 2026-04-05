import { Injectable } from '@nestjs/common';
import { SportsRepository } from './sports.repository';

@Injectable()
export class SportsService {
  constructor(private readonly sportsRepository: SportsRepository) {}

  async listSports() {
    const sports = await this.sportsRepository.findAll();
    return { data: sports };
  }
}
