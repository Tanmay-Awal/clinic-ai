// CLIENT-SIDE exports (safe to import in client components)
export { apiClient } from './client';
export * from './auth';
export * from './resources'; // Exports callsApi, etc. (CLIENT-SIDE ONLY)
export { createResourceApi } from './factory';
export { dashboardApi } from './dashboard';
export { callInsightsApi } from './call-insights';

// SERVER-SIDE exports (ONLY import in Server Components/Actions/API Routes)
// These are commented out to prevent accidental import in client code
// Import directly from the files when needed:
// import { getServerApiClient } from '@/lib/api/server-client';
// import { serverCallsApi } from '@/lib/api/server-resources';
// import { createServerResourceApi } from '@/lib/api/server-factory';

// Types
export type { AxiosResponse, AxiosError } from 'axios';

