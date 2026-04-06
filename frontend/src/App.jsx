import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/common/PageTransition';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import DashboardPage from './pages/DashboardPage';
import DocumentDetailsPage from './pages/DocumentDetailsPage';
import DocumentPreviewPage from './pages/DocumentPreviewPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import SubmitDocumentPage from './pages/SubmitDocumentPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import LoginPage from './pages/auth/LoginPage';
import SignupPage from './pages/auth/SignupPage';
import TracePage from './pages/TracePage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import DocumentTracker from './pages/admin/DocumentTracker';
import AuditLogViewer from './pages/admin/AuditLogViewer';

function SecureApp() {
  const location = useLocation();
  return (
    <AppLayout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/dashboard" element={<PageTransition><DashboardPage /></PageTransition>} />
          <Route path="/documents" element={<PageTransition><DocumentsPage /></PageTransition>} />
          <Route path="/documents/:id" element={<PageTransition><DocumentDetailsPage /></PageTransition>} />
          <Route path="/documents/:id/preview/:versionId" element={<PageTransition><DocumentPreviewPage /></PageTransition>} />
          <Route path="/submit" element={<PageTransition><SubmitDocumentPage /></PageTransition>} />
          <Route path="/notifications" element={<PageTransition><NotificationsPage /></PageTransition>} />
          <Route path="/trace" element={<PageTransition><TracePage /></PageTransition>} />
          <Route path="/profile" element={<PageTransition><ProfilePage /></PageTransition>} />
          <Route path="/admin/dashboard" element={<PageTransition><AdminDashboard /></PageTransition>} />
          <Route path="/admin/users" element={<PageTransition><UserManagement /></PageTransition>} />
          <Route path="/admin/documents" element={<PageTransition><DocumentTracker /></PageTransition>} />
          <Route path="/admin/logs" element={<PageTransition><AuditLogViewer /></PageTransition>} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AnimatePresence>
    </AppLayout>
  );
}

export default function App() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><LoginPage /></PageTransition>} />
        <Route path="/signup" element={<PageTransition><SignupPage /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPasswordPage /></PageTransition>} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/*" element={<ProtectedRoute><SecureApp /></ProtectedRoute>} />
      </Routes>
    </AnimatePresence>
  );
}
