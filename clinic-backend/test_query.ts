import { DataSource } from 'typeorm';
import { Doctor } from './src/entities/doctor.entity';
import { Appointment } from './src/entities/appointment.entity';
import { Call } from './src/entities/call.entity';
import { CallAnalysis } from './src/entities/call-analysis.entity';
import { CallTranscript } from './src/entities/call-transcript.entity';
import { Action } from './src/entities/action.entity';

async function run() {
  const AppDataSource = new DataSource({
    type: 'postgres',
    host: '127.0.0.1',
    port: 5432,
    username: 'postgres',
    password: 'Tanawal@09',
    database: 'clinic_db',
    entities: [Doctor, Appointment, Call, CallAnalysis, CallTranscript, Action],
    synchronize: false
  });
  
  await AppDataSource.initialize();
  
  const q = await AppDataSource.getRepository(Appointment).createQueryBuilder('a')
    .select('a.doctor_id', 'id')
    .addSelect('d.name', 'name')
    .addSelect('d.specialization', 'specialization')
    .addSelect('COUNT(a.id)', 'patientCount')
    .leftJoin('a.doctor', 'd')
    .where('a.doctor_id IS NOT NULL')
    .groupBy('a.doctor_id, d.name, d.specialization')
    .orderBy('"patientCount"', 'DESC')
    .limit(5)
    .getRawMany();
    
  console.log('Result:', q);
  
  await AppDataSource.destroy();
}

run();
