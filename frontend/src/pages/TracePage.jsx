import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Search, Hash, User, Clock, FileText, Filter, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function TracePage() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/documents/activity')
      .then((res) => setLogs(res.data.data))
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 600));
  }, []);

  const filtered = logs.filter(log => 
    [log.document?.title, log.documentId?.title, log.document?.referenceNumber, log.documentId?.referenceNumber, log.actor?.fullName, log.action]
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const Skeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="h-12 w-full bg-slate-100 rounded-2xl" />
      <div className="card divide-y divide-slate-100">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex gap-4 p-6 items-center">
            <div className="h-10 w-10 bg-slate-50 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 bg-slate-100 rounded-lg" />
              <div className="h-3 w-1/3 bg-slate-50 rounded-md" />
            </div>
            <div className="h-8 w-32 bg-slate-50 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Audit Trace</h1>
          <p className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-widest text-slate-400">Comprehensive System Activity Log</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">
             <ShieldCheck size={14} /> Immutable Ledger
           </div>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative group"
      >
        <input 
          placeholder="Trace by title, reference, actor or protocol..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12 transition-all group-hover:border-slate-300 h-14 text-sm font-bold"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 transition-colors" size={20} />
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="card overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                <th className="px-6 py-4">Status & Actor</th>
                <th className="px-6 py-4">Resource Identity</th>
                <th className="px-6 py-4">Protocol Action</th>
                <th className="px-6 py-4 text-right">Registered At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((log, i) => (
                (() => {
                  const documentRef = log.document || log.documentId;
                  const documentRouteId = typeof log.documentId === 'string' ? log.documentId : (documentRef?._id || null);
                  return (
                <motion.tr 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                  key={log._id} 
                  className={`group transition-colors hover:bg-slate-50/50 ${documentRouteId ? 'cursor-pointer' : ''}`}
                  onClick={() => {
                    if (documentRouteId) navigate(`/documents/${documentRouteId}`);
                  }}
                  onKeyDown={(event) => {
                    if (!documentRouteId) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      navigate(`/documents/${documentRouteId}`);
                    }
                  }}
                  tabIndex={documentRouteId ? 0 : -1}
                  role={documentRouteId ? 'button' : undefined}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center group-hover:bg-slate-900 group-hover:text-white transition-all shadow-sm">
                        <User size={16} />
                      </div>
                      <div>
                        <p className="font-black text-slate-900 text-sm tracking-tight">{log.actor?.fullName}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{log.actor?.role || 'Personnel'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <Hash size={12} className="text-slate-300" />
                      <span className="font-mono text-xs font-bold text-slate-500 uppercase">{documentRef?.referenceNumber || 'N/A'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                       <span className="inline-flex w-fit px-2 py-0.5 rounded-lg bg-slate-100 text-[9px] font-black uppercase tracking-widest text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                         {log.action.replaceAll('_', ' ')}
                       </span>
                       <p className="font-bold text-slate-700 truncate max-w-[250px] text-sm tracking-tight">{documentRef?.title || 'System Operation'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-right whitespace-nowrap">
                    <div className="flex flex-col items-end">
                      <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{new Date(log.createdAt).toLocaleDateString()}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(log.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </td>
                </motion.tr>
                  );
                })()
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-24 text-center">
              <div className="inline-flex p-5 rounded-full bg-slate-50 text-slate-300 mb-6">
                <Activity size={48} />
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Zero Matches</h3>
              <p className="text-sm font-bold text-slate-500">No activity signature matches your trace parameters.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
