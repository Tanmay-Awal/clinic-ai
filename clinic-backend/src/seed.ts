import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AppointmentsService } from './appointments/appointments.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const appointmentsService = app.get(AppointmentsService);

  console.log('Seeding doctors...');

  const doctors = [
    {
      name: 'Dr. Sarah Jenkins',
      specialization: 'General Practitioner',
      phone: '+447700900111',
      email: 'sarah.jenkins@clinic.local',
      consultation_fee: 50.00,
    },
    {
      name: 'Dr. Michael Chen',
      specialization: 'Cardiologist',
      phone: '+447700900222',
      email: 'michael.chen@clinic.local',
      consultation_fee: 120.00,
    },
    {
      name: 'Dr. Emily Stone',
      specialization: 'Dermatologist',
      phone: '+447700900333',
      email: 'emily.stone@clinic.local',
      consultation_fee: 80.00,
    },
  ];

  for (const doc of doctors) {
    try {
      await appointmentsService.createDoctor(doc);
      console.log(`Created doctor: ${doc.name}`);
    } catch (e) {
      console.error(`Failed to create doctor ${doc.name}: ${e.message}`);
    }
  }

  console.log('Seeding complete.');
  await app.close();
}

bootstrap();
