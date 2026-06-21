import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Call } from './entities/call.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const callRepository = app.get<Repository<Call>>(getRepositoryToken(Call));

  console.log('--- Inspecting Database Calls ---');
  
  const calls = await callRepository
    .createQueryBuilder('call')
    .leftJoinAndSelect('call.callAnalysis', 'callAnalysis')
    .getMany();

  console.log(`Total calls in DB: ${calls.length}`);
  for (const c of calls) {
    console.log(`Call ID: ${c.id}`);
    console.log(`  - Retell ID: ${c.call_id}`);
    console.log(`  - Phone: ${c.from_number}`);
    console.log(`  - Has Transcript: ${c.transcript ? 'Yes' : 'No'}`);
    console.log(`  - Has Summary: ${c.callAnalysis ? 'Yes' : 'No'}`);
    if (c.callAnalysis) {
      console.log(`    * Summary: ${c.callAnalysis.call_summary}`);
    }
  }

  await app.close();
}

bootstrap();
