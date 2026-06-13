import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import dataSource from '../clinic-backend/src/data-source';
import { User } from '../clinic-backend/src/entities/user.entity';
import { Role } from '../clinic-backend/src/entities/role.entity';
import { OrganisationSettings } from '../clinic-backend/src/entities/organisation-settings.entity';
import { Doctor } from '../clinic-backend/src/entities/doctor.entity';
import { Appointment } from '../clinic-backend/src/entities/appointment.entity';
import { Call } from '../clinic-backend/src/entities/call.entity';
import { CallAnalysis } from '../clinic-backend/src/entities/call-analysis.entity';

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  console.log('Database connected.');

  const roleRepo = dataSource.getRepository(Role);
  const orgRepo = dataSource.getRepository(OrganisationSettings);
  const userRepo = dataSource.getRepository(User);
  const doctorRepo = dataSource.getRepository(Doctor);
  const appointmentRepo = dataSource.getRepository(Appointment);
  const callRepo = dataSource.getRepository(Call);
  const callAnalysisRepo = dataSource.getRepository(CallAnalysis);

  // Clean existing data to avoid conflicts if script is run multiple times
  await callAnalysisRepo.delete({});
  await callRepo.delete({});
  await appointmentRepo.delete({});
  await doctorRepo.delete({});
  await userRepo.delete({});
  await roleRepo.delete({});
  await orgRepo.delete({});

  // 1. Role
  let role = roleRepo.create({ name: 'admin', description: 'Administrator' });
  role = await roleRepo.save(role);

  // 2. Organisation
  let org = orgRepo.create({
    name: 'City Health Clinic',
    timezone: 'UTC',
    address: '123 Health Ave'
  });
  org = await orgRepo.save(org);

  // 3. User
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('test@123', salt);

  let user = userRepo.create({
    email: 'test@gmail.com',
    password: hashedPassword,
    first_name: 'Test',
    last_name: 'User',
    role: role,
    organisation_id: org.id,
    timezone: 'UTC',
    status: 'active'
  });
  user = await userRepo.save(user);

  // 4. Doctor
  let doctor = doctorRepo.create({
    name: 'Dr. Jane Smith',
    specialty: 'General Practice',
    email: 'jane.smith@clinic.local'
  });
  doctor = await doctorRepo.save(doctor);

  // 5. Appointment
  let appointment = appointmentRepo.create({
    patient_name: 'John Doe',
    patient_phone: '+1234567890',
    appointment_time: new Date(Date.now() + 86400000), // tomorrow
    status: 'scheduled',
    doctor: doctor
  });
  appointment = await appointmentRepo.save(appointment);

  // 6. Calls & Call Analysis
  let call1 = callRepo.create({
    call_id: 'mock-call-1',
    from_number: '+1987654321',
    call_direction: 'inbound',
    call_duration_ms: 120000, // 2 mins
    call_start_time: new Date(),
    call_end_time: new Date(Date.now() + 120000),
    category: 'Appointment',
    appointment_id: appointment.id
  });
  call1 = await callRepo.save(call1);

  let callAnalysis1 = callAnalysisRepo.create({
    call_id: call1.id,
    summary: 'Patient called to book an appointment for tomorrow.',
    user_sentiment: 'Positive',
    call_successful: true
  });
  await callAnalysisRepo.save(callAnalysis1);

  let call2 = callRepo.create({
    call_id: 'mock-call-2',
    from_number: '+1122334455',
    call_direction: 'inbound',
    call_duration_ms: 45000,
    call_start_time: new Date(),
    call_end_time: new Date(Date.now() + 45000),
    category: 'Inquiry'
  });
  call2 = await callRepo.save(call2);

  let callAnalysis2 = callAnalysisRepo.create({
    call_id: call2.id,
    summary: 'Patient asked about clinic hours.',
    user_sentiment: 'Neutral',
    call_successful: true
  });
  await callAnalysisRepo.save(callAnalysis2);

  console.log('Seeding completed successfully!');
  console.log('You can now log in with test@gmail.com / test@123');
  
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
