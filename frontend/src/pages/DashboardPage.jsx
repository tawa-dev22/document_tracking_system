import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileText, Clock, CheckCircle2, XCircle, ArrowRight, LayoutDashboard } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function DashboardPage() {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    inProgress: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/documents/stats'),
      api.get('/documents', { params: { page: 1, limit: 8 } })
    ])
      .then(([statsRes, docsRes]) => {
        setStats(
          statsRes.data?.data || {
            total: 0,
            inProgress: 0,
            approved: 0,
            rejected: 0
          }
        );
        setDocuments(docsRes.data?.data || []);
      })
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 600));
  }, []);

  const Skeleton = () => (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-10 w-48 bg-slate-100 rounded-xl" />
          <div className="h-4 w-96 bg-slate-100 rounded-lg" />
        </div>
        <div className="h-12 w-40 bg-slate-100 rounded-2xl" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-slate-100 rounded-3xl" />)}
      </div>
      <div className="h-96 bg-slate-100 rounded-3xl" />
    </div>
  );

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="mt-2 text-slate-500">Track document submissions, review status changes, and monitor collaboration in real time.</p>
        </div>
        <Link to="/submit" className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">Submit a document</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Submitted Documents', stats.total, FileText, 'text-blue-600', 'bg-blue-50'],
          ['In Progress', stats.inProgress, Clock, 'text-amber-600', 'bg-amber-50'],
          ['Approved', stats.approved, CheckCircle2, 'text-emerald-600', 'bg-emerald-50'],
          ['Rejected', stats.rejected, XCircle, 'text-rose-600', 'bg-rose-50']
        ].map(([label, value, Icon, color, bg], i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
            key={label} 
            className="card p-6"
          >
            <div className={`inline-flex p-3 rounded-2xl ${bg} ${color} mb-4`}>
              <Icon size={24} />
            </div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{value}</p>
          </motion.div>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-slate-50 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-900 p-2 text-white">
              <LayoutDashboard size={18} />
            </div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Recent Activity</h2>
          </div>
          <Link to="/documents" className="group flex items-center gap-1 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">
            View All <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-slate-50/50 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">
                <th className="px-6 py-4">Reference</th>
                <th className="px-6 py-4">Document Title</th>
                <th className="px-6 py-4">Current Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {documents.slice(0, 8).map((doc, i) => (
                <motion.tr 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                  key={doc._id} 
                  className="group transition-colors hover:bg-slate-50/50"
                >
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-xs font-bold text-slate-500">
                    {doc.referenceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-slate-900 truncate max-w-[300px]">{doc.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Updated {new Date(doc.updatedAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={doc.currentStatus} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link 
                      to={`/documents/${doc._id}`} 
                      className="inline-flex items-center gap-1 font-black uppercase tracking-widest text-slate-900 hover:underline underline-offset-4"
                    >
                      Audit
                    </Link>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {documents.length === 0 && (
            <div className="px-6 py-20 text-center">
              <div className="inline-flex p-4 rounded-full bg-slate-50 text-slate-300 mb-4">
                <FileText size={40} />
              </div>
              <p className="text-sm font-bold text-slate-500">No documents found in the system.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
