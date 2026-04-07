import { authApi } from './modules/auth';
import { dashboardApi } from './modules/dashboard';
import { donorApi } from './modules/donors';
import { caseManagementApi } from './modules/caseManagement';
import { reportsApi } from './modules/reports';

// Keep a single `api` export for the rest of the app so pages do not need to care how the
// route helpers are grouped internally. The cleanup here is organizational, not a contract
// change for callers.
export const api = {
  ...authApi,
  ...dashboardApi,
  ...donorApi,
  ...caseManagementApi,
  ...reportsApi,
};
