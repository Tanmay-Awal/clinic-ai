/**
 * Dashboard Magic Strings and Business Logic Constants
 */

export const DASHBOARD_CONSTANTS = {
  // Hardcoded Emails for Organization Filtering/Business Logic
  EMAILS: {
    CONTACT: 'contact@humanai.co.uk',
    BANGALORE_EXPRESS: 'bangaloreexpress@huemanai.co.uk',
  },

  // Hardcoded cutoff dates for historical data normalization
  DATES: {
    FEEDBACK_STRICT_START: '2026-02-16 00:00:00',
  },

  // Regex patterns for AI transcript analysis (upsell, confirmation)
  REGEX: {
    CONFIRMATION:
      '(let me confirm|perfect let me confirm|just to confirm|does everything sound right)',
    UPSELL:
      '(house wine on arrival|bottle of champagne requested|prosecco|house wine|champagne|\\yrose\\y|\\yrosé\\y)',
    NEGATIVE_UPSELL:
      '(would you like|starts from|no wine|without wine|not wine|no prosecco|no champagne|no rose|no rosé)',
  },

  // Disconnection reason magic strings from providers (Retell/ElevenLabs)
  DISCONNECTION_REASONS: {
    VOICEMAIL: 'voicemail_detection tool was called.',
    TRANSFER: 'call_transfer',
    END_CALL_TOOL: 'end_call tool was called.',
    REMOTE_PARTY: 'Call ended by remote party',
    CLIENT_DISCONNECTED_1000: 'Client disconnected: 1000',
    CLIENT_DISCONNECTED_1005: 'Client disconnected: 1005',
    INACTIVITY: 'Max inactive time reached',
    DURATION_LIMIT: 'Max duration limit reached',
  },

  // Organization names
  ORGANIZATIONS: {
    FREDRICKS: 'fredricks',
  },

  // Standard ILIKE patterns for transcript filtering and categorization
  ILIKE_PATTERNS: {
    MEANINGFUL_FEEDBACK_PROMPTS: [
      '%anything in particular you enjoyed%',
      '%food or the service mainly%',
      '%manager hears about this directly%',
      '%how were the team looking after you%',
      '%did everything feel right for the occasion%',
      '%and the food - how did you find it%',
      '%and the food — how did you find it%',
      '%twenty percent%',
      '%Would you mind telling me a bit more%',
      '%Hopefully next time%',
    ],
    IGNORE_VOICEMAIL_TRANSCRIPTS: [
      '%person is available%',
      '%Thanks. Please stay on the line%',
    ],
  },
};
