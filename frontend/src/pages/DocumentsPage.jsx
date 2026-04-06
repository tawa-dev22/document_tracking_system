import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Search, Filter, FileText, ChevronRight, Hash, Folder, FolderOpen } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import api from '../services/api';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 30, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState({});

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/documents', { params: { page, limit: 30, search: search || undefined } })
      .then((res) => {
        setDocuments(res.data.data || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      })
      .catch(() => {})
      .finally(() => setTimeout(() => setLoading(false), 400));
  }, [page, search]);

  const groupedByDepartment = useMemo(() => {
    const groups = {};
    documents.forEach((doc) => {
      const dept = doc.department || 'Unassigned';
      if (!groups[dept]) groups[dept] = [];
      groups[dept].push(doc);
    });
    return groups;
  }, [documents]);

  const toggleFolder = (dept) => {
    setExpandedFolders(prev => ({
      ...prev,
      [dept]: prev[dept] === undefined ? false : !prev[dept]
    }));
  };

  const isNew = (date) => {
    const now = new Date();
    const docDate = new Date(date);
    return (now - docDate) < 24 * 60 * 60 * 1000;
  };

  const Skeleton = () => (
    <div className="space-y-8 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-4">
          <div className="h-8 w-48 bg-slate-100 rounded-lg" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(j => (
              <div key={j} className="h-40 bg-slate-50 rounded-3xl" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) return <Skeleton />;

  return (
    <div className="space-y-10">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Registry</h1>
          <p className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-widest">Document Repository & Archive</p>
        </div>
        <Link to="/submit" className="rounded-2xl bg-slate-900 px-8 py-4 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95 flex items-center gap-2">
          Submit New Document
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="relative flex-1 lg:max-w-md group">
          <input 
            className="pl-12 transition-all group-hover:border-slate-300"
            placeholder="Search reference, title, or sender..." 
            value={searchInput} 
            onChange={(e) => setSearchInput(e.target.value)} 
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-slate-600 transition-colors">
            <Search size={20} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs font-black uppercase tracking-widest text-slate-400">
          <span>
            Tracking <span className="text-slate-900">{pagination.total}</span> Active Files
          </span>
          {pagination.totalPages > 1 && (
            <span className="text-slate-500">
              Page {pagination.page} / {pagination.totalPages}
            </span>
          )}
        </div>
      </motion.div>

      <div className="space-y-6">
        {Object.entries(groupedByDepartment).sort().map(([dept, docs], groupIndex) => {
          const isExpanded = expandedFolders[dept] !== false; // Default expanded
          const hasNew = docs.some(d => isNew(d.createdAt));

          return (
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
              key={dept} 
              className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm transition-all hover:shadow-md"
            >
              <div 
                onClick={() => toggleFolder(dept)}
                className="flex items-center justify-between p-6 cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${isExpanded ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-200 text-slate-500'}`}>
                    {isExpanded ? <FolderOpen size={24} /> : <Folder size={24} />}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                      {dept}
                      {hasNew && (
                        <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white shadow-sm animate-pulse">
                          New
                        </span>
                      )}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">
                      {docs.length} Document{docs.length !== 1 ? 's' : ''} Stored
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ChevronRight size={20} className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
              </div>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="p-6 pt-0 border-t border-slate-100/50">
                      <div className="grid gap-4 mt-6 md:grid-cols-2 xl:grid-cols-3">
                        <AnimatePresence>
                          {docs.map((doc, i) => (
                            <motion.div
                              key={doc._id}
                              layout
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                              className="group relative flex flex-col justify-between rounded-2xl bg-white p-5 border border-slate-100 transition-all hover:border-slate-300 hover:shadow-md"
                            >
                              {isNew(doc.createdAt) && (
                                <div className="absolute -top-2 -right-2 z-10 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-500/20 animate-pulse">
                                  New
                                </div>
                              )}
                              <div className="space-y-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                                    <FileText size={20} />
                                  </div>
                                  <StatusBadge status={doc.currentStatus} />
                                </div>
                                <div>
                                  <h3 className="text-md font-black text-slate-900 leading-tight tracking-tight group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[2.5rem] uppercase">
                                    {doc.title}
                                  </h3>
                                  <div className="mt-3 flex items-center gap-2 text-[10px] font-mono font-bold text-slate-400 uppercase">
                                    <Hash size={10} /> {doc.referenceNumber}
                                  </div>
                                  <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    By: {doc.sender?.fullName?.split(' ')[0] || 'Personnel'}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-5 flex items-center justify-between border-t border-slate-50 pt-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">
                                  {new Date(doc.updatedAt).toLocaleDateString()}
                                </p>
                                <Link 
                                  to={`/documents/${doc._id}`} 
                                  className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-900 hover:text-blue-600 transition-colors"
                                >
                                  View Details <ChevronRight size={12} />
                                </Link>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.section>
          );
        })}

        {documents.length === 0 && (
          <div className="py-20 text-center">
            <div className="inline-flex p-6 rounded-full bg-slate-50 text-slate-300 mb-4">
              <Search size={48} />
            </div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No records located</h3>
            <p className="text-sm font-bold text-slate-500">Your search criteria returned zero document matches.</p>
          </div>
        )}

        {pagination.totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

