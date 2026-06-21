import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from '../entities/doctor.entity';
import { Appointment } from '../entities/appointment.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
  ) {}

  // --- Doctors CRUD ---
  async getDoctors(): Promise<Doctor[]> {
    return this.doctorRepository.find();
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
    
    // Simplistic slots generation based on working hours
    const startHour = parseInt(doctor.working_hours_start.split(':')[0], 10);
    const endHour = parseInt(doctor.working_hours_end.split(':')[0], 10);
    
    const allSlots: string[] = [];
    for (let h = startHour; h < endHour; h++) {
      allSlots.push(`${h.toString().padStart(2, '0')}:00`);
      allSlots.push(`${h.toString().padStart(2, '0')}:30`);
    }

    // Get booked appointments for this doctor on this date
    const appointments = await this.appointmentRepository.find({
      where: { doctor_id: doctorId, date, status: 'booked' }
    });

    const bookedTimes = appointments.map((a) => a.time.substring(0, 5)); // HH:mm format

    // Filter out booked slots
    return allSlots.filter((slot) => !bookedTimes.includes(slot));
  }
}
