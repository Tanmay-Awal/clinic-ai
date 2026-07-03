import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Appointment } from '../entities/appointment.entity';
import { Action } from '../entities/action.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Action)
    private readonly actionRepo: Repository<Action>,
  ) {}

  private readonly METADATA = {
    appointments: {
      reportType: 'appointments',
      columns: {
        id: { label: 'ID', type: 'number' },
        patient_name: { label: 'Patient Name', type: 'string' },
        patient_phone: { label: 'Patient Phone', type: 'string' },
        date: { label: 'Date', type: 'date' },
        time: { label: 'Time', type: 'string' },
        duration_minutes: { label: 'Duration (Mins)', type: 'number' },
        status: { label: 'Status', type: 'string' },
      },
      defaultColumns: ['id', 'patient_name', 'patient_phone', 'date', 'status'],
      dateColumns: ['date'],
    },
    actions: {
      reportType: 'actions',
      columns: {
        id: { label: 'ID', type: 'number' },
        type: { label: 'Type', type: 'string' },
        priority: { label: 'Priority', type: 'string' },
        status: { label: 'Status', type: 'string' },
        caller_phone: { label: 'Caller Phone', type: 'string' },
        resolved_at: { label: 'Resolved At', type: 'date' },
      },
      defaultColumns: ['id', 'type', 'priority', 'status', 'caller_phone'],
      dateColumns: ['resolved_at'],
    },
  };

  async getMetadata(reportType: string) {
    if (!this.METADATA[reportType]) {
      throw new NotFoundException(`Report type ${reportType} not found.`);
    }
    return this.METADATA[reportType];
  }

  async getSuggestions(reportType: string, column: string, search: string) {
    let qb: SelectQueryBuilder<any>;
    
    if (reportType === 'appointments') {
      qb = this.appointmentRepo.createQueryBuilder('entity');
    } else if (reportType === 'actions') {
      qb = this.actionRepo.createQueryBuilder('entity');
    } else {
      throw new NotFoundException(`Report type ${reportType} not found.`);
    }

    const metadata = this.METADATA[reportType];
    if (!metadata.columns[column]) {
      throw new BadRequestException(`Invalid column: ${column}`);
    }

    qb.select(`DISTINCT(entity.${column})`, 'value')
      .where(`entity.${column} IS NOT NULL`);
      
    if (search) {
      qb.andWhere(`CAST(entity.${column} AS TEXT) ILIKE :search`, { search: `%${search}%` });
    }
    
    qb.limit(20);

    const results = await qb.getRawMany();
    return {
      column,
      values: results.map((r) => String(r.value)),
    };
  }

  async generateReport(reportType: string, request: any) {
    let qb: SelectQueryBuilder<any>;
    
    if (reportType === 'appointments') {
      qb = this.appointmentRepo.createQueryBuilder('entity');
    } else if (reportType === 'actions') {
      qb = this.actionRepo.createQueryBuilder('entity');
    } else {
      throw new NotFoundException(`Report type ${reportType} not found.`);
    }

    const metadata = this.METADATA[reportType];

    // Select specific columns
    if (request.columns && request.columns.length > 0) {
      const validColumns = request.columns.filter((c) => !!metadata.columns[c]);
      if (validColumns.length > 0) {
        qb.select(validColumns.map((c) => `entity.${c}`));
      }
    }

    // Apply date range
    if (request.dateRange) {
      const { column, from, to } = request.dateRange;
      if (metadata.columns[column]) {
        qb.andWhere(`entity.${column} >= :from AND entity.${column} <= :to`, { from, to });
      }
    }

    // Apply filters
    if (request.filters && request.filters.length > 0) {
      request.filters.forEach((filter, idx) => {
        if (!metadata.columns[filter.column]) return;
        
        const paramName = `val_${idx}`;
        const col = `entity.${filter.column}`;
        
        switch (filter.operator) {
          case 'eq':
            qb.andWhere(`${col} = :${paramName}`, { [paramName]: filter.value });
            break;
          case 'like':
            qb.andWhere(`CAST(${col} AS TEXT) ILIKE :${paramName}`, { [paramName]: `%${filter.value}%` });
            break;
          case 'in':
            if (filter.values && filter.values.length > 0) {
              qb.andWhere(`${col} IN (:${paramName})`, { [paramName]: filter.values });
            }
            break;
          case 'gte':
            qb.andWhere(`${col} >= :${paramName}`, { [paramName]: filter.value });
            break;
          case 'lte':
            qb.andWhere(`${col} <= :${paramName}`, { [paramName]: filter.value });
            break;
        }
      });
    }

    // Apply sorting
    if (request.sort) {
      if (metadata.columns[request.sort.column]) {
        qb.orderBy(`entity.${request.sort.column}`, request.sort.direction === 'desc' ? 'DESC' : 'ASC');
      }
    } else {
      // Default sort
      qb.orderBy('entity.id', 'DESC');
    }

    // Export vs Pagination
    if (request.export) {
      const data = await qb.getMany();
      return { data, total: data.length, page: 1, pageSize: data.length };
    }

    const page = request.page || 1;
    const pageSize = request.pageSize || 20;
    
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
    };
  }
}
