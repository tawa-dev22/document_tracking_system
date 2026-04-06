import { Bell, FileText, LayoutDashboard, LogOut, PlusSquare, History, Users, Shield } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import logo from '../assets/logo.png';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/documents', label: 'Documents', icon: FileText },
  { to: '/submit', label: 'Submit', icon: PlusSquare },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/trace', label: 'Trace', icon: History }
];

const adminNavItems = [
  { to: '/admin/dashboard', label: 'Admin Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Manage Users', icon: Users },
  { to: '/admin/documents', label: 'Global Tracker', icon: FileText },
  { to: '/admin/logs', label: 'Audit Trail', icon: Shield }
];

export default function AppLayout({ children }) {
  const { user, logout, notificationSummary } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-transparent">
      <Toaster position="top-right" toastOptions={{
        className: 'rounded-2xl border border-slate-100 font-medium text-slate-900 shadow-xl',
        duration: 4000,
      }} />
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="sticky top-0 flex h-screen flex-col border-b border-slate-200 bg-white/90 p-6 backdrop-blur lg:border-b-0 lg:border-r">
          <Link to="/dashboard" className="flex items-center gap-3 text-xl font-bold text-slate-900 group">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 shadow-md transition-transform group-hover:scale-105">
              <img src={logo} alt="Ministry of Finance — official seal" className="h-full w-full rounded-full object-cover" />
            </div>
            <span className="leading-tight">Document Tracking</span>
          </Link>
          <p className="mt-4 text-xs font-bold uppercase tracking-widest text-slate-400">Ministry Portal</p>

          <nav className="mt-6 flex-1 space-y-1.5 overflow-y-auto pr-2 custom-scrollbar">
            {navItems.filter(item => {
              if (user?.role === 'ADMIN') {
                return !['/submit', '/documents', '/notifications'].includes(item.to);
              }
              return true;
            }).map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              const unread = item.to === '/notifications' ? (notificationSummary?.unreadCount || 0) : 0;
              
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all ${isActive ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <motion.div 
                    initial={false}
                    animate={{ x: isActive ? 2 : 0 }}
                    className="flex items-center gap-3 relative z-10"
                  >
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                    <span>{item.label}</span>
                  </motion.div>
                  
                  {unread > 0 && (
                    <motion.span 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`relative z-10 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${isActive ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
                    >
                      {unread}
                    </motion.span>
                  )}
                  
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0 z-[0] rounded-xl bg-slate-900"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </NavLink>
              );
            })}

            {user?.role === 'ADMIN' && (
              <>
                <div className="pt-6 pb-2 px-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Administration</p>
                </div>
                {adminNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) => `group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-bold transition-all ${isActive ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-indigo-50/50 hover:text-indigo-600'}`}
                    >
                      <motion.div 
                        initial={false}
                        animate={{ x: isActive ? 2 : 0 }}
                        className="flex items-center gap-3 relative z-10"
                      >
                        <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{item.label}</span>
                      </motion.div>
                      
                      {isActive && (
                        <motion.div
                          layoutId="sidebar-active"
                          className="absolute inset-0 z-[0] rounded-xl bg-indigo-600"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                        />
                      )}
                    </NavLink>
                  );
                })}
              </>
            )}
          </nav>

          <div className="mt-auto pt-6">
            <Link to="/profile" className="block rounded-2xl border border-slate-100 bg-slate-50 p-4 shadow-sm transition-all hover:shadow-md hover:border-slate-300 group">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 group-hover:text-slate-500 transition-colors">Authenticated As</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white uppercase group-hover:scale-105 transition-transform">
                  {user?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="overflow-hidden">
                  <p className="truncate text-sm font-bold text-slate-900">{user?.fullName}</p>
                  <p className="truncate text-[11px] font-medium text-slate-500 uppercase tracking-tighter">
                    {user?.role} {user?.grade && <span className="text-slate-400">· {user.grade}</span>}
                  </p>
                </div>
              </div>
            </Link>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={logout}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-rose-600"
            >
              <LogOut size={16} /> Logout
            </motion.button>
          </div>
        </aside>

        <main className="p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
