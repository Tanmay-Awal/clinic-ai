export const PLACEHOLDER_EMAIL_SUFFIX = '@fredricks.placeholder';

export const REPORT_LABELS: Record<string, string> = {
  bookings: 'Booking Report Preview',
  actions: 'Action Report Preview',
  coupons: 'Coupon Report Preview',
  feedback: 'Feedback Report Preview',
};

export const RECORD_LABELS: Record<string, string> = {
  bookings: 'reservations',
  actions: 'actions',
  coupons: 'coupons',
  feedback: 'responses',
};

/**
 * Centralized business logic for cell visibility.
 * Prevents showing data that shouldn't be visible under certain conditions.
 */
export function shouldHideCellValue(reportType: string, colId: string, row: any): boolean {
  // Coupons: only show redeemed_at when redeemed is true
  if (reportType === 'coupons' && colId === 'redeemed_at') {
    return row && row.redeemed !== true && row.redeemed !== 'true';
  }
  return false;
}

export interface ReportTheme {
  accentGradient: string;
  accentBg: string;
  accentText: string;
  accentBorder: string;
  accentBadge: string;
  accentTabActive: string;
  accentColSelected: string;
  accentFilterBorder: string;
  headerGradient: string;
  panelHeaderGradient: string;
  tableHeaderGradient: string;
  spinnerColor: string;
}

const THEME_MAP: Record<string, ReportTheme> = {
  coupons: {
    accentGradient: 'from-violet-600 to-violet-700',
    accentBg: 'bg-violet-600/10',
    accentText: 'text-violet-600',
    accentBorder: 'border-violet-600/30',
    accentBadge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
    accentTabActive: 'border-violet-600 text-violet-600 dark:text-violet-500 bg-background',
    accentColSelected: 'border-violet-500/40 bg-violet-50/40 dark:bg-violet-950/20',
    accentFilterBorder: 'border-l-violet-500',
    headerGradient: 'from-violet-950/20 via-transparent',
    panelHeaderGradient: 'from-violet-950/30 to-violet-900/10',
    tableHeaderGradient: 'from-violet-950/70 to-violet-900/50',
    spinnerColor: 'border-violet-600',
  },
  actions: {
    accentGradient: 'from-blue-600 to-blue-700',
    accentBg: 'bg-blue-600/10',
    accentText: 'text-blue-600',
    accentBorder: 'border-blue-600/30',
    accentBadge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    accentTabActive: 'border-blue-600 text-blue-600 dark:text-blue-500 bg-background',
    accentColSelected: 'border-blue-500/40 bg-blue-50/40 dark:bg-blue-950/20',
    accentFilterBorder: 'border-l-blue-500',
    headerGradient: 'from-blue-950/20 via-transparent',
    panelHeaderGradient: 'from-blue-950/30 to-blue-900/10',
    tableHeaderGradient: 'from-blue-950/70 to-blue-900/50',
    spinnerColor: 'border-blue-600',
  },
  bookings: {
    accentGradient: 'from-amber-600 to-amber-700',
    accentBg: 'bg-amber-600/10',
    accentText: 'text-amber-600',
    accentBorder: 'border-amber-600/30',
    accentBadge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    accentTabActive: 'border-amber-600 text-amber-600 dark:text-amber-500 bg-background',
    accentColSelected: 'border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20',
    accentFilterBorder: 'border-l-amber-500',
    headerGradient: 'from-amber-950/20 via-transparent',
    panelHeaderGradient: 'from-amber-950/30 to-amber-900/10',
    tableHeaderGradient: 'from-amber-950/70 to-amber-900/50',
    spinnerColor: 'border-amber-600',
  },
  feedback: {
    accentGradient: 'from-emerald-600 to-emerald-700',
    accentBg: 'bg-emerald-600/10',
    accentText: 'text-emerald-600',
    accentBorder: 'border-emerald-600/30',
    accentBadge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    accentTabActive: 'border-emerald-600 text-emerald-600 dark:text-emerald-500 bg-background',
    accentColSelected: 'border-emerald-500/40 bg-emerald-50/40 dark:bg-violet-950/20',
    accentFilterBorder: 'border-l-emerald-500',
    headerGradient: 'from-emerald-950/20 via-transparent',
    panelHeaderGradient: 'from-emerald-950/30 to-emerald-900/10',
    tableHeaderGradient: 'from-emerald-950/70 to-emerald-900/50',
    spinnerColor: 'border-emerald-600',
  },
};

export function getReportTheme(reportType: string): ReportTheme {
  return THEME_MAP[reportType] || THEME_MAP.feedback;
}
