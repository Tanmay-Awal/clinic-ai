// ============================================================
// Voice Bot Call Analytics - Insights Tab Types
// ============================================================

export interface CallInsightsReport {
  metadata: {
    clinicName: string;
    botName: string;
    periodStart: string;
    periodEnd: string;
    totalCalls: number;
    generatedAt: string;
    analysisVersion: string;
  };

  statistics: {
    totalCalls: number;
    bookingIntentCalls: number;
    successfulBookings: number;
    failedBookings: number;
    transferredCalls: number;
    abandonedCalls: number;
    averageDuration: number;
    conversionRate: number;
    transferRate?: number;
    voicemailRate?: number;
    totalCoversBooked: number;
    estimatedCoversLost: number;
  };

  executiveSummary: {
    criticalFinding: string;
    revenueImpact: string;
    immediateAction: string;
  };

  revenueInsights: RevenueInsight[];
  botPerformanceIssues: BotIssue[];
  strategicRecommendations: Recommendation[];

  callPatterns: {
    byDayOfWeek: { day: string; count: number; bookings: number }[];
    byHourOfDay: { hour: number; count: number; bookings: number }[];
    byOutcome: { outcome: string; count: number; percentage: number }[];
    byPartySize: { size: string; count: number }[];
    topQuestions: { question: string; count: number; answered: boolean }[];
    topSpecialRequests: { request: string; count: number }[];
  };

  rawDataSummary: {
    callsAnalyzed: number;
    dataQualityScore: number;
    missingFields: string[];
  };
}

export interface RevenueInsight {
  id: string;
  insightNumber: number;
  headline: string;
  category: 'demand_pattern' | 'lost_revenue' | 'capacity' | 'pricing' | 'upsell';
  urgency: 'critical' | 'high' | 'medium';

  signal: {
    description: string;
    callCount: number;
    examples: string[];
    timePattern?: string;
  };

  impact: {
    description: string;
    durationAffected?: number;
    revenueEstimate?: number;
    recurringRisk: boolean;
  };

  reasoning: string;

  action: {
    description: string;
    owner?: string;
    timeline: 'immediate' | 'this_week' | 'this_month';
  };

  evidence: {
    callIds?: string[];
    quotes?: string[];
  };
}

export interface BotIssue {
  id: string;
  issueNumber: number;
  title: string;
  category: 'knowledge_gap' | 'flow_failure' | 'misunderstanding' | 'technical' | 'handoff';
  priority: 'critical' | 'high' | 'medium';

  problem: {
    description: string;
    frequency: number;
    examples: string[];
  };

  callerImpact: {
    description: string;
    frustratedCallers: number;
    lostBookings: number;
    transfersTriggered: number;
  };

  trainingRecommendation: {
    description: string;
    specificFix: string;
    estimatedEffort: 'quick_fix' | 'moderate' | 'significant';
  };
}

export interface Recommendation {
  id: string;
  recommendationNumber: number;
  title: string;
  category: 'operations' | 'bot_training' | 'capacity' | 'marketing' | 'staffing';

  basedOn: string[];

  opportunity: {
    description: string;
    potentialImpact: string;
  };

  implementation: {
    immediate: string[];
    shortTerm: string[];
    ongoing: string[];
  };

  successMetric: string;
}

export type InsightTabType = 'revenue' | 'recommendations';
