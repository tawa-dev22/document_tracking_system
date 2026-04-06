import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-500">Loading secure workspace...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
