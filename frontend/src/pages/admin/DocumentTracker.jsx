import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  XSquare, 
  RefreshCw, 
  History,
  Eye,
  Shield,
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const styles = {
    SUBMITTED: 'bg-slate-50 text-slate-600 border-slate-100',
    IN_PROGRESS: 'bg-amber-50 text-amber-600 border-amber-100',
    APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    REJECTED: 'bg-rose-50 text-rose-600 border-rose-100',
    RESUBMITTED: 'bg-blue-50 text-blue-600 border-blue-100'
  };
  return (
    <div className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${styles[status]}`}>
      {status.replace('_', ' ')}
    </div>
  );
};

export default function DocumentTracker() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedAuditDoc, setSelectedAuditDoc] = useState(null);
  const [auditReason, setAuditReason] = useState('');
  const [auditComments, setAuditComments] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/documents', {
        params: { search, status: statusFilter, page }
      });
      setDocuments(res.data.documents);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      toast.error('Failed to load global document register');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [search, statusFilter, page]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Global Document Tracker</h1>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Real-time organization-wide movement monitoring</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
          <input 
            type="text" 
            placeholder="Search by title or reference..." 
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select 
             className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all shadow-sm"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RESUBMITTED">Resubmitted</option>
        </select>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-900 border-t-transparent"></div>
          </div>
        ) : (
          documents.map((doc) => (
            <motion.div 
              key={doc._id}
              whileHover={{ x: 4 }}
              className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all hover:border-indigo-200"
            >
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-slate-800 truncate">{doc.title}</h3>
                    <StatusBadge status={doc.currentStatus} />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <p className="text-[10px] font-black text-indigo-500 uppercase shrink-0">{doc.referenceNumber}</p>
                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Shield size={10}/> {doc.sender?.fullName || 'System'}</p>
                    <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10}/> {new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate('/documents/' + doc._id)}
                className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-slate-100 shrink-0"
              >
                <Eye size={12} /> Audit View <ChevronRight size={12} />
              </button>
            </motion.div>
          ))
        )}
      </div>

      {documents.length === 0 && !loading && (
        <div className="text-center py-20 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <p className="text-sm font-bold text-slate-400">No documents found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}
