import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Students from './pages/Students.jsx';
import PendingApprovals from './pages/PendingApprovals.jsx';
import Posts from './pages/Posts.jsx';
import Comments from './pages/Comments.jsx';
import Reports from './pages/Reports.jsx';
import Moderation from './pages/Moderation.jsx';
import Announcements from './pages/Announcements.jsx';
import Events from './pages/Events.jsx';
import Groups from './pages/Groups.jsx';
import Analytics from './pages/Analytics.jsx';
import Admins from './pages/Admins.jsx';
import AuditLogs from './pages/AuditLogs.jsx';
import Payments from './pages/Payments.jsx';

function AdminGuard({ children }) {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return <div className="state">Verifying access…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) return (
    <div className="state">
      <h3>Access Denied</h3>
      <p>You do not have permission to access LU CONNECT Admin.</p>
    </div>
  );
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<AdminGuard><Layout /></AdminGuard>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="students" element={<Students />} />
        <Route path="pending-approvals" element={<PendingApprovals />} />
        <Route path="posts" element={<Posts />} />
        <Route path="comments" element={<Comments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="moderation" element={<Moderation />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="events" element={<Events />} />
        <Route path="groups" element={<Groups />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admins" element={<Admins />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="payments" element={<Payments />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
