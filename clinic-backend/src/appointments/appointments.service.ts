import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../entities/appointment.entity';
import { OrganisationSettings } from '../entities/organisation-settings.entity';

type DoctorAvailabilitySnapshot = {
  doctor_id: number;
  name: string;
  specialization: string;
  working_hours_start: string;
  working_hours_end: string;
  working_days: string[];
  available_slots: string[];
  alternative_slots: Record<string, string[]>;
  recommended_slots: string[];
};

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    @InjectRepository(OrganisationSettings)
    private readonly organisationSettingsRepository: Repository<OrganisationSettings>,
  ) {}

  private readonly clinicFallbackName = 'City Health Clinic';
  private readonly clinicFallbackTimezone = 'UTC';

  private parseTime(value: string): { hour: number; minute: number } {
    const [hourPart = '0', minutePart = '0'] = (value || '00:00').split(':');
    return {
      hour: Number.parseInt(hourPart, 10) || 0,
      minute: Number.parseInt(minutePart, 10) || 0,
    };
  }

  private getHoursLabel(value: string): string {
    const { hour, minute } = this.parseTime(value);
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }

  private getWeekdayLabel(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  }

  private isWorkingDay(doctor: Doctor, date: string): boolean {
    const weekday = this.getWeekdayLabel(new Date(`${date}T00:00:00Z`));
    return !doctor.working_days?.length || doctor.working_days.includes(weekday);
  }

  private buildSlots(startTime: string, endTime: string): string[] {
    const start = this.parseTime(startTime);
    const end = this.parseTime(endTime);
    const slots: string[] = [];

    for (let hour = start.hour; hour <= end.hour; hour += 1) {
      const beginMinute = hour === start.hour ? start.minute : 0;
      const endMinute = hour === end.hour ? end.minute : 59;

      for (let minute = beginMinute; minute <= endMinute; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        if (hour === end.hour && minute >= end.minute) {
          continue;
        }
        slots.push(time);
      }
    }

    return slots;
  }

  private async getClinicProfile() {
    const settings = await this.organisationSettingsRepository.findOne({
      where: {},
      order: { created_at: 'ASC' },
    });

    return {
      clinic_name: settings?.organisation_name || this.clinicFallbackName,
      timezone: settings?.default_timezone || this.clinicFallbackTimezone,
      business_type: settings?.business_type || null,
    };
  }

  // --- Doctors CRUD ---
  async getDoctors(): Promise<Doctor[]> {
    return this.doctorRepository.find({
      order: {
        is_active: 'DESC',
        name: 'ASC',
      },
    });
  }

  async getDoctorById(id: number): Promise<Doctor> {
    const doctor = await this.doctorRepository.findOne({ where: { id } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async createDoctor(data: Partial<Doctor>): Promise<Doctor> {
    const doctor = this.doctorRepository.create(data);
    return this.doctorRepository.save(doctor);
  }

  async updateDoctor(id: number, data: Partial<Doctor>): Promise<Doctor> {
    await this.doctorRepository.update(id, data);
    return this.getDoctorById(id);
  }

  // --- Appointments CRUD ---
  async getAppointments(): Promise<Appointment[]> {
    return this.appointmentRepository.find({ relations: ['doctor'] });
  }

  async getAppointmentById(id: number): Promise<Appointment> {
    const apt = await this.appointmentRepository.findOne({
      where: { id },
      relations: ['doctor'],
    });
    if (!apt) throw new NotFoundException('Appointment not found');
    return apt;
  }

  async createAppointment(data: Partial<Appointment>): Promise<Appointment> {
    const apt = this.appointmentRepository.create(data);
    return this.appointmentRepository.save(apt);
  }

  async updateAppointment(id: number, data: Partial<Appointment>): Promise<Appointment> {
    await this.appointmentRepository.update(id, data);
    return this.getAppointmentById(id);
  }

  // --- Available Slots Endpoint ---
  async getAvailableSlots(doctorId: number, date: string): Promise<string[]> {
    const doctor = await this.getDoctorById(doctorId);

    if (!this.isWorkingDay(doctor, date)) {
      return [];
    }

    const allSlots = this.buildSlots(
      this.getHoursLabel(doctor.working_hours_start),
      this.getHoursLabel(doctor.working_hours_end),
    );

    // Get booked appointments for this doctor on this date
    const appointments = await this.appointmentRepository.find({
      where: {
        doctor_id: doctorId,
        date,
        status: In(['booked', 'scheduled']),
      },
    });

    const bookedTimes = appointments.map((a) => a.time.substring(0, 5)); // HH:mm format

    // Filter out booked slots
    return allSlots.filter((slot) => !bookedTimes.includes(slot));
  }

  async getClinicContext(date?: string, daysAhead = 3) {
    const clinicProfile = await this.getClinicProfile();
    const targetDate = date ? new Date(`${date}T00:00:00Z`) : new Date();
    const dateKey = targetDate.toISOString().slice(0, 10);
    const doctors = await this.getDoctors();

    const availability = await Promise.all(
      doctors.map(async (doctor) => {
        const available_slots = await this.getAvailableSlots(doctor.id, dateKey);
        const alternative_slots: Record<string, string[]> = {};

        if (!available_slots.length) {
          for (let offset = 1; offset <= daysAhead; offset += 1) {
            const nextDate = new Date(targetDate);
            nextDate.setUTCDate(nextDate.getUTCDate() + offset);
            const nextDateKey = nextDate.toISOString().slice(0, 10);
            const nextSlots = await this.getAvailableSlots(doctor.id, nextDateKey);
            if (nextSlots.length) {
              alternative_slots[nextDateKey] = nextSlots.slice(0, 4);
              break;
            }
          }
        }

        return {
          doctor_id: Number(doctor.id),
          name: doctor.name,
          specialization: doctor.specialization || 'General',
          working_hours_start: this.getHoursLabel(doctor.working_hours_start),
          working_hours_end: this.getHoursLabel(doctor.working_hours_end),
          working_days: doctor.working_days || [],
          available_slots: available_slots.slice(0, 6),
          alternative_slots,
          recommended_slots: available_slots.slice(0, 3),
        } as DoctorAvailabilitySnapshot;
      }),
    );

    const bestMatches = [...availability]
      .sort((left, right) => {
        const slotScore = right.available_slots.length - left.available_slots.length;
        if (slotScore !== 0) {
          return slotScore;
        }
        return left.name.localeCompare(right.name);
      })
      .slice(0, 3);

    return {
      ...clinicProfile,
      date: dateKey,
      generated_at: new Date().toISOString(),
      doctors: doctors.map((doctor) => ({
        id: Number(doctor.id),
        name: doctor.name,
        specialization: doctor.specialization || 'General',
        consultation_fee: doctor.consultation_fee ?? null,
        working_days: doctor.working_days || [],
        working_hours_start: this.getHoursLabel(doctor.working_hours_start),
        working_hours_end: this.getHoursLabel(doctor.working_hours_end),
        is_active: doctor.is_active,
      })),
      availability,
      best_matches: bestMatches,
      clinic_hours: {
        monday_to_friday: '08:00 - 18:00',
        saturday: '09:00 - 16:00',
        sunday: 'Closed',
      },
      next_best_dates: await this.getNextBestDates(doctors, targetDate, daysAhead),
    };
  }

  private async getNextBestDates(doctors: Doctor[], baseDate: Date, daysAhead: number) {
    const result: Record<string, Array<{ doctor_id: number; slots: string[] }>> = {};

    for (let offset = 1; offset <= daysAhead; offset += 1) {
      const nextDate = new Date(baseDate);
      nextDate.setUTCDate(nextDate.getUTCDate() + offset);
      const nextDateKey = nextDate.toISOString().slice(0, 10);
      const dayAvailability = await Promise.all(
        doctors.map(async (doctor) => ({
          doctor_id: Number(doctor.id),
          slots: await this.getAvailableSlots(doctor.id, nextDateKey),
        })),
      );
      const compact = dayAvailability.filter((entry) => entry.slots.length > 0).map((entry) => ({
        doctor_id: entry.doctor_id,
        slots: entry.slots.slice(0, 4),
      }));
      if (compact.length) {
        result[nextDateKey] = compact;
      }
    }

    return result;
  }
}
