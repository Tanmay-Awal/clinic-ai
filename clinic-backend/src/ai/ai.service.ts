import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Call } from '../entities/call.entity';
import { Action } from '../entities/action.entity';
import { CallAnalysis } from '../entities/call-analysis.entity';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(Action)
    private readonly actionRepository: Repository<Action>,
    @InjectRepository(CallAnalysis)
    private readonly callAnalysisRepository: Repository<CallAnalysis>,
  ) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (apiKey) {
      this.groq = new Groq({ apiKey });
    } else {
      this.logger.warn('GROQ_API_KEY not found in environment');
    }
  }

  async analyzeCall(callId: number): Promise<boolean> {
    if (!this.groq) {
      this.logger.error('Cannot analyze call, Groq API not configured');
      return false;
    }

    try {
      const call = await this.callRepository.findOne({ where: { id: callId } });
      if (!call || !call.transcript) {
        this.logger.warn(`Call ${callId} not found or has no transcript`);
        return false;
      }

      const prompt = `
        Analyze the following clinic voice bot call transcript and extract structured information.
        Return ONLY a JSON object with the following schema, no markdown blocks, no other text:
        {
          "summary": "Brief 1-2 sentence summary of the call",
          "category": "One of: Booking, Inquiry, Cancellation, Rescheduling, Emergency, Other",
          "sentiment": "Positive, Neutral, or Negative",
          "key_insights": ["Insight 1", "Insight 2"],
          "actions_required": [
            {
              "type": "Follow-up Call" | "Prescription Refill" | "Manual Review",
              "description": "What needs to be done",
              "priority": "High" | "Medium" | "Low"
            }
          ]
        }

        Transcript:
        ${JSON.stringify(call.transcript)}
      `;

      const chatCompletion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.1-8b-instant', // or any other fast model
        temperature: 0.1,
      });

      const responseText = chatCompletion.choices[0]?.message?.content || '{}';
      
      let parsedData;
      try {
        // Strip out any markdown code blocks if the model ignored the instructions
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        parsedData = JSON.parse(cleanJson);
      } catch (e) {
        this.logger.error(`Failed to parse JSON from Groq for call ${callId}`);
        return false;
      }

      // We will create a CallAnalysis entity here to store the summary and sentiment.
      // call.analyzed_at = new Date();
      await this.callRepository.save(call);

      const callAnalysis = this.callAnalysisRepository.create({
        call_id: call.id,
        call_summary: parsedData.summary || '',
        user_sentiment: parsedData.sentiment || 'Neutral',
        call_successful: true,
        name: null,
        location: null,
        contact_number: call.from_number,
        sentiment_percentage: 50.00, // Or some default/parsed logic if available
      });
      await this.callAnalysisRepository.save(callAnalysis);

      // Create Action Entities if needed
      if (parsedData.actions_required && Array.isArray(parsedData.actions_required)) {
        for (const actionReq of parsedData.actions_required) {
          const action = this.actionRepository.create({
            call_id: call.id,
            caller_phone: call.from_number,
            type: actionReq.type || 'Review',
            description: actionReq.description,
            priority: actionReq.priority || 'Medium',
            status: 'Open',
          });
          await this.actionRepository.save(action);
        }
      }

      this.logger.log(`Successfully analyzed call ${callId}`);
      return true;

    } catch (error) {
      this.logger.error(`Error analyzing call ${callId}: ${error.message}`);
      return false;
    }
  }
}
