/**
 * Normalizes a string for comparison (trim + lowercase)
 */
export const normalize = (val?: string): string => val?.trim().toLowerCase() || '';
