import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CookieConsentBanner } from './components/ui/CookieConsentBanner';
import { useAuth } from './hooks/useAuth';
import { AdminDashboardPage } from './pages/portal/AdminDashboardPage';
import { AuditHistoryPage } from './pages/portal/AuditHistoryPage';
import { CaseloadInventoryPage } from './pages/portal/CaseloadInventoryPage';
import { CaseloadResidentNewPage } from './pages/portal/CaseloadResidentNewPage';
import { CaseConferenceNewPage } from './pages/portal/CaseConferenceNewPage';
import { DonorDonationNewPage } from './pages/portal/DonorDonationNewPage';
import { IncidentNewPage } from './pages/portal/IncidentNewPage';
import { SafehouseNewPage } from './pages/portal/SafehouseNewPage';
import { DonorSupporterNewPage } from './pages/portal/DonorSupporterNewPage';
import { DonorsContributionsPage } from './pages/portal/DonorsContributionsPage';
import { DonorHistoryPage } from './pages/portal/DonorHistoryPage';
import { SupporterDonationHistoryPage } from './pages/portal/SupporterDonationHistoryPage';
import { HomeVisitationsPage } from './pages/portal/HomeVisitationsPage';
import { HomeVisitationNewPage } from './pages/portal/HomeVisitationNewPage';
import { ProcessRecordingNewPage } from './pages/portal/ProcessRecordingNewPage';
import { ProcessRecordingPage } from './pages/portal/ProcessRecordingPage';
import { MlInsightsDashboardPage } from './pages/portal/MlInsightsDashboardPage';
import { ReportsAnalyticsPage } from './pages/portal/ReportsAnalyticsPage';
import { DonatePage } from './pages/public/DonatePage';
import { HomePage } from './pages/public/HomePage';
import { GoogleCallbackPage } from './pages/public/GoogleCallbackPage';
import { ImpactDashboardPage } from './pages/public/ImpactDashboardPage';
import { LoginPage } from './pages/public/LoginPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';

function PortalHomeRoute() {
  const { user } = useAuth();

  // Donor users have a different landing page than staff/admin users.
  if (user?.roles.includes('Donor') && user.roles.length === 1) {
    return <Navigate to="/portal/my-impact" replace />;
  }

  return <Navigate to="/portal/admin" replace />;
}

function App() {
  return (
    <>
      {/* Public and portal routes share one shell, but ProtectedRoute decides which parts
          of the tree require an authenticated user and which roles may enter. */}
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="impact" element={<ImpactDashboardPage />} />
          <Route path="donate" element={<DonatePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="login/google/callback" element={<GoogleCallbackPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Staff', 'Donor']} />}>
            <Route path="portal" element={<PortalHomeRoute />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Staff']} />}>
            <Route path="portal/admin" element={<AdminDashboardPage />} />
            <Route path="portal/donors" element={<DonorsContributionsPage />} />
            <Route path="portal/donors/supporters/:supporterId/history" element={<SupporterDonationHistoryPage />} />
            <Route path="portal/caseload" element={<CaseloadInventoryPage />} />
            <Route path="portal/process-recordings" element={<ProcessRecordingPage />} />
            <Route path="portal/home-visitations" element={<HomeVisitationsPage />} />
            <Route path="portal/reports" element={<ReportsAnalyticsPage />} />
            <Route path="portal/ml-insights" element={<MlInsightsDashboardPage />} />
            <Route path="portal/ml-insights/:dashboardKey" element={<MlInsightsDashboardPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="portal/process-recordings/new" element={<ProcessRecordingNewPage />} />
            <Route path="portal/donors/donations/new" element={<DonorDonationNewPage />} />
            <Route path="portal/donors/supporters/new" element={<DonorSupporterNewPage />} />
            <Route path="portal/caseload/new" element={<CaseloadResidentNewPage />} />
            <Route path="portal/home-visitations/visits/new" element={<HomeVisitationNewPage />} />
            <Route path="portal/home-visitations/conferences/new" element={<CaseConferenceNewPage />} />
            <Route path="portal/reports/safehouses/new" element={<SafehouseNewPage />} />
            <Route path="portal/reports/incidents/new" element={<IncidentNewPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin']} />}>
            <Route path="portal/audit-history" element={<AuditHistoryPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Donor']} />}>
            <Route path="portal/my-impact" element={<DonorHistoryPage />} />
            <Route path="portal/donor-history" element={<DonorHistoryPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>

      <CookieConsentBanner />
    </>
  );
}

export default App;
