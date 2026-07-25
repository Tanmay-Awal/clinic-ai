// Mock data for CliniCall Calls Portal

export type CallDirection = 'inbound' | 'outbound';
export type CallCategory = 'reservation' | 'sales' | 'feedback' | 'enquiry' | 'support' | 'other';
export type CallOutcome = 'completed' | 'no_answer' | 'busy' | 'voicemail' | 'failed';

export interface Call {
  id: string;
  timestamp: string;
  direction: CallDirection;
  category: CallCategory;
  sub_intent: string;
  caller_id: string;
  caller_name: string;
  site: string;
  duration_seconds: number;
  outcome: CallOutcome;
  sentiment_score: number; // -1 to 1
  asr_confidence: number; // 0 to 1
  tags: string[];
  has_followup: boolean;
  transcript?: TranscriptUtterance[];
  data_json?: any;
  summary?: string;
  entities?: string[];
  risk_flags?: string[];
}

export interface TranscriptUtterance {
  speaker: 'caller' | 'bot';
  text: string;
  timestamp: number;
  confidence: number;
  has_redaction?: boolean;
}

// Generate sample calls
export const mockCalls: Call[] = [
  {
    id: 'call_001',
    timestamp: '2025-11-12T18:30:00Z',
    direction: 'inbound',
    category: 'reservation',
    sub_intent: 'new_booking',
    caller_id: '+44 20 7946 0958',
    caller_name: 'Sarah Mitchell',
    site: 'Mayfair Location',
    duration_seconds: 245,
    outcome: 'completed',
    sentiment_score: 0.85,
    asr_confidence: 0.94,
    tags: ['VIP', 'Anniversary'],
    has_followup: false,
    summary: 'Customer booked table for 4 on Nov 15 at 7:30 PM for anniversary celebration. Requested window seating.',
    entities: ['Sarah Mitchell', 'November 15', '7:30 PM', '4 guests'],
    transcript: [
      { speaker: 'bot', text: 'Hello! Thank you for calling CliniCall. How can I help you today?', timestamp: 0, confidence: 0.95 },
      { speaker: 'caller', text: "Hi, I'd like to make a reservation for this Friday evening.", timestamp: 3, confidence: 0.92 },
      { speaker: 'bot', text: "Of course! I'd be happy to help you with that. For how many guests?", timestamp: 8, confidence: 0.96 },
      { speaker: 'caller', text: 'Four people. Can we get a window seat? It\'s our anniversary.', timestamp: 12, confidence: 0.88 },
      { speaker: 'bot', text: 'Congratulations! Let me check availability for a window table for four on Friday evening.', timestamp: 18, confidence: 0.94 },
      { speaker: 'caller', text: 'Thank you. Ideally around 7:30 PM.', timestamp: 24, confidence: 0.91 },
      { speaker: 'bot', text: 'Perfect! I have a window table available at 7:30 PM for four guests. May I have your name please?', timestamp: 28, confidence: 0.97 },
      { speaker: 'caller', text: 'Sarah Mitchell.', timestamp: 35, confidence: 0.89 },
      { speaker: 'bot', text: 'Thank you, Sarah. And a contact number?', timestamp: 38, confidence: 0.95 },
      { speaker: 'caller', text: 'It\'s 020 7946 0958.', timestamp: 42, confidence: 0.85, has_redaction: true },
      { speaker: 'bot', text: 'Excellent. Your reservation is confirmed for Friday, November 15th at 7:30 PM, window table for four. Happy anniversary!', timestamp: 48, confidence: 0.96 },
      { speaker: 'caller', text: 'Perfect, thank you so much!', timestamp: 58, confidence: 0.93 }
    ],
    data_json: {
      guest_name: 'Sarah Mitchell',
      party_size: 4,
      booking_date: '2025-11-15',
      booking_time: '19:30',
      notes: 'Anniversary celebration, window seating preferred',
      deposit_paid: true,
      confirmation_status: 'confirmed'
    }
  },
  {
    id: 'call_002',
    timestamp: '2025-11-12T17:15:00Z',
    direction: 'inbound',
    category: 'feedback',
    sub_intent: 'complaint',
    caller_id: '+44 20 7946 0234',
    caller_name: 'James Cooper',
    site: 'Shoreditch Location',
    duration_seconds: 420,
    outcome: 'completed',
    sentiment_score: -0.65,
    asr_confidence: 0.89,
    tags: ['Complaint', 'Food Quality'],
    has_followup: true,
    summary: 'Customer complained about cold main course and slow service. Offered complimentary dessert and manager callback.',
    entities: ['James Cooper', 'Main course', 'Service delay'],
    risk_flags: ['Refund Request'],
    data_json: {
      rating: 2,
      positives: ['Ambience was nice'],
      negatives: ['Cold food', 'Slow service', 'No apology from staff'],
      aspects: {
        food: -0.8,
        service: -0.7,
        ambience: 0.4,
        price: -0.3
      },
      recommended: false
    }
  },
  {
    id: 'call_003',
    timestamp: '2025-11-12T16:45:00Z',
    direction: 'outbound',
    category: 'sales',
    sub_intent: 'event_followup',
    caller_id: '+44 20 7946 0777',
    caller_name: 'Emma Thompson',
    site: 'City Location',
    duration_seconds: 380,
    outcome: 'completed',
    sentiment_score: 0.72,
    asr_confidence: 0.96,
    tags: ['Corporate', 'High Value'],
    has_followup: true,
    summary: 'Follow-up on corporate event inquiry. Customer interested in booking 50-person holiday party. Budget £5000. Sending proposal.',
    entities: ['Emma Thompson', '50 guests', '£5000', 'Holiday party'],
    data_json: {
      lead_name: 'Emma Thompson',
      product: 'Corporate Event Package',
      budget: 5000,
      timeline: '2025-12-18',
      intent_score: 0.85
    }
  },
  {
    id: 'call_004',
    timestamp: '2025-11-12T15:20:00Z',
    direction: 'inbound',
    category: 'enquiry',
    sub_intent: 'menu_dietary',
    caller_id: '+44 20 7946 0456',
    caller_name: 'Priya Sharma',
    site: 'Mayfair Location',
    duration_seconds: 180,
    outcome: 'completed',
    sentiment_score: 0.45,
    asr_confidence: 0.91,
    tags: ['Dietary Requirements'],
    has_followup: false,
    summary: 'Caller asked about vegan options and gluten-free menu. Provided information and suggested booking.',
    entities: ['Priya Sharma', 'Vegan', 'Gluten-free'],
    data_json: {
      topic: 'dietary_requirements',
      info_provided: 'Full vegan menu available, separate gluten-free options'
    }
  },
  {
    id: 'call_005',
    timestamp: '2025-11-12T14:10:00Z',
    direction: 'inbound',
    category: 'support',
    sub_intent: 'booking_modification',
    caller_id: '+44 20 7946 0888',
    caller_name: 'David Chen',
    site: 'Shoreditch Location',
    duration_seconds: 210,
    outcome: 'completed',
    sentiment_score: 0.55,
    asr_confidence: 0.93,
    tags: ['Modification'],
    has_followup: false,
    summary: 'Customer changed party size from 6 to 8 for Nov 14 booking. Updated reservation successfully.',
    entities: ['David Chen', 'November 14', '8 guests'],
    data_json: {
      issue_type: 'booking_modification',
      severity: 'low',
      ticket_id: 'TKT-8821'
    }
  },
  {
    id: 'call_006',
    timestamp: '2025-11-12T13:30:00Z',
    direction: 'inbound',
    category: 'reservation',
    sub_intent: 'new_booking',
    caller_id: '+44 20 7946 0321',
    caller_name: 'Lisa Anderson',
    site: 'City Location',
    duration_seconds: 195,
    outcome: 'completed',
    sentiment_score: 0.78,
    asr_confidence: 0.97,
    tags: ['Lunch'],
    has_followup: false,
    summary: 'Business lunch booking for 3 on Nov 13 at 12:30 PM. Quick and efficient call.',
    entities: ['Lisa Anderson', 'November 13', '12:30 PM', '3 guests'],
    data_json: {
      guest_name: 'Lisa Anderson',
      party_size: 3,
      booking_date: '2025-11-13',
      booking_time: '12:30',
      notes: 'Business lunch, needs to finish by 2 PM'
    }
  },
  {
    id: 'call_007',
    timestamp: '2025-11-12T12:45:00Z',
    direction: 'inbound',
    category: 'feedback',
    sub_intent: 'positive',
    caller_id: '+44 20 7946 0555',
    caller_name: 'Robert Wilson',
    site: 'Mayfair Location',
    duration_seconds: 140,
    outcome: 'completed',
    sentiment_score: 0.92,
    asr_confidence: 0.95,
    tags: ['Compliment'],
    has_followup: false,
    summary: 'Customer called to praise excellent service from last night. Specifically mentioned waiter Tom. Very satisfied.',
    entities: ['Robert Wilson', 'Tom', 'Excellent service'],
    data_json: {
      rating: 5,
      positives: ['Outstanding service', 'Delicious food', 'Perfect ambience', 'Attentive staff'],
      negatives: [],
      aspects: {
        food: 0.95,
        service: 0.98,
        ambience: 0.90,
        price: 0.85
      },
      recommended: true
    }
  },
  {
    id: 'call_008',
    timestamp: '2025-11-12T11:20:00Z',
    direction: 'outbound',
    category: 'sales',
    sub_intent: 'lead_qualification',
    caller_id: '+44 20 7946 0999',
    caller_name: 'Michael Brown',
    site: 'City Location',
    duration_seconds: 290,
    outcome: 'completed',
    sentiment_score: 0.35,
    asr_confidence: 0.88,
    tags: ['Cold Lead'],
    has_followup: true,
    summary: 'Reached out to potential corporate client. Lukewarm interest. Will send information pack.',
    entities: ['Michael Brown', 'Corporate catering'],
    data_json: {
      lead_name: 'Michael Brown',
      product: 'Corporate Catering',
      budget: null,
      timeline: 'Q1 2026',
      intent_score: 0.35
    }
  }
];

// KPI data for dashboard
export const dashboardKPIs = {
  totalCalls: { value: 2847, delta: 12.5 },
  inboundCalls: { value: 1923, delta: 8.3 },
  outboundCalls: { value: 924, delta: 21.7 },
  avgHandleTime: { value: 254, delta: -5.2 }, // seconds
  avgSentiment: { value: 0.67, delta: 3.4 },
  conversionRate: { value: 68.5, delta: 4.1 },
  depositCapture: { value: 82.3, delta: 6.8 }
};

// Hourly demand data for heatmap
export const demandHeatmap = [
  { hour: '9 AM', Mon: 12, Tue: 15, Wed: 18, Thu: 22, Fri: 28, Sat: 45, Sun: 38 },
  { hour: '10 AM', Mon: 18, Tue: 22, Wed: 25, Thu: 30, Fri: 38, Sat: 62, Sun: 52 },
  { hour: '11 AM', Mon: 25, Tue: 28, Wed: 32, Thu: 38, Fri: 48, Sat: 75, Sun: 68 },
  { hour: '12 PM', Mon: 45, Tue: 52, Wed: 58, Thu: 65, Fri: 78, Sat: 95, Sun: 88 },
  { hour: '1 PM', Mon: 52, Tue: 58, Wed: 62, Thu: 68, Fri: 82, Sat: 88, Sun: 85 },
  { hour: '2 PM', Mon: 38, Tue: 42, Wed: 48, Thu: 52, Fri: 65, Sat: 72, Sun: 68 },
  { hour: '3 PM', Mon: 22, Tue: 25, Wed: 28, Thu: 32, Fri: 42, Sat: 55, Sun: 48 },
  { hour: '4 PM', Mon: 18, Tue: 22, Wed: 25, Thu: 28, Fri: 38, Sat: 52, Sun: 45 },
  { hour: '5 PM', Mon: 28, Tue: 32, Wed: 38, Thu: 45, Fri: 62, Sat: 78, Sun: 65 },
  { hour: '6 PM', Mon: 48, Tue: 55, Wed: 62, Thu: 72, Fri: 88, Sat: 105, Sun: 95 },
  { hour: '7 PM', Mon: 62, Tue: 68, Wed: 75, Thu: 85, Fri: 98, Sat: 118, Sun: 108 },
  { hour: '8 PM', Mon: 55, Tue: 62, Wed: 68, Thu: 78, Fri: 92, Sat: 108, Sun: 98 },
  { hour: '9 PM', Mon: 38, Tue: 42, Wed: 48, Thu: 55, Fri: 68, Sat: 82, Sun: 75 },
  { hour: '10 PM', Mon: 22, Tue: 25, Wed: 28, Thu: 32, Fri: 45, Sat: 58, Sun: 52 }
];

// Trend data for charts
export const volumeTrend = [
  { date: 'Nov 5', calls: 380, sentiment: 0.72 },
  { date: 'Nov 6', calls: 420, sentiment: 0.68 },
  { date: 'Nov 7', calls: 395, sentiment: 0.71 },
  { date: 'Nov 8', calls: 445, sentiment: 0.65 },
  { date: 'Nov 9', calls: 510, sentiment: 0.69 },
  { date: 'Nov 10', calls: 490, sentiment: 0.73 },
  { date: 'Nov 11', calls: 475, sentiment: 0.70 },
  { date: 'Nov 12', calls: 532, sentiment: 0.67 }
];

export const channelMix = [
  { name: 'Google Calls', value: 42, color: '#4DA3FF' },
  { name: 'Website CTC', value: 28, color: '#39D98A' },
  { name: 'Outbound', value: 18, color: '#FFD166' },
  { name: 'WhatsApp', value: 12, color: '#FF6B6B' }
];

export const aspectSentiment = [
  { aspect: 'Food', score: 0.82, count: 245 },
  { aspect: 'Service', score: 0.75, count: 298 },
  { aspect: 'Ambience', score: 0.88, count: 187 },
  { aspect: 'Price', score: 0.58, count: 156 },
  { aspect: 'Staff', score: 0.79, count: 221 }
];

export const siteLeaderboard = [
  { site: 'Mayfair Location', calls: 892, conversion: 74.2, noShow: 8.5, sentiment: 0.78 },
  { site: 'City Location', calls: 756, conversion: 71.8, noShow: 9.2, sentiment: 0.72 },
  { site: 'Shoreditch Location', calls: 634, conversion: 65.3, noShow: 12.1, sentiment: 0.68 },
  { site: 'Canary Wharf', calls: 565, conversion: 68.9, noShow: 10.3, sentiment: 0.70 }
];

// Category-specific data
export const reservationFunnel = [
  { label: 'Inquiry', value: 1245 },
  { label: 'Tentative', value: 982 },
  { label: 'Confirmed', value: 856 },
  { label: 'Seated', value: 784 }
];

export const cancellationReasons = [
  { name: 'Deposit Not Paid', value: 45 },
  { name: 'Change of Plan', value: 32 },
  { name: 'Duplicate Booking', value: 18 },
  { name: 'Other', value: 12 }
];

export const salesPipeline = [
  { label: 'Contacted', value: 1580 },
  { label: 'Qualified', value: 892 },
  { label: 'Proposal', value: 456 },
  { label: 'Won', value: 287 }
];

export const leadSources = [
  { name: 'Google Ads', value: 42 },
  { name: 'Organic', value: 28 },
  { name: 'Referral', value: 18 },
  { name: 'Campaign', value: 12 }
];

export const intentScoreDistribution = [
  { label: '0-20', value: 45 },
  { label: '21-40', value: 128 },
  { label: '41-60', value: 287 },
  { label: '61-80', value: 412 },
  { label: '81-100', value: 356 }
];

export const complaintTopics = [
  { name: 'Service Delay', value: 38 },
  { name: 'Order Error', value: 25 },
  { name: 'Staff Attitude', value: 18 },
  { name: 'Billing', value: 12 },
  { name: 'Other', value: 7 }
];

export const feedbackWords = [
  { text: 'excellent', weight: 95 },
  { text: 'slow', weight: 78 },
  { text: 'delicious', weight: 88 },
  { text: 'cold', weight: 65 },
  { text: 'friendly', weight: 82 },
  { text: 'noisy', weight: 45 },
  { text: 'fresh', weight: 72 },
  { text: 'expensive', weight: 58 },
  { text: 'amazing', weight: 91 },
  { text: 'disappointing', weight: 52 }
];

export const issueCategories = [
  { name: 'Payment', value: 35 },
  { name: 'Technical', value: 28 },
  { name: 'Order', value: 22 },
  { name: 'Account', value: 10 },
  { name: 'Misc', value: 5 }
];

export const resolutionTimeDistribution = [
  { label: '<2m', value: 245 },
  { label: '2-5m', value: 412 },
  { label: '5-10m', value: 187 },
  { label: '>10m', value: 78 }
];

export const unresolvedCases = [
  { issue: 'Payment failed - refund pending', age: '18h', severity: 'High' },
  { issue: 'Technical issue with app login', age: '12h', severity: 'Medium' },
  { issue: 'Booking not showing in system', age: '8h', severity: 'High' },
  { issue: 'Unable to modify reservation', age: '4h', severity: 'Low' }
];

export const enquiryTopics = [
  { name: 'Menu', value: 32 },
  { name: 'Pricing', value: 25 },
  { name: 'Location', value: 18 },
  { name: 'Timings', value: 15 },
  { name: 'Events', value: 10 }
];

export const repeatQueries = [
  { topic: 'Parking availability', calls: 12, info_provided: 100, sentiment: 0.65 },
  { topic: 'Vegan options', calls: 8, info_provided: 100, sentiment: 0.72 },
  { topic: 'Private dining cost', calls: 6, info_provided: 83, sentiment: 0.68 },
  { topic: 'Group booking policy', calls: 5, info_provided: 100, sentiment: 0.75 }
];

// Insights data
export const insightsTopics = {
  Reservation: [
    {
      label: "Late Seating", percentage: 18, sentiment: 0.45, terms: ["late", "wait", "delay"], trend: [
        { date: "Jan 1", count: 12 }, { date: "Jan 2", count: 15 }, { date: "Jan 3", count: 18 },
        { date: "Jan 4", count: 14 }, { date: "Jan 5", count: 20 }, { date: "Jan 6", count: 22 }, { date: "Jan 7", count: 19 }
      ]
    },
    {
      label: "Special Requests", percentage: 25, sentiment: 0.72, terms: ["window", "birthday", "allergy"], trend: [
        { date: "Jan 1", count: 20 }, { date: "Jan 2", count: 22 }, { date: "Jan 3", count: 25 },
        { date: "Jan 4", count: 28 }, { date: "Jan 5", count: 24 }, { date: "Jan 6", count: 30 }, { date: "Jan 7", count: 32 }
      ]
    },
    {
      label: "Deposit Queries", percentage: 15, sentiment: 0.58, terms: ["deposit", "payment", "card"], trend: [
        { date: "Jan 1", count: 8 }, { date: "Jan 2", count: 10 }, { date: "Jan 3", count: 12 },
        { date: "Jan 4", count: 11 }, { date: "Jan 5", count: 15 }, { date: "Jan 6", count: 14 }, { date: "Jan 7", count: 13 }
      ]
    },
    {
      label: "Table Availability", percentage: 32, sentiment: 0.65, terms: ["available", "table", "booking"], trend: [
        { date: "Jan 1", count: 35 }, { date: "Jan 2", count: 38 }, { date: "Jan 3", count: 42 },
        { date: "Jan 4", count: 40 }, { date: "Jan 5", count: 45 }, { date: "Jan 6", count: 48 }, { date: "Jan 7", count: 44 }
      ]
    },
  ],
  Sales: [
    {
      label: "Pricing Complaint", percentage: 22, sentiment: 0.42, terms: ["expensive", "price", "cost"], trend: [
        { date: "Jan 1", count: 15 }, { date: "Jan 2", count: 18 }, { date: "Jan 3", count: 20 },
        { date: "Jan 4", count: 17 }, { date: "Jan 5", count: 22 }, { date: "Jan 6", count: 24 }, { date: "Jan 7", count: 21 }
      ]
    },
    {
      label: "Package Pricing", percentage: 28, sentiment: 0.78, terms: ["package", "deal", "offer"], trend: [
        { date: "Jan 1", count: 25 }, { date: "Jan 2", count: 28 }, { date: "Jan 3", count: 32 },
        { date: "Jan 4", count: 30 }, { date: "Jan 5", count: 35 }, { date: "Jan 6", count: 38 }, { date: "Jan 7", count: 36 }
      ]
    },
  ],
  Feedback: [
    {
      label: "Service Delay", percentage: 30, sentiment: 0.35, terms: ["slow", "wait", "service"], trend: [
        { date: "Jan 1", count: 18 }, { date: "Jan 2", count: 22 }, { date: "Jan 3", count: 25 },
        { date: "Jan 4", count: 28 }, { date: "Jan 5", count: 24 }, { date: "Jan 6", count: 30 }, { date: "Jan 7", count: 28 }
      ]
    },
    {
      label: "Food Quality", percentage: 45, sentiment: 0.82, terms: ["delicious", "tasty", "fresh"], trend: [
        { date: "Jan 1", count: 40 }, { date: "Jan 2", count: 45 }, { date: "Jan 3", count: 48 },
        { date: "Jan 4", count: 50 }, { date: "Jan 5", count: 52 }, { date: "Jan 6", count: 55 }, { date: "Jan 7", count: 53 }
      ]
    },
  ],
};

export const aspectSentimentData = {
  Reservation: [
    { aspect: "Response Time", positive: 75, negative: 15, delta: 5 },
    { aspect: "Knowledge", positive: 82, negative: 10, delta: 3 },
    { aspect: "Politeness", positive: 88, negative: 8, delta: -2 },
  ],
  Feedback: [
    { aspect: "Food", positive: 78, negative: 12, delta: 4 },
    { aspect: "Service", positive: 65, negative: 25, delta: -3 },
    { aspect: "Ambience", positive: 72, negative: 18, delta: 2 },
    { aspect: "Staff", positive: 80, negative: 10, delta: 5 },
    { aspect: "Price", positive: 55, negative: 30, delta: -5 },
    { aspect: "Cleanliness", positive: 85, negative: 8, delta: 3 },
  ],
};

export const funnelData = {
  Reservation: {
    inbound: [
      { stage: "Attempted", count: 1200, conversion: 85 },
      { stage: "Connected", count: 1020, conversion: 75 },
      { stage: "Qualified", count: 765, conversion: 88 },
      { stage: "Confirmed", count: 673, conversion: 92 },
      { stage: "Completed", count: 619, conversion: 0 },
    ],
    outbound: [
      { stage: "Dialed", count: 800, conversion: 65 },
      { stage: "Answered", count: 520, conversion: 70 },
      { stage: "Pitched", count: 364, conversion: 82 },
      { stage: "Won", count: 298, conversion: 95 },
      { stage: "Closed", count: 283, conversion: 0 },
    ],
  },
  Sales: {
    inbound: [
      { stage: "Lead Contacted", count: 950, conversion: 72 },
      { stage: "Qualified", count: 684, conversion: 65 },
      { stage: "Proposal", count: 445, conversion: 78 },
      { stage: "Won", count: 347, conversion: 0 },
    ],
    outbound: [
      { stage: "Dialed", count: 1500, conversion: 58 },
      { stage: "Answered", count: 870, conversion: 62 },
      { stage: "Pitched", count: 539, conversion: 68 },
      { stage: "Won", count: 367, conversion: 0 },
    ],
  },
};

export const predictiveData = {
  Reservation: {
    title: "No-Show Likelihood",
    distribution: [
      { bucket: "0-0.2", count: 450 },
      { bucket: "0.2-0.4", count: 320 },
      { bucket: "0.4-0.6", count: 180 },
      { bucket: "0.6-0.8", count: 85 },
      { bucket: "0.8-1.0", count: 35 },
    ],
    mean: 0.28,
    features: [
      { name: "Deposit Missing", weight: 0.42 },
      { name: "Short Call Duration", weight: 0.28 },
      { name: "Weekend Booking", weight: 0.18 },
      { name: "Previous No-Show", weight: 0.12 },
    ],
    atRisk: [
      { id: "RES-1234", name: "Table for 4 - Smith", probability: 0.87, site: "Downtown" },
      { id: "RES-1235", name: "Table for 6 - Johnson", probability: 0.82, site: "Westside" },
      { id: "RES-1236", name: "Table for 2 - Williams", probability: 0.81, site: "Downtown" },
    ],
    insight: "Deposits missing and short call duration are top no-show drivers. Weekend bookings show 23% higher no-show rates.",
  },
  Sales: {
    title: "Deal Win Probability",
    distribution: [
      { bucket: "0-0.2", count: 280 },
      { bucket: "0.2-0.4", count: 420 },
      { bucket: "0.4-0.6", count: 380 },
      { bucket: "0.6-0.8", count: 290 },
      { bucket: "0.8-1.0", count: 150 },
    ],
    mean: 0.48,
    features: [
      { name: "Budget Confirmed", weight: 0.38 },
      { name: "Multiple Touchpoints", weight: 0.32 },
      { name: "Positive Sentiment", weight: 0.20 },
      { name: "Decision Maker", weight: 0.10 },
    ],
    atRisk: [
      { id: "LEAD-5678", name: "Enterprise Package - Acme Corp", probability: 0.89, site: "Corporate" },
      { id: "LEAD-5679", name: "Premium Plan - TechCo", probability: 0.85, site: "Corporate" },
    ],
    insight: "Budget confirmation and multiple touchpoints are strongest win predictors. Decision maker involvement increases probability by 18%.",
  },
};

export const aiGeneratedInsights = {
  Reservation: [
    { type: 'negative', text: "There were 50 calls where we were not able to give people their preferred slots" },
    { type: 'alert', text: "30% of such instances happened between 8-9 pm slots" },
    { type: 'negative', text: "We Got 20 times a special request for baby chair which we said no to" },
    { type: 'neutral', text: "High demand for patio seating observed on Friday evenings, exceeding capacity by 40%" }
  ],
  Feedback: [
    { type: 'negative', text: "Many customers reviewed that a specific dish always comes cold" },
    { type: 'alert', text: "Almost 37 people asked for vegetarian option over call, which we had to deny" },
    { type: 'positive', text: "Hostess 'Sarah' received 12 specific compliments for handling busy check-ins efficiently" },
    { type: 'negative', text: "Recurring complaints about music volume being too loud during lunch hours specifically" }
  ],
  Sales: [
    { type: 'neutral', text: "Leads from 'LinkedIn Campaign' take 20% longer to close but have 15% higher retention" },
    { type: 'alert', text: "45 calls dropped during the pricing discussion phase this week" }
  ]
};
