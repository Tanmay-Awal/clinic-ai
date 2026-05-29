import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CallProcessingService } from './call-processing.service';
import { Call } from '../../entities/call.entity';
import { CallTranscript } from '../../entities/call-transcript.entity';
import { CallAnalysis } from '../../entities/call-analysis.entity';
import { TableReservation } from '../../entities/table-reservation.entity';
import { RoomReservation } from '../../entities/room-reservation.entity';
import { Housekeeping } from '../../entities/housekeeping.entity';
import { Reservation } from '../../entities/reservation.entity';
import { FeedbackDetails } from '../../entities/feedback-details.entity';
import { Agent } from '../../entities/agent.entity';
import { ResdiaryToolCallLog } from '../../entities/resdiary-tool-call-log.entity';
import { FredricksReservation } from '../../entities/fredricks-reservation.entity';
import { AiService } from '../../ai/ai.service';
import { EmailService } from './email.service';
import { ActionsService } from '../../actions/actions.service';

const mockRepo = () => ({
  find: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
  update: jest.fn(),
  manager: { query: jest.fn() },
});

describe('CallProcessingService', () => {
  let service: CallProcessingService;
  let callRepo: ReturnType<typeof mockRepo>;
  let transcriptRepo: ReturnType<typeof mockRepo>;
  let agentRepo: ReturnType<typeof mockRepo>;

  const mockAiService = {
    extractCallDataUniversal: jest.fn(),
    extractReservationData: jest.fn(),
    extractFeedbackData: jest.fn(),
    extractActionData: jest.fn().mockResolvedValue({
      team_follow_up_promised: false,
      action_request_type: 'none',
      action_context: null,
      booking_stage_reached: 'not_applicable',
    }),
    saveGeneralIssue: jest.fn(),
  };

  const mockEmailService = {
    sendHousekeepingNotification: jest.fn(),
  };

  const mockActionsService = {
    handleCallActions: jest.fn(),
    createActionFromCall: jest.fn(),
  };

  beforeEach(async () => {
    callRepo = mockRepo();
    transcriptRepo = mockRepo();
    agentRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CallProcessingService,
        { provide: getRepositoryToken(Call), useValue: callRepo },
        {
          provide: getRepositoryToken(CallTranscript),
          useValue: transcriptRepo,
        },
        { provide: getRepositoryToken(CallAnalysis), useValue: mockRepo() },
        { provide: getRepositoryToken(TableReservation), useValue: mockRepo() },
        { provide: getRepositoryToken(RoomReservation), useValue: mockRepo() },
        { provide: getRepositoryToken(Housekeeping), useValue: mockRepo() },
        { provide: getRepositoryToken(Reservation), useValue: mockRepo() },
        { provide: getRepositoryToken(FeedbackDetails), useValue: mockRepo() },
        { provide: getRepositoryToken(Agent), useValue: agentRepo },
        { provide: getRepositoryToken(ResdiaryToolCallLog), useValue: mockRepo() },
        { provide: getRepositoryToken(FredricksReservation), useValue: mockRepo() },
        { provide: AiService, useValue: mockAiService },
        { provide: EmailService, useValue: mockEmailService },
        { provide: ActionsService, useValue: mockActionsService },
      ],
    }).compile();

    service = module.get<CallProcessingService>(CallProcessingService);

    // Reset all mocks
    jest.clearAllMocks();

    // Default: transcriptRepo returns a valid transcript so processCall doesn't skip
    transcriptRepo.find.mockResolvedValue([
      {
        transcript: 'Hello, I would like to make a reservation.',
        role: 'user',
        created_at: new Date(),
      },
    ]);
  });

  // Helper to create a minimal call object
  function makeCall(overrides: Partial<Call> = {}): Call {
    return {
      id: 1,
      agent_id: 'agent-123',
      needs_ai_processing: true,
      ...overrides,
    } as Call;
  }

  // ── Test 1: Reservation call (universal agent) ──────────────────────────

  describe('Reservation call via universal agent', () => {
    it('should save taxonomy fields from extractedData on the call object', async () => {
      agentRepo.findOne.mockResolvedValue({
        agent_id: 'agent-123',
        agentCategory: { category_name: 'Reservation' },
      });

      const extractedData = {
        category: 'Reservation',
        reservation_type: 'table',
        party_size: 4,
        booking_date: '2026-04-01',
        booking_time: '19:00',
        topic_tags: ['dining', 'birthday'],
        query_codes: ['RES-TABLE'],
        query_verbatim: ['I want to book a table for 4'],
        special_request_codes: ['CAKE'],
        special_request_detail: ['Birthday cake for the guest'],
      };
      mockAiService.extractCallDataUniversal.mockResolvedValue(extractedData);

      const call = makeCall();
      await service.processCall(call);

      const savedCall = callRepo.save.mock.calls[0][0];
      expect(savedCall.topic_tags).toEqual(['dining', 'birthday']);
      expect(savedCall.query_codes).toEqual(['RES-TABLE']);
      expect(savedCall.query_verbatim).toEqual([
        'I want to book a table for 4',
      ]);
      expect(savedCall.special_request_codes).toEqual(['CAKE']);
      expect(savedCall.special_request_detail).toEqual([
        'Birthday cake for the guest',
      ]);
    });
  });

  // ── Test 2: Enquiry/General call (universal agent) ──────────────────────

  describe('Enquiry/General call via universal agent', () => {
    it('should save taxonomy fields on call for non-reservation categories', async () => {
      agentRepo.findOne.mockResolvedValue({
        agent_id: 'agent-123',
        agentCategory: null,
      });

      const extractedData = {
        category: 'General',
        topic_tags: ['pricing', 'hours'],
        query_codes: ['GEN-INFO'],
        query_verbatim: ['What are your opening hours?'],
        special_request_codes: [],
        special_request_detail: [],
      };
      mockAiService.extractCallDataUniversal.mockResolvedValue(extractedData);
      mockAiService.saveGeneralIssue.mockResolvedValue(undefined);

      const call = makeCall();
      await service.processCall(call);

      const savedCall = callRepo.save.mock.calls[0][0];
      expect(savedCall.topic_tags).toEqual(['pricing', 'hours']);
      expect(savedCall.query_codes).toEqual(['GEN-INFO']);
      expect(savedCall.query_verbatim).toEqual([
        'What are your opening hours?',
      ]);
      expect(savedCall.special_request_codes).toEqual([]);
      expect(savedCall.special_request_detail).toEqual([]);
    });
  });

  // ── Test 3: Feedback agent call ─────────────────────────────────────────

  describe('Feedback agent call', () => {
    it('should save taxonomy fields on call for feedback agent', async () => {
      agentRepo.findOne.mockResolvedValue({
        agent_id: 'agent-123',
        agentCategory: { category_name: 'Feedback' },
      });

      const extractedData = {
        feedback_type: 'positive',
        feedback_topic: 'Service',
        topic_tags: ['service', 'staff'],
        query_codes: ['FB-POS'],
        query_verbatim: ['The staff was amazing'],
        special_request_codes: ['FOLLOW-UP'],
        special_request_detail: ['Guest wants to leave a Google review'],
      };
      mockAiService.extractFeedbackData.mockResolvedValue(extractedData);

      const call = makeCall();
      await service.processCall(call);

      const savedCall = callRepo.save.mock.calls[0][0];
      expect(savedCall.topic_tags).toEqual(['service', 'staff']);
      expect(savedCall.query_codes).toEqual(['FB-POS']);
      expect(savedCall.query_verbatim).toEqual(['The staff was amazing']);
      expect(savedCall.special_request_codes).toEqual(['FOLLOW-UP']);
      expect(savedCall.special_request_detail).toEqual([
        'Guest wants to leave a Google review',
      ]);
    });

    it('should create callback action for feedback follow-up when requires_action is true', async () => {
      agentRepo.findOne.mockResolvedValue({
        agent_id: 'agent-123',
        agentCategory: { category_name: 'Feedback' },
      });

      mockAiService.extractFeedbackData.mockResolvedValue({
        feedback_type: 'Complaint',
        requires_action: true,
        action_type: 'Rebooking Followup',
        action_context: 'Guest asked to be called back tomorrow.',
        guest_name: 'Sarah',
      });

      const call = makeCall({ from_number: '+447700900123' });
      await service.processCall(call);

      expect(mockActionsService.createActionFromCall).toHaveBeenCalledWith(
        expect.objectContaining({ id: call.id }),
        expect.objectContaining({
          request_type: 'callback',
          context: 'Guest asked to be called back tomorrow.',
          guest_name: 'Sarah',
        }),
      );
    });
  });

  // ── Test 4: Missing taxonomy fields — defaults to empty arrays ──────────

  describe('Missing taxonomy fields', () => {
    it('should default to empty arrays when taxonomy fields are absent from extractedData', async () => {
      agentRepo.findOne.mockResolvedValue({
        agent_id: 'agent-123',
        agentCategory: null,
      });

      const extractedData = {
        category: 'General',
        // No taxonomy fields at all
      };
      mockAiService.extractCallDataUniversal.mockResolvedValue(extractedData);
      mockAiService.saveGeneralIssue.mockResolvedValue(undefined);

      const call = makeCall();
      await service.processCall(call);

      const savedCall = callRepo.save.mock.calls[0][0];
      expect(savedCall.topic_tags).toEqual([]);
      expect(savedCall.query_codes).toEqual([]);
      expect(savedCall.query_verbatim).toEqual([]);
      expect(savedCall.special_request_codes).toEqual([]);
      expect(savedCall.special_request_detail).toEqual([]);
    });
  });

  // ── Test 5: Non-array taxonomy fields — defaults to empty arrays ────────

  describe('Non-array taxonomy fields', () => {
    it('should default to empty arrays when taxonomy fields are non-array types (string, null, number, object)', async () => {
      agentRepo.findOne.mockResolvedValue({
        agent_id: 'agent-123',
        agentCategory: null,
      });

      const extractedData = {
        category: 'General',
        topic_tags: 'not-an-array',
        query_codes: null,
        query_verbatim: 42,
        special_request_codes: { key: 'value' },
        special_request_detail: undefined,
      };
      mockAiService.extractCallDataUniversal.mockResolvedValue(extractedData);
      mockAiService.saveGeneralIssue.mockResolvedValue(undefined);

      const call = makeCall();
      await service.processCall(call);

      const savedCall = callRepo.save.mock.calls[0][0];
      expect(savedCall.topic_tags).toEqual([]);
      expect(savedCall.query_codes).toEqual([]);
      expect(savedCall.query_verbatim).toEqual([]);
      expect(savedCall.special_request_codes).toEqual([]);
      expect(savedCall.special_request_detail).toEqual([]);
    });
  });
});
