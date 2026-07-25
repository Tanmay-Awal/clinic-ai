/** localStorage key for push notification opt-out flag */
export const PUSH_OPT_OUT_KEY = 'push-notifications-opted-out';

/**
 * Maximum number of call IDs that can be embedded directly in the URL query string.
 * Sets above this threshold are stored in sessionStorage under a short `drilldown_id` key
 * and referenced via ?drilldown_id=… to avoid URL-length limits.
 * Both the write side (dashboard/page.tsx) and the read side (CallsList.tsx) must use
 * this same value — do not hard-code 50 anywhere else.
 */
export const CALL_IDS_URL_THRESHOLD = 50;

export const RESERVATION_OUTCOMES = [
  'Urgent Case',
  'Action Required',
  'Appointment Booked',
  'Booking Cancelled',
  'Reschedule Requested',
  'Enquiry Handled',
  'General Assistance',
] as const;

export const FEEDBACK_METRICS = [
  'Meaningful Feedback Given',
  'Non Meaningful',
  'Voicemail',
  'Failed/Unanswered',
  'Positive',
  'Negative',
  'Compliment',
  'Complaint',
  'Mixed',
] as const;

export function normalizeReservationOutcomeFilter(value: string): string {
  const match = RESERVATION_OUTCOMES.find(
    (item) => item.toLowerCase() === value.trim().toLowerCase(),
  );
  return match || value;
}

export function normalizeFeedbackMetricFilter(value: string): string {
  const raw = value.trim();
  const normalized = raw.toLowerCase();
  const aliases: Record<string, string> = {
    meaningful: 'Meaningful Feedback Given',
    'meaningful calls': 'Meaningful Feedback Given',
    unanswered: 'Failed/Unanswered',
    'failed unanswered': 'Failed/Unanswered',
    neutral: 'Mixed',
  };
  if (aliases[normalized]) return aliases[normalized];
  const match = FEEDBACK_METRICS.find(
    (item) => item.toLowerCase() === normalized,
  );
  return match || raw;
}
