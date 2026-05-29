import { apiClient } from './client';
import type { CallInsightsReport } from '@/types/callInsights';

export const callInsightsApi = {
    /**
     * List existing call insights reports.
     */
    getReports: async (agentId?: string, limit: number = 10): Promise<{
        reports: Array<{
            id: number;
            status: string;
            period_start: string;
            period_end: string;
            total_calls: number;
            report_data: CallInsightsReport | null;
            generated_at: string | null;
            created_at: string;
        }>;
        hasMore: boolean;
    }> => {
        const response = await apiClient.get('/insights/calls', {
            params: { agentId, limit },
        });
        return response.data;
    },

    /**
     * Trigger new report generation.
     */
    generateReport: async (params: {
        agentId?: string;
        periodDays?: number;
        forceRegenerate?: boolean;
    }): Promise<{ reportId: number; status: string }> => {
        const response = await apiClient.post('/insights/calls/generate', params);
        return response.data;
    },

    /**
     * Get a specific report (for polling).
     */
    getReport: async (reportId: number): Promise<{
        report: {
            id: number;
            status: string;
            report_data: CallInsightsReport | null;
            total_calls: number;
            generated_at: string | null;
        } | null;
        status: string;
        error?: string;
    }> => {
        const response = await apiClient.get(`/insights/calls/${reportId}`);
        return response.data;
    },
};
