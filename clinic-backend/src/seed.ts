import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppointmentsService } from './appointments/appointments.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const appointmentsService = app.get(AppointmentsService);

  console.log('Seeding doctors...');
  
  // Create Dr. Davis
  await appointmentsService.createDoctor({
    name: 'Dr. Davis',
    specialization: 'Pediatrics',
    working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    working_hours_start: '08:00',
    working_hours_end: '16:00',
    is_active: true,
  });

  // Create Dr. Jones
  const drJones = await appointmentsService.createDoctor({
    name: 'Dr. Jones',
    specialization: 'Cardiology',
    working_days: ['Monday', 'Wednesday', 'Friday'],
    working_hours_start: '10:00',
    working_hours_end: '18:00',
    is_active: true,
  });

  console.log('Seeding mock appointments...');
  
  // Date calculation: Next Monday for a mock appointment
  const today = new Date();
  const nextMonday = new Date();
  nextMonday.setDate(today.getDate() + ((1 + 7 - today.getDay()) % 7 || 7));
  const dateStr = nextMonday.toISOString().split('T')[0];

  // Create some mock appointments for Dr. Jones on next Monday
  await appointmentsService.createAppointment({
    doctor_id: drJones.id,
    patient_name: 'Alice Mock',
    patient_phone: '+19998887777',
    date: dateStr,
    time: '10:00:00',
    status: 'scheduled',
    duration_minutes: 30
  });

  await appointmentsService.createAppointment({
    doctor_id: drJones.id,
    patient_name: 'Bob Mock',
    patient_phone: '+19998886666',
    date: dateStr,
    time: '11:30:00',
    status: 'booked',
    duration_minutes: 30
  });

  console.log('Database seeded successfully!');
  await app.close();
}

bootstrap().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
