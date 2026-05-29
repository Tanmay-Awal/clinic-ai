import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class AppService {
  constructor(private dataSource: DataSource) {}

  async getHealth() {
    try {
      await this.dataSource.query('SELECT 1');
      return {
        status: 'ok',
      };
    } catch (error) {
      return {
        status: 'failed',
      };
    }
  }
}
