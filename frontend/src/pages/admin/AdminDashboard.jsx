import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  FileText, 
  Activity, 
  AlertCircle, 
  UserCheck, 
  UserX, 
  FileCheck, 
  Clock,
  ArrowUpRight,
  Shield
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StatCard = ({ title, value, icon: Icon, color, subtitle }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative"
  >
    <div className={`absolute top-0 right-0 w-32 h-32 ${color} bg-opacity-5 rounded-full -translate-y-1/2 translate-x-1/2`}></div>
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className={`p-3 rounded-2xl ${color} bg-opacity-10 text-${color.split('-')[1]}-600`}>
        <Icon size={24} />
      </div>
      <ArrowUpRight size={16} className="text-slate-300" />
    </div>
    <div className="relative z-10">
      <h3 className="text-3xl font-black text-slate-800 tracking-tight">{value}</h3>
      <p className="text-sm font-bold text-slate-500 mt-1">{title}</p>
      {subtitle && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">{subtitle}</p>}
    </div>
  </motion.div>
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/admin/stats');
        setStats(res.data.data);
      } catch (error) {
        toast.error('Failed to load system statistics');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-900 border-t-transparent"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Systems Overview</h1>
          <p className="text-slate-500 font-medium">Real-time health monitoring and administrative controls.</p>
        </div>
        <div className="bg-slate-950 text-white px-5 py-2.5 rounded-2xl flex items-center gap-2 text-sm font-black shadow-lg shadow-slate-200">
          <Shield size={16} /> ADMINISTRATOR ACCESS
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Personnel" 
          value={stats?.users?.total || 0} 
          icon={Users} 
          color="bg-slate-500" 
          subtitle={`${stats?.users?.active || 0} Active Accounts`}
        />
        <StatCard 
          title="Pending Documents" 
          value={stats?.documents?.SUBMITTED || 0} 
          icon={Clock} 
          color="bg-amber-500" 
          subtitle="Awaiting initial processing"
        />
        <StatCard 
          title="Security Alerts" 
          value={stats?.users?.suspended || 0} 
          icon={AlertCircle} 
          color="bg-rose-500" 
          subtitle="Suspended accounts requiring audit"
        />
        <StatCard 
          title="Finalized Archives" 
          value={(stats?.documents?.APPROVED || 0) + (stats?.documents?.REJECTED || 0)} 
          icon={FileCheck} 
          color="bg-emerald-500" 
          subtitle="Closed workflows this session"
        />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* RECENT SYSTEM ACTIVITY */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700">
                <Activity size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight">Recent Global Activity</h2>
            </div>
          </div>

          <div className="space-y-4">
            {stats?.activity?.map((log, idx) => (
              <div key={log._id} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="bg-white p-2.5 rounded-xl shadow-sm">
                  <Activity size={18} className="text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <p className="text-sm font-bold text-slate-800 truncate">{log.actor?.fullName || 'System'}</p>
                    <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">{log.action}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter truncate max-w-[200px]">IP: {log.ipAddress || 'Internal'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RECENT ALERTS WIDGET */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-rose-50 p-2.5 rounded-xl text-rose-500">
                  <Shield size={20} />
                </div>
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Security Posture</h2>
              </div>
              
              <div className="space-y-4">
                 <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3">
                    <UserCheck size={20} className="text-emerald-600" />
                    <div className="min-w-0">
                       <p className="text-[11px] font-black text-emerald-800 uppercase tracking-widest">Database Health</p>
                       <p className="text-xs font-bold text-emerald-600 truncate">Records synchronized and secure</p>
                    </div>
                 </div>

                 <div className={`p-4 rounded-2xl ${stats?.users?.suspended > 0 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'} border flex items-center gap-3`}>
                    <UserX size={20} className={stats?.users?.suspended > 0 ? 'text-rose-600' : 'text-slate-400'} />
                    <div className="min-w-0">
                       <p className={`text-[11px] font-black uppercase tracking-widest ${stats?.users?.suspended > 0 ? 'text-rose-800' : 'text-slate-500'}`}>Suspended Accounts</p>
                       <p className={`text-xs font-bold truncate ${stats?.users?.suspended > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                          {stats?.users?.suspended || 0} accounts requiring investigation
                       </p>
                    </div>
                 </div>
              </div>
          </div>
        </div>

      </div>
    </div>
  );
}
