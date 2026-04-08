import { apiRequest } from '../client';

/** Staff/admin-only ML pipeline JSON (large). Prefer reading top-level summary fields in the UI. */
export const mlDashboardApi = {
  getDashboardData: (fileKey: string) =>
    apiRequest<Record<string, unknown>>(`/ml-dashboard/data/${encodeURIComponent(fileKey)}`),
};
