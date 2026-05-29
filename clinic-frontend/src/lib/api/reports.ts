import { apiClient } from './client';

export interface ReportMetadata {
  reportType: string;
  columns: Record<string, { label: string; type: string }>;
  defaultColumns: string[];
  dateColumns: string[];
}

export interface SuggestionsResponse {
  column: string;
  values: string[];
}

export interface ReportFilter {
  column: string;
  operator: 'in' | 'like' | 'eq' | 'gte' | 'lte';
  value?: string | number;
  values?: (string | number)[];
}

export interface GenerateReportRequest {
  columns: string[];
  dateRange?: {
    column: string;
    from: string;
    to: string;
  };
  filters?: ReportFilter[];
  sort?: {
    column: string;
    direction: 'asc' | 'desc';
  };
  page?: number;
  pageSize?: number;
  export?: boolean;
}

export interface GenerateReportResponse {
  data: Record<string, any>[];
  total: number;
  page: number;
  pageSize: number;
}

export const reportsApi = {
  getReportMetadata: async (reportType: string): Promise<ReportMetadata> => {
    const response = await apiClient.get<ReportMetadata>(`/reports/${reportType}/metadata`);
    return response.data;
  },

  getReportSuggestions: async (reportType: string, column: string, search: string): Promise<SuggestionsResponse> => {
    const response = await apiClient.get<SuggestionsResponse>(
      `/reports/${reportType}/suggestions`,
      { params: { column, search } }
    );
    return response.data;
  },

  generateReport: async (reportType: string, request: GenerateReportRequest): Promise<GenerateReportResponse> => {
    const response = await apiClient.post<GenerateReportResponse>(
      `/reports/${reportType}/generate`,
      request
    );
    return response.data;
  },
};
