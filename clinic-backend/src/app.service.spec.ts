import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

describe('AppService', () => {
  let service: AppService;
  let dataSourceMock: { query: jest.Mock };

  beforeEach(async () => {
    dataSourceMock = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppService,
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    service = module.get<AppService>(AppService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return { status: "ok" } when database query succeeds', async () => {
      dataSourceMock.query.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await service.getHealth();
      expect(result).toEqual({ status: 'ok' });
      expect(dataSourceMock.query).toHaveBeenCalledWith('SELECT 1');
    });

    it('should return { status: "failed" } when database query throws error', async () => {
      dataSourceMock.query.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await service.getHealth();
      expect(result).toEqual({ status: 'failed' });
    });
  });
});
