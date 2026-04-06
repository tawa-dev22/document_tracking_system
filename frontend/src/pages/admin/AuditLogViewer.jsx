import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Filter, 
  Calendar, 
  Shield, 
  User, 
  Database, 
  Terminal,
  Monitor,
  ChevronRight,
  Globe
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ActionBadge = ({ action }) => {
  const isSecurity = action.includes('SENSITIVE') || action.includes('DENIED') || action.includes('SUSPENDED');
  return (
    <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${
       isSecurity ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-600 border-slate-100'
    }`}>
      {action.replace(/_/g, ' ')}
    </div>
  );
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/logs', {
        params: { action: actionFilter, page }
      });
      setLogs(res.data.logs);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      toast.error('Failed to retrieve system audit logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, page]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">System Audit logs</h1>
          <p className="text-slate-500 font-medium">Immutable registry of all critical administrative and user interactions.</p>
        </div>
        <div className="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl flex items-center gap-2 text-xs font-black border border-slate-200">
          <Database size={14} /> LIVE REPLICATED
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-4 group focus-within:border-slate-950 transition-all">
          <Terminal size={18} className="text-slate-400" />
          <div className="flex-1 text-xs font-black text-slate-400 group-focus-within:text-slate-800 cursor-default">SYSTEM-WIDE AUDIT FEED</div>
          <select 
             className="bg-transparent text-sm font-black text-slate-800 focus:outline-none transition-all cursor-pointer"
             value={actionFilter}
             onChange={(e) => setActionFilter(e.target.value)}
          >
            <option value="">All Operation Types</option>
            <option value="LOGIN">Login Activities</option>
            <option value="SENSITIVE_ACCESS">Sensitive Access</option>
            <option value="USER_UPDATED">User Orchestration</option>
            <option value="DOCUMENT_FORWARDED">Document Movement</option>
            <option value="ACCESS_DENIED">Security Violations</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Timestamp</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Security event</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Initiating Actor</th>
                <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Context</th>
                <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Source info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {logs.map((log) => (
                  <motion.tr 
                    key={log._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-slate-300" />
                        <span className="text-xs font-bold text-slate-600">
                          {new Date(log.createdAt).toLocaleDateString()}
                          <span className="ml-2 opacity-50 font-medium">{new Date(log.createdAt).toLocaleTimeString()}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                        <ActionBadge action={log.action} />
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-[10px]">
                           {log.actor?.fullName?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'SYS'}
                        </div>
                        <p className="text-xs font-bold text-slate-800">{log.actor?.fullName || 'System'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="max-w-[200px] truncate">
                        <p className="text-[10px] font-bold text-slate-400 uppercase truncate">
                          {JSON.stringify(log.metadata || log.newValue || {}).slice(0, 50)}...
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                       <div className="flex flex-col items-end gap-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5 leading-none">
                            <Globe size={10} /> {log.ipAddress || 'Internal'}
                          </p>
                          <p className="text-[9px] font-medium text-slate-300 max-w-[120px] truncate leading-none">
                            {log.userAgent}
                          </p>
                       </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs font-bold text-slate-400">Showing page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button 
               disabled={page === 1}
               onClick={() => setPage(p => p - 1)}
               className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-50 hover:bg-slate-50 transition-all"
            >
              Previous
            </button>
            <button 
               disabled={page === totalPages}
               onClick={() => setPage(p => p + 1)}
               className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
