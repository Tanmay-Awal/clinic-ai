## **PRD: Voice Bot Call Analytics - Insights Tab Implementation**

---

## **1. EXECUTIVE SUMMARY**

### **Product**
An "Insights" tab within the Netra AI dashboard that allows restaurant clients to generate AI-powered insights from their voice bot's call summaries with one click.

### **User Flow**
```
User clicks "Insights" tab
    │
    ▼
Sees insights dashboard (empty or previous insights)
    │
    ▼
Clicks "Run Now" button
    │
    ▼
System fetches last 7 days of call summaries
    │
    ▼
Loading state with progress indicator
    │
    ▼
AI generates structured insights
    │
    ▼
Insights displayed in beautiful, actionable format
    │
    ▼
User can export as PDF or share
```

---

## **2. DATA ARCHITECTURE**

### **2.1 Data Source**

Call summaries come from Retell AI / ElevenLabs call logs. Each call has:

| Field | Type | Description |
|-------|------|-------------|
| `call_id` | string | Unique identifier |
| `timestamp` | datetime | When call occurred |
| `duration_seconds` | number | Call length |
| `caller_number` | string | Masked/hashed for privacy |
| `call_type` | enum | `booking`, `enquiry`, `complaint`, `other` |
| `outcome` | enum | `successful`, `transferred`, `abandoned`, `failed` |
| `booking_details` | object | Date, time, party_size, guest_name (if booking) |
| `special_requests` | string[] | Any requests mentioned |
| `questions_asked` | string[] | Questions caller asked |
| `bot_responses` | string[] | Key bot responses |
| `issues` | string[] | Any friction/problems noted |
| `transcript_summary` | string | Brief summary of conversation |
| `sentiment` | enum | `positive`, `neutral`, `negative` |

---

### **2.2 Database Schema**

#### **Table: `voice_bot_calls`**

Stores raw call data synced from Retell/ElevenLabs.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `org_id` | UUID | FK to organizations |
| `bot_id` | string | Which bot handled the call |
| `call_id` | string | External call ID from Retell |
| `called_at` | timestamptz | Call timestamp |
| `duration_seconds` | integer | |
| `call_type` | text | booking/enquiry/complaint/other |
| `outcome` | text | successful/transferred/abandoned/failed |
| `booking_details` | jsonb | Captured booking info |
| `special_requests` | text[] | Array of requests |
| `questions_asked` | text[] | Array of questions |
| `issues` | text[] | Array of issues |
| `transcript_summary` | text | Brief summary |
| `sentiment` | text | positive/neutral/negative |
| `raw_data` | jsonb | Full payload from source |
| `created_at` | timestamptz | Record creation |

#### **Table: `call_insights_reports`**

Stores generated insight reports.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `org_id` | UUID | FK to organizations |
| `bot_id` | string | Which bot |
| `period_start` | date | Analysis period start |
| `period_end` | date | Analysis period end |
| `total_calls` | integer | Calls analyzed |
| `insights_data` | jsonb | Structured insights (see below) |
| `executive_summary` | jsonb | Summary section |
| `status` | text | pending/processing/completed/failed |
| `generated_at` | timestamptz | When insights were generated |
| `pdf_url` | text | Link to PDF export |
| `created_at` | timestamptz | Record creation |

---

### **2.3 Insights Data Structure**

The `insights_data` JSONB column stores the AI-generated insights in a structured format optimized for frontend rendering.

```typescript
interface CallInsightsReport {
  metadata: {
    restaurantName: string;
    botName: string;
    periodStart: string;        // ISO date
    periodEnd: string;          // ISO date
    totalCalls: number;
    generatedAt: string;        // ISO datetime
    analysisVersion: string;    // For tracking prompt versions
  };

  statistics: {
    totalCalls: number;
    bookingIntentCalls: number;
    successfulBookings: number;
    failedBookings: number;
    transferredCalls: number;
    abandonedCalls: number;
    averageDuration: number;    // seconds
    conversionRate: number;     // percentage
    transferRate: number;       // percentage
    totalCoversBooked: number;
    estimatedCoversLost: number;
  };

  executiveSummary: {
    criticalFinding: string;
    revenueImpact: string;
    immediateAction: string;
  };

  revenueInsights: RevenueInsight[];      // 5-8 insights
  botPerformanceIssues: BotIssue[];       // 4-6 issues
  strategicRecommendations: Recommendation[]; // 3-5 recommendations

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

interface RevenueInsight {
  id: string;                   // For React keys
  insightNumber: number;
  headline: string;
  category: 'demand_pattern' | 'lost_revenue' | 'capacity' | 'pricing' | 'upsell';
  urgency: 'critical' | 'high' | 'medium';
  
  signal: {
    description: string;
    callCount: number;          // How many calls showed this
    examples: string[];         // Specific examples from calls
    timePattern?: string;       // When this occurs
  };
  
  impact: {
    description: string;
    coversAffected?: number;
    revenueEstimate?: number;   // In GBP/INR
    recurringRisk: boolean;     // Will this repeat?
  };
  
  reasoning: string;            // Why this matters
  
  action: {
    description: string;
    owner?: string;             // Who should do this
    timeline: 'immediate' | 'this_week' | 'this_month';
  };
  
  evidence: {
    callIds?: string[];         // Reference to actual calls
    quotes?: string[];          // Caller quotes
  };
}

interface BotIssue {
  id: string;
  issueNumber: number;
  title: string;
  category: 'knowledge_gap' | 'flow_failure' | 'misunderstanding' | 'technical' | 'handoff';
  priority: 'critical' | 'high' | 'medium';
  
  problem: {
    description: string;
    frequency: number;          // How many times occurred
    examples: string[];         // Specific instances
  };
  
  callerImpact: {
    description: string;
    frustratedCallers: number;
    lostBookings: number;
    transfersTriggered: number;
  };
  
  trainingRecommendation: {
    description: string;
    specificFix: string;        // Exact thing to add/change
    estimatedEffort: 'quick_fix' | 'moderate' | 'significant';
  };
}

interface Recommendation {
  id: string;
  recommendationNumber: number;
  title: string;
  category: 'operations' | 'bot_training' | 'capacity' | 'marketing' | 'staffing';
  
  basedOn: string[];            // Which insights led to this
  
  opportunity: {
    description: string;
    potentialImpact: string;    // Revenue/efficiency/satisfaction
  };
  
  implementation: {
    immediate: string[];        // This week
    shortTerm: string[];        // This month
    ongoing: string[];          // Process changes
  };
  
  successMetric: string;        // How to measure success
}
```

---

## **3. API DESIGN**

### **3.1 Endpoints**

#### **GET `/api/insights/calls`**

Fetch existing insights reports for the organization.

**Request:**
```
GET /api/insights/calls?botId={botId}&limit=10
```

**Response:**
```typescript
{
  reports: CallInsightsReport[];
  hasMore: boolean;
}
```

---

#### **POST `/api/insights/calls/generate`**

Trigger new insights generation.

**Request:**
```typescript
{
  botId: string;
  periodDays?: number;          // Default 7
  forceRegenerate?: boolean;    // Regenerate even if recent exists
}
```

**Response:**
```typescript
{
  reportId: string;
  status: 'processing';
  estimatedTimeSeconds: number;
}
```

---

#### **GET `/api/insights/calls/{reportId}`**

Fetch specific report (poll for completion).

**Response:**
```typescript
{
  report: CallInsightsReport | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;            // 0-100 if processing
  error?: string;               // If failed
}
```

---

#### **GET `/api/insights/calls/{reportId}/pdf`**

Get PDF download URL.

**Response:**
```typescript
{
  pdfUrl: string;
  expiresAt: string;
}
```

---

### **3.2 Backend Processing Flow**

```
POST /api/insights/calls/generate
    │
    ▼
┌─────────────────────────────────────┐
│  1. Create report record            │
│     status = 'pending'              │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  2. Fetch calls from last 7 days   │
│     - Query voice_bot_calls table   │
│     - Filter by org_id, bot_id      │
│     - Order by called_at DESC       │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  3. Pre-process call data          │
│     - Calculate statistics          │
│     - Identify patterns             │
│     - Format for LLM                │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  4. Call Claude Sonnet 4           │
│     - System prompt (voice analytics)│
│     - Call summaries as user message│
│     - Request structured JSON output │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  5. Parse & validate response      │
│     - Validate against schema       │
│     - Add IDs to insights           │
│     - Calculate any derived fields  │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  6. Store in database              │
│     - Update call_insights_reports  │
│     - status = 'completed'          │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│  7. Generate PDF (async)           │
│     - Use same PDF generator        │
│     - Upload to storage             │
│     - Update pdf_url                │
└─────────────────────────────────────┘
```

---

## **4. FRONTEND DESIGN**

### **4.1 Page Structure**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  INSIGHTS TAB                                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  HEADER                                                          │   │
│  │  ┌──────────────────┐  ┌─────────────┐  ┌──────────────────┐   │   │
│  │  │ 📞 Call Insights │  │ Last 7 days │  │  [Run Now]       │   │   │
│  │  │    for Isabella  │  │ ▼ dropdown  │  │  [Export PDF]    │   │   │
│  │  └──────────────────┘  └─────────────┘  └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  EXECUTIVE SUMMARY CARD (Hero)                                   │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │  🚨 Critical Finding                                    │    │   │
│  │  │  "Saturday 7:30-8:30 PM turned away 4 bookings..."     │    │   │
│  │  │                                                         │    │   │
│  │  │  💰 Revenue Impact         🎯 Immediate Action          │    │   │
│  │  │  £1,210 lost              Call back the 6-top...       │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  QUICK STATS ROW                                                 │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │   │
│  │  │ 43      │ │ 28      │ │ 65%     │ │ 12%     │ │ 156     │   │   │
│  │  │ Calls   │ │Bookings │ │Convert  │ │Transfer │ │ Covers  │   │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  TAB NAVIGATION                                                  │   │
│  │  [Revenue Insights (6)] [Bot Issues (4)] [Recommendations (3)]  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  INSIGHTS LIST (Expandable Cards)                               │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │ 🔴 CRITICAL  │  #1                                      │    │   │
│  │  │ Saturday 7:30-8:30 PM Is Your Bottleneck - £1,200+ Lost│    │   │
│  │  │                                                    [▼] │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ┌────────────────────────────────────────────────────────┐    │   │
│  │  │ 🟡 HIGH  │  #2                                          │    │   │
│  │  │ Dietary Questions Causing 15% of Transfers             │    │   │
│  │  │                                                    [▼] │    │   │
│  │  └────────────────────────────────────────────────────────┘    │   │
│  │                                                                  │   │
│  │  ... more insights ...                                          │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  CALL PATTERNS (Collapsible Section)                            │   │
│  │                                                                  │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                    │   │
│  │  │ Calls by Day     │  │ Calls by Hour    │                    │   │
│  │  │ [Bar Chart]      │  │ [Bar Chart]      │                    │   │
│  │  └──────────────────┘  └──────────────────┘                    │   │
│  │                                                                  │   │
│  │  ┌──────────────────┐  ┌──────────────────┐                    │   │
│  │  │ Top Questions    │  │ Outcomes         │                    │   │
│  │  │ [List]           │  │ [Pie Chart]      │                    │   │
│  │  └──────────────────┘  └──────────────────┘                    │   │
│  │                                                                  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### **4.2 Component Breakdown**

#### **Page Component**

```
src/app/insights/calls/page.tsx
```

**Responsibilities:**
- Fetch existing reports on load
- Handle "Run Now" button click
- Poll for completion when generating
- Manage tab state (Revenue / Bot Issues / Recommendations)

---

#### **Executive Summary Card**

```
src/components/insights/ExecutiveSummaryCard.tsx
```

**Props:**
```typescript
interface ExecutiveSummaryCardProps {
  criticalFinding: string;
  revenueImpact: string;
  immediateAction: string;
  periodStart: string;
  periodEnd: string;
}
```

**Design:**
- Full-width card with gradient background
- Three sections: Finding, Impact, Action
- Prominent typography
- Warning/alert styling for critical findings

---

#### **Stats Row**

```
src/components/insights/StatsRow.tsx
```

**Props:**
```typescript
interface StatsRowProps {
  stats: {
    totalCalls: number;
    successfulBookings: number;
    conversionRate: number;
    transferRate: number;
    totalCoversBooked: number;
  };
  previousPeriodStats?: same; // For comparison arrows
}
```

**Design:**
- Horizontal row of stat cards
- Each card: big number + label
- Optional: up/down arrows comparing to previous period

---

#### **Insight Card**

```
src/components/insights/InsightCard.tsx
```

**Props:**
```typescript
interface InsightCardProps {
  insight: RevenueInsight | BotIssue | Recommendation;
  type: 'revenue' | 'bot' | 'recommendation';
  defaultExpanded?: boolean;
}
```

**Design:**
- Collapsed state: urgency badge, number, headline, expand icon
- Expanded state: full insight with all sections
- Color-coded left border based on urgency
- Smooth expand/collapse animation

**Sections when expanded:**

For Revenue Insights:
```
┌─────────────────────────────────────────────────────────┐
│ 🔴 CRITICAL  │  #1                                      │
│ Saturday 7:30-8:30 PM Is Your Bottleneck                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 SIGNAL DETECTED                                      │
│ 8 of 12 Saturday booking requests were for 7:30-8:30... │
│ • 6-top wanted 8:00 PM, offered 6:00 PM - rejected     │
│ • 4-top wanted 7:30 PM, offered 9:15 PM - rejected     │
│                                                          │
│ 💰 REVENUE IMPACT                                       │
│ 22 covers × £55 = £1,210 lost this week                 │
│ Recurring risk: YES - pattern repeats weekly            │
│                                                          │
│ 💡 WHY THIS MATTERS                                     │
│ Prime slot is at capacity but physical space may allow..│
│                                                          │
│ ✅ ACTION                                               │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Review Saturday 7:30-8:30 PM table plan             ││
│ │ Owner: Operations Manager                            ││
│ │ Timeline: This week                                  ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

For Bot Issues:
```
┌─────────────────────────────────────────────────────────┐
│ 🟡 HIGH  │  #1                                          │
│ Dietary Questions Causing Unnecessary Transfers         │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 🤖 WHAT'S HAPPENING                                    │
│ 6 callers asked about vegetarian/vegan options...       │
│ Frequency: 6 times (14% of calls)                       │
│                                                          │
│ 😤 CALLER IMPACT                                        │
│ • 4 callers transferred to staff                        │
│ • 2 callers said "I'll check online" and never returned│
│                                                          │
│ 🔧 TRAINING RECOMMENDATION                              │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Add to Isabella's knowledge:                        ││
│ │ • "Our vegetarian options include: [dishes]"        ││
│ │ • "For vegan guests, we offer: [dishes]"           ││
│ │ Effort: Quick fix (30 mins)                         ││
│ └─────────────────────────────────────────────────────┘│
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

#### **Call Patterns Section**

```
src/components/insights/CallPatternsSection.tsx
```

**Props:**
```typescript
interface CallPatternsSectionProps {
  patterns: CallInsightsReport['callPatterns'];
}
```

**Charts to render:**
- Calls by Day of Week (bar chart)
- Calls by Hour (bar chart)
- Outcomes Distribution (pie/donut chart)
- Party Size Distribution (bar chart)

**Use Recharts for charts.**

---

#### **Loading State**

```
src/components/insights/InsightsLoadingState.tsx
```

**Design:**
- Centered loading animation
- Progress indicator (if available)
- Estimated time remaining
- Fun/contextual loading messages:
  - "Analyzing 43 conversations..."
  - "Finding revenue opportunities..."
  - "Identifying bot training gaps..."

---

#### **Empty State**

```
src/components/insights/InsightsEmptyState.tsx
```

**Design:**
- Illustration
- "No insights generated yet"
- "Run Now" button prominent
- Brief explanation of what insights will show

---

### **4.3 State Management**

```typescript
// Page state
interface InsightsPageState {
  // Data
  currentReport: CallInsightsReport | null;
  previousReports: CallInsightsReport[];
  
  // UI State
  isLoading: boolean;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
  
  // Tab state
  activeTab: 'revenue' | 'bot' | 'recommendations';
  
  // Filter state (for future)
  selectedPeriod: '7days' | '14days' | '30days';
  selectedBot: string;
}
```

---

## **5. FILE STRUCTURE**

```
src/
├── app/
│   └── insights/
│       └── calls/
│           └── page.tsx                    # Main page component
│
├── components/
│   └── insights/
│       ├── ExecutiveSummaryCard.tsx
│       ├── StatsRow.tsx
│       ├── InsightCard.tsx
│       ├── InsightsList.tsx
│       ├── CallPatternsSection.tsx
│       ├── InsightsLoadingState.tsx
│       ├── InsightsEmptyState.tsx
│       ├── InsightsHeader.tsx
│       └── InsightsTabNavigation.tsx
│
├── services/
│   └── callInsights/
│       ├── index.ts                        # Main orchestrator
│       ├── callDataFetcher.ts              # Fetch calls from DB
│       ├── callDataPreprocessor.ts         # Format for LLM
│       ├── insightsGenerator.ts            # Call Claude
│       ├── insightsParser.ts               # Parse & validate response
│       └── insightsPdfGenerator.ts         # Generate PDF
│
├── types/
│   └── callInsights.ts                     # All TypeScript interfaces
│
├── prompts/
│   └── callAnalyticsPrompt.ts              # System prompt
│
└── app/
    └── api/
        └── insights/
            └── calls/
                ├── route.ts                 # GET existing reports
                ├── generate/
                │   └── route.ts             # POST generate new
                └── [reportId]/
                    ├── route.ts             # GET specific report
                    └── pdf/
                        └── route.ts         # GET PDF download
```

---

## **6. IMPLEMENTATION PHASES**

### **Phase 1: Foundation (Day 1-2)**

| Task | Details |
|------|---------|
| Database schema | Create `voice_bot_calls` and `call_insights_reports` tables |
| TypeScript types | Define all interfaces in `types/callInsights.ts` |
| System prompt | Finalize and add to `prompts/callAnalyticsPrompt.ts` |
| API route stubs | Create basic route handlers |

---

### **Phase 2: Backend Processing (Day 3-4)**

| Task | Details |
|------|---------|
| Call data fetcher | Query calls from database |
| Preprocessor | Format calls for LLM input |
| Claude integration | Call API with system prompt |
| Response parser | Validate and structure response |
| Store results | Save to database |

---

### **Phase 3: Frontend - Core (Day 5-6)**

| Task | Details |
|------|---------|
| Page layout | Basic page with header and sections |
| Stats row | Static stats display |
| Executive summary | Hero card component |
| Insights list | Expandable insight cards |
| Tab navigation | Switch between insight types |

---

### **Phase 4: Frontend - Polish (Day 7-8)**

| Task | Details |
|------|---------|
| Loading states | Generation progress UI |
| Empty states | First-time user experience |
| Charts | Call pattern visualizations |
| Animations | Expand/collapse, transitions |
| Error handling | Error states and retry |

---

### **Phase 5: PDF Export (Day 9)**

| Task | Details |
|------|---------|
| PDF template | HTML template for report |
| PDF generation | Server-side rendering |
| Storage | Upload to Supabase storage |
| Download | Secure download endpoint |

---

### **Phase 6: Testing & Polish (Day 10)**

| Task | Details |
|------|---------|
| Test with real data | Use actual Fredricks call data |
| Edge cases | Empty data, errors, timeouts |
| Performance | Loading times, API response |
| Mobile responsive | Check all breakpoints |

---

## **7. PROMPT FOR CLAUDE (BACKEND)**

When calling Claude to generate insights, format the request as:

```typescript
const systemPrompt = CALL_ANALYTICS_SYSTEM_PROMPT
  .replace('{RESTAURANT_NAME}', 'Fredricks at Machynys')
  .replace('{BOT_NAME}', 'Isabella')
  .replace('{DATE_RANGE}', '6th Jan - 12th Jan 2025');

const userMessage = `
## RESTAURANT CONTEXT
- Restaurant: ${restaurantName}
- Bot Name: ${botName}
- Period: ${periodStart} - ${periodEnd}
- Average Cover Value: £${avgCoverValue}

## CALL STATISTICS (Pre-calculated)
- Total Calls: ${stats.totalCalls}
- Booking Intent: ${stats.bookingIntentCalls}
- Successful Bookings: ${stats.successfulBookings}
- Conversion Rate: ${stats.conversionRate}%
- Transfer Rate: ${stats.transferRate}%

## CALL SUMMARIES

${formattedCallSummaries}

---

Analyze these calls and generate insights.

IMPORTANT: Respond with ONLY valid JSON matching this structure:
{
  "executiveSummary": { ... },
  "revenueInsights": [ ... ],
  "botPerformanceIssues": [ ... ],
  "strategicRecommendations": [ ... ]
}

No markdown, no explanation, just the JSON object.
`;
```

---

## **8. SUCCESS CRITERIA**

| Metric | Target |
|--------|--------|
| Generation time | <30 seconds for 100 calls |
| Insights quality | Owner says "I didn't know that" |
| Actionability | Every insight has specific action |
| UI responsiveness | <100ms interactions |
| Mobile usability | Fully functional on phone |

---

## **9. FUTURE ENHANCEMENTS**

| Enhancement | Priority | Description |
|-------------|----------|-------------|
| Real-time sync | Medium | Auto-sync calls from Retell |
| Scheduled reports | Medium | Weekly email digest |
| Comparison view | Low | Compare this week vs last |
| Custom periods | Low | Select date range |
| Multi-bot | Low | Aggregate across bots |
| Trend tracking | Medium | Track metrics over time |

---

## **10. HANDOFF TO CLAUDE CODE**

> "Implement the Voice Bot Call Analytics Insights Tab as specified in this PRD. Start with Phase 1 (Database schema and types). After each phase, test before proceeding. Use the exact data structures defined. Generate components that are clean, well-typed, and follow the existing Netra AI design patterns."

---

**This PRD is complete. Ready for implementation.**