import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { ProtectedRoute } from './components/ProtectedRoute';
import { CookieConsentBanner } from './components/ui/CookieConsentBanner';
import { useAuth } from './hooks/useAuth';
import { AdminDashboardPage } from './pages/portal/AdminDashboardPage';
import { CaseloadInventoryPage } from './pages/portal/CaseloadInventoryPage';
import { DonorsContributionsPage } from './pages/portal/DonorsContributionsPage';
import { DonorHistoryPage } from './pages/portal/DonorHistoryPage';
import { HomeVisitationsPage } from './pages/portal/HomeVisitationsPage';
import { ProcessRecordingPage } from './pages/portal/ProcessRecordingPage';
import { ReportsAnalyticsPage } from './pages/portal/ReportsAnalyticsPage';
import { DonatePage } from './pages/public/DonatePage';
import { HomePage } from './pages/public/HomePage';
import { ImpactDashboardPage } from './pages/public/ImpactDashboardPage';
import { LoginPage } from './pages/public/LoginPage';
import { NotFoundPage } from './pages/public/NotFoundPage';
import { PrivacyPolicyPage } from './pages/public/PrivacyPolicyPage';

function PortalHomeRoute() {
  const { user } = useAuth();

  // Donor users have a different landing page than staff/admin users.
  if (user?.roles.includes('Donor') && user.roles.length === 1) {
    return <Navigate to="/portal/donor-history" replace />;
  }

  return <Navigate to="/portal/admin" replace />;
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="impact" element={<ImpactDashboardPage />} />
          <Route path="donate" element={<DonatePage />} />
          <Route path="login" element={<LoginPage />} />
          <Route path="privacy" element={<PrivacyPolicyPage />} />

          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Staff', 'Donor']} />}>
            <Route path="portal" element={<PortalHomeRoute />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Admin', 'Staff']} />}>
            <Route path="portal/admin" element={<AdminDashboardPage />} />
            <Route path="portal/donors" element={<DonorsContributionsPage />} />
            <Route path="portal/caseload" element={<CaseloadInventoryPage />} />
            <Route path="portal/process-recordings" element={<ProcessRecordingPage />} />
            <Route path="portal/home-visitations" element={<HomeVisitationsPage />} />
            <Route path="portal/reports" element={<ReportsAnalyticsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['Donor']} />}>
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
