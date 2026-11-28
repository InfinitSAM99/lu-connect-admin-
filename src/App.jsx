import { StatusBar } from '@capacitor/status-bar';
import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { PAGE_ACCESS } from './lib/roles';
import Layout from './components/Layout.jsx';
import Splash from './components/Splash.jsx';
import ErrorCatcher from './components/ErrorCatcher.jsx';
import DeepLinkListener from './components/DeepLinkListener.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import SecurityThreats from './pages/SecurityThreats.jsx';
import RecoveryMessages from './pages/RecoveryMessages.jsx';
import HelpDesk from './pages/HelpDesk.jsx';
import Students from './pages/Students.jsx';
import PendingApprovals from './pages/PendingApprovals.jsx';
import Posts from './pages/Posts.jsx';
import Comments from './pages/Comments.jsx';
import Reports from './pages/Reports.jsx';
import Moderation from './pages/Moderation.jsx';
import Appeals from './pages/Appeals.jsx';
import Settings from './pages/Settings.jsx';
import AIAssistant from './pages/AIAssistant.jsx';
import Announcements from './pages/Announcements.jsx';
import Events from './pages/Events.jsx';
import Groups from './pages/Groups.jsx';
import Admins from './pages/Admins.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Payments from './pages/Payments.jsx';
import AdminCodes from './pages/AdminCodes.jsx';
import Boosts from './pages/Boosts.jsx';
import HallOfFameAdmin from './pages/HallOfFameAdmin.jsx';
import BoostPackagesAdmin from './pages/BoostPackagesAdmin.jsx';
import OtpManager from './pages/OtpManager.jsx';
import Visitors from './pages/Visitors.jsx';
import Pricing from './pages/Pricing.jsx';
import Banned from './pages/Banned.jsx';
import NotAuthorized from './pages/NotAuthorized.jsx';
import MessagesList from './pages/MessagesList.jsx';
import TeamChat from './pages/TeamChat.jsx';

function AdminGuard({ children }) {
  const { user, loading, isModerator, isBanned } = useAuth();
  if (loading) return <div className="state">Verifying access…</div>;
  if (isBanned) return <Navigate to="/banned" replace />;
  if (!user) return <Navigate to="/login" replace />;
  if (!isModerator) return <NotAuthorized />;
  return children;
}

function RoleGuard({ routePath, children }) {
  const { roleLevel, loading } = useAuth();
  if (loading) return <div className="state">Loading…</div>;
  const required = PAGE_ACCESS[routePath] ?? 1;
  if (roleLevel < required) return <NotAuthorized />;
  return children;
}

function AdminRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/banned" element={<Banned />} />
      <Route path="/" element={<AdminGuard><Layout /></AdminGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        
        <Route path="dashboard" element={<RoleGuard routePath="dashboard"><Dashboard /></RoleGuard>} />
        <Route path="moderation" element={<RoleGuard routePath="moderation"><Moderation /></RoleGuard>} />
        <Route path="reports" element={<RoleGuard routePath="reports"><Reports /></RoleGuard>} />
        <Route path="appeals" element={<RoleGuard routePath="appeals"><Appeals /></RoleGuard>} />
        <Route path="posts" element={<RoleGuard routePath="posts"><Posts /></RoleGuard>} />
        <Route path="comments" element={<RoleGuard routePath="comments"><Comments /></RoleGuard>} />
        <Route path="help-desk" element={<RoleGuard routePath="help-desk"><HelpDesk /></RoleGuard>} />
        <Route path="recovery-messages" element={<RoleGuard routePath="recovery-messages"><RecoveryMessages /></RoleGuard>} />
        
        <Route path="team-chat" element={<RoleGuard routePath="team-chat"><MessagesList /></RoleGuard>} />
        <Route path="team-chat/:id" element={<RoleGuard routePath="team-chat"><TeamChat /></RoleGuard>} />

        <Route path="students" element={<RoleGuard routePath="students"><Students /></RoleGuard>} />
        <Route path="pending-approvals" element={<RoleGuard routePath="pending-approvals"><PendingApprovals /></RoleGuard>} />
        <Route path="security-threats" element={<RoleGuard routePath="security-threats"><SecurityThreats /></RoleGuard>} />
        <Route path="announcements" element={<RoleGuard routePath="announcements"><Announcements /></RoleGuard>} />
        <Route path="events" element={<RoleGuard routePath="events"><Events /></RoleGuard>} />
        <Route path="groups" element={<RoleGuard routePath="groups"><Groups /></RoleGuard>} />
        <Route path="visitors" element={<RoleGuard routePath="visitors"><Visitors /></RoleGuard>} />
        <Route path="ai" element={<RoleGuard routePath="ai"><AIAssistant /></RoleGuard>} />
        <Route path="boosts" element={<RoleGuard routePath="boosts"><Boosts /></RoleGuard>} />
            <Route path="hall-of-fame-admin" element={<HallOfFameAdmin />} />
            <Route path="boost-packages" element={<BoostPackagesAdmin />} />
        <Route path="audit-logs" element={<RoleGuard routePath="audit-logs"><AuditLogs /></RoleGuard>} />

        <Route path="settings" element={<RoleGuard routePath="settings"><Settings /></RoleGuard>} />
        <Route path="payments" element={<RoleGuard routePath="payments"><Payments /></RoleGuard>} />
        <Route path="pricing" element={<RoleGuard routePath="pricing"><Pricing /></RoleGuard>} />
        <Route path="admins" element={<RoleGuard routePath="admins"><Admins /></RoleGuard>} />
        <Route path="admin-codes" element={<RoleGuard routePath="admin-codes"><AdminCodes /></RoleGuard>} />
        <Route path="otp-manager" element={<RoleGuard routePath="otp-manager"><OtpManager /></RoleGuard>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  useEffect(() => {
    StatusBar.setOverlaysWebView({ overlay: true });
    StatusBar.setBackgroundColor({ color: '#00000000' });
    StatusBar.setStyle({ style: 'LIGHT' });
  }, []);

  return (
    <>
      <DeepLinkListener />
      <Splash />
      <ErrorCatcher>
        <AdminRoutes />
      </ErrorCatcher>
    </>
  );
}
