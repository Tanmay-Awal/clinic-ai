import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AiService } from './ai/ai.service';
import { Call } from './entities/call.entity';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const aiService = app.get(AiService);
  const callRepository = app.get<Repository<Call>>(getRepositoryToken(Call));

  console.log('Fetching calls with transcripts and no analysis...');

  // Fetch calls that don't have an associated CallAnalysis record, but do have transcripts
  const calls = await callRepository
    .createQueryBuilder('call')
    .leftJoinAndSelect('call.callAnalysis', 'callAnalysis')
    .where('callAnalysis.id IS NULL')
    .andWhere('call.transcript IS NOT NULL')
    .getMany();

  console.log(`Found ${calls.length} calls to summarize.`);

  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    console.log(`[${i + 1}/${calls.length}] Summarizing call ID: ${call.id} (Retell ID: ${call.call_id || 'N/A'})...`);
    try {
      const success = await aiService.analyzeCall(Number(call.id));
      if (success) {
        console.log(`Successfully summarized call ID: ${call.id}`);
      } else {
        console.warn(`Failed to summarize call ID: ${call.id}`);
      }
    } catch (e) {
      console.error(`Error summarizing call ID ${call.id}:`, e.message);
    }
    
    // Add a short delay to prevent rate limiting
    if (i < calls.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }

  console.log('Old calls summarization script complete.');
  await app.close();
}

bootstrap();
