import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../entities/appointment.entity';
import { OrganisationSettings } from '../entities/organisation-settings.entity';

describe('AppointmentsService', () => {
  let service: AppointmentsService;
  let doctorRepoMock: any;
  let appointmentRepoMock: any;
  let orgSettingsRepoMock: any;

  beforeEach(async () => {
    doctorRepoMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 1, ...data })),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    appointmentRepoMock = {
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    orgSettingsRepoMock = {
      findOne: jest.fn().mockResolvedValue({
        organisation_name: 'City Health Clinic',
        default_timezone: 'Asia/Kolkata',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        {
          provide: getRepositoryToken(Doctor),
          useValue: doctorRepoMock,
        },
        {
          provide: getRepositoryToken(Appointment),
          useValue: appointmentRepoMock,
        },
        {
          provide: getRepositoryToken(OrganisationSettings),
          useValue: orgSettingsRepoMock,
        },
      ],
    }).compile();

    service = module.get<AppointmentsService>(AppointmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDoctors', () => {
    it('should return list of doctors ordered by is_active and name', async () => {
      const mockDoctors = [
        { id: 1, name: 'Dr. Sharma', specialization: 'Cardiology', is_active: true },
        { id: 2, name: 'Dr. Verma', specialization: 'General', is_active: true },
      ];
      doctorRepoMock.find.mockResolvedValueOnce(mockDoctors);

      const result = await service.getDoctors();
      expect(result).toEqual(mockDoctors);
      expect(doctorRepoMock.find).toHaveBeenCalledWith({
        order: { is_active: 'DESC', name: 'ASC' },
      });
    });
  });

  describe('getDoctorById', () => {
    it('should return a doctor if found by ID', async () => {
      const mockDoctor = { id: 1, name: 'Dr. Sharma' };
      doctorRepoMock.findOne.mockResolvedValueOnce(mockDoctor);

      const result = await service.getDoctorById(1);
      expect(result).toEqual(mockDoctor);
    });

    it('should throw NotFoundException if doctor does not exist', async () => {
      doctorRepoMock.findOne.mockResolvedValueOnce(null);

      await expect(service.getDoctorById(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Slot generation and working day logic', () => {
    it('should correctly build 30-minute slots between working hours', () => {
      const slots = (service as any).buildSlots('09:00', '11:00');
      expect(slots).toEqual(['09:00', '09:30', '10:00', '10:30']);
    });

    it('should identify whether a date is a doctor working day', () => {
      const doctor: any = {
        working_days: ['Monday', 'Wednesday', 'Friday'],
      };
      // 2026-11-16 is Monday, 2026-11-17 is Tuesday
      expect((service as any).isWorkingDay(doctor, '2026-11-16')).toBe(true);
      expect((service as any).isWorkingDay(doctor, '2026-11-17')).toBe(false);
    });
  });
});
