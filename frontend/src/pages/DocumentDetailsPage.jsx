import { useEffect, useMemo, useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Download, History, Upload, MessageSquare, Shield, ChevronRight, Eye, Timer, CalendarClock, Target } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import SubmitButton from '../components/ui/SubmitButton';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

const formatDuration = (ms) => {
  if (!ms || ms <= 0) return '0m';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  const d = days > 0 ? `${days}d ` : '';
  const h = (hours % 24) > 0 ? `${hours % 24}h ` : '';
  const m = (minutes % 60) > 0 ? `${minutes % 60}m` : '1m';
  return `${d}${h}${m}`.trim();
};

const transitions = {
  SUBMITTED: ['IN_PROGRESS', 'APPROVED', 'REJECTED'],
  IN_PROGRESS: ['APPROVED', 'REJECTED', 'RESUBMITTED'],
  REJECTED: ['RESUBMITTED'],
  RESUBMITTED: ['IN_PROGRESS', 'APPROVED', 'REJECTED'],
  APPROVED: []
};

export default function DocumentDetailsPage() {
  const { id } = useParams();
  const { socket, user } = useAuth();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [comment, setComment] = useState('');
  const [assignment, setAssignment] = useState({ assignedUsers: '', recipients: '' });
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [showTrace, setShowTrace] = useState(false);
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitFileLabel, setResubmitFileLabel] = useState('');
  const [submitting, setSubmitting] = useState({ comment: false, status: false, access: false, resubmit: false });
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const loadDocument = async () => {
    try {
      const res = await api.get(`/documents/${id}`);
      setData(res.data.data);
      setStatus(res.data.data.document.currentStatus);
      setError(null);
    } catch (e) {
      console.error('Document load error:', e);
      setError(e.response?.data?.message || e.message || 'Failed to load document');
    }
  };

  useEffect(() => {
    setLoading(true);
    loadDocument().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('document:join', id);
    const refresh = () => loadDocument();
    socket.on('document:statusChanged', refresh);
    socket.on('document:commentAdded', refresh);
    return () => {
      socket.off('document:statusChanged', refresh);
      socket.off('document:commentAdded', refresh);
    };
  }, [socket, id]);

  const allowedStatuses = useMemo(() => transitions[data?.document?.currentStatus] || [], [data?.document?.currentStatus]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 rounded-3xl bg-slate-100" />
        <div className="flex gap-4">
          <div className="h-12 w-40 rounded-2xl bg-slate-100" />
          <div className="h-12 w-40 rounded-2xl bg-slate-100" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="h-64 rounded-3xl bg-slate-100" />
            <div className="h-48 rounded-3xl bg-slate-100" />
          </div>
          <div className="space-y-6">
            <div className="h-32 rounded-3xl bg-slate-100" />
            <div className="h-48 rounded-3xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-12 text-center h-[70vh] flex flex-col items-center justify-center space-y-6">
        <div className="rounded-full bg-rose-50 p-6 text-rose-500 shadow-sm border border-rose-100">
          <Shield size={48} className="animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Security / Access Problem</h2>
          <p className="text-slate-500 font-medium max-w-sm mx-auto">{error}</p>
        </div>
        <RouterLink to="/dashboard" className="btn bg-slate-900 text-white px-8 py-3 rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-all">
          Return to Dashboard
        </RouterLink>
      </div>
    );
  }

  if (!data) return <div className="p-12 text-center font-bold text-slate-500">Document not found.</div>;

  const getSafeId = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
    return String(obj);
  };

  const currentUserId = getSafeId(user);
  const { isSender, isCurrentHandler, canManageDocument: canManage, canResubmit } = data.permissions;
  const isCcObserver = data.document.recipients?.some(u => getSafeId(u) === currentUserId);
  const canViewMetrics = isSender || isCcObserver || canManage;
  const previewVersionId = data.document.currentVersionId?._id || data.versions?.[0]?._id;

  const submitComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(s => ({ ...s, comment: true }));
    try {
      await api.post(`/documents/${id}/comments`, { message: comment.trim(), visibility: 'ALL_INVOLVED' });
      setComment('');
      toast.success('Comment posted successfully');
      await loadDocument();
    } catch (e) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(s => ({ ...s, comment: false }));
    }
  };

  const submitStatus = async () => {
    setSubmitting(s => ({ ...s, status: true }));
    try {
      await api.patch(`/documents/${id}/status`, { status, comment: statusComment });
      setStatusComment('');
      toast.success(`Document marked as ${status.replaceAll('_', ' ')}`);
      await loadDocument();
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setSubmitting(s => ({ ...s, status: false }));
    }
  };

  const updateAccess = async () => {
    setSubmitting(s => ({ ...s, access: true }));
    try {
      const payload = {
        assignedUsers: assignment.assignedUsers.split(',').map((item) => item.trim()).filter(Boolean),
        recipients: assignment.recipients.split(',').map((item) => item.trim()).filter(Boolean)
      };
      await api.post(`/documents/${id}/assign`, payload);
      setAssignment({ assignedUsers: '', recipients: '' });
      toast.success('Access permissions updated');
      await loadDocument();
    } catch (e) {
      toast.error('Failed to update permissions');
    } finally {
      setSubmitting(s => ({ ...s, access: false }));
    }
  };

  const resubmit = async (event) => {
    event.preventDefault();
    const file = event.target.file.files?.[0];
    const notes = event.target.notes.value;
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }
    setSubmitting(s => ({ ...s, resubmit: true }));
    const formData = new FormData();
    formData.append('file', file);
    formData.append('notes', notes);
    try {
      await api.post(`/documents/${id}/resubmit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('New document version uploaded');
      setShowResubmit(false);
      event.target.reset();
      setResubmitFileLabel('');
      await loadDocument();
    } catch (e) {
      toast.error('Version upload failed');
    } finally {
      setSubmitting(s => ({ ...s, resubmit: false }));
    }
  };

  const handleResubmitFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setResubmitFileLabel('');
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setResubmitFileLabel(`${file.name} (${sizeMb} MB)`);
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{data.document.title}</h1>
            <div className="mt-4 flex flex-col gap-1.5 text-sm text-slate-600 border-l-2 border-slate-200 pl-4 bg-slate-50/50 py-2 rounded-r-xl">
              <p className="flex items-center gap-2"><span className="w-28 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Originated By</span> <span className="font-semibold text-slate-800">{data.document.sender?.fullName || data.document.sender?.email}</span></p>
              <p className="flex items-start gap-2">
                <span className="w-28 mt-0.5 font-bold text-blue-400 uppercase tracking-widest text-[10px]">Management</span> 
                {data.document.currentHandler ? (
                  <span className="flex-1 font-black text-blue-600">
                    {data.document.currentHandler.fullName} <span className="text-[10px] font-bold text-slate-400 uppercase ml-2 px-1.5 py-0.5 bg-slate-100 rounded">Primary Handler</span>
                  </span>
                ) : (
                  <span className="flex-1 font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[10px] uppercase">Review Shared Among Registry Recipients</span>
                )}
              </p>
              {data.document.recipients?.length > 0 && (
                <p className="flex items-start gap-2">
                  <span className="w-28 mt-0.5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Recipient Registry</span> 
                  <span className="flex-1 text-slate-700 font-bold text-xs">{data.document.recipients.map(u => u.fullName).join(', ')}</span>
                </p>
              )}
              {(data.document.assignedUsers?.length > 0 || data.document.externalRecipients?.length > 0) && (
                <p className="flex items-start gap-2">
                   <span className="w-28 mt-0.5 font-bold text-slate-400 uppercase tracking-widest text-[10px]">Carbon Copy</span> 
                   <span className="flex-1 text-slate-500 italic text-xs">{[...(data.document.assignedUsers?.map(u => u.fullName || u.email) || []), ...(data.document.externalRecipients || [])].join(', ')}</span>
                </p>
              )}
            </div>
            <p className="mt-4 max-w-3xl text-sm font-medium text-slate-600 leading-relaxed">{data.document.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={data.document.currentStatus} />
            <p className="text-xs font-bold text-slate-400 bg-white px-2 py-1 rounded-md border border-slate-100 shadow-sm">{data.document.referenceNumber}</p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-600 border-t border-slate-50 pt-4">
          <span className="rounded-full bg-slate-50 px-3 py-1 font-medium border border-slate-100 shadow-sm transition-all hover:bg-slate-100 whitespace-nowrap">Priority: {data.document.priority}</span>
          {canManage && <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700 font-bold uppercase tracking-widest text-[10px] shadow-sm border border-blue-100 whitespace-nowrap">Active Handler Privileges</span>}
          {isSender && <span className="rounded-full bg-slate-800 px-3 py-1 text-white font-bold uppercase tracking-widest text-[10px] shadow-sm whitespace-nowrap">Document Owner (Sender)</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowTrace(!showTrace)} 
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-widest transition-all ${showTrace ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
        >
          <History size={16} />
          {showTrace ? 'Hide Trace' : 'View Document Trace'}
        </motion.button>
        {canResubmit && (
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowResubmit(!showResubmit)} 
            className={`flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-widest transition-all ${showResubmit ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'}`}
          >
            <Upload size={16} />
            {showResubmit ? 'Hide Upload' : 'Upload New Version'}
          </motion.button>
        )}
        {previewVersionId && (
          <RouterLink
            to={`/documents/${id}/preview/${previewVersionId}`}
            className="flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-widest transition-all bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
          >
            <Eye size={16} />
            Preview Document
          </RouterLink>
        )}
      </div>

      <AnimatePresence>
        {showResubmit && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
                  <Upload size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Upload new document version</h2>
                  <p className="mt-1 text-sm text-slate-500">Select a file and provide notes for the changes in this version.</p>
                </div>
              </div>
              <form onSubmit={resubmit} className="mt-8 space-y-5">
                <div className="relative rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center transition-colors hover:border-slate-300">
                  <input name="file" type="file" onChange={handleResubmitFileChange} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                  <Upload size={32} className="mx-auto text-slate-400" />
                  <p className="mt-4 text-sm font-bold text-slate-600">
                    {resubmitFileLabel ? 'Selected document version' : 'Click to select or drag and drop document'}
                  </p>
                  {resubmitFileLabel && (
                    <p className="mt-2 text-sm font-semibold text-emerald-700 break-all">{resubmitFileLabel}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400 uppercase tracking-widest font-bold">PDF, DOCX, XLSX are supported</p>
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Version changes & notes</label>
                  <textarea name="notes" rows="3" placeholder="Explain what changed in this version..." />
                </div>
                <div className="flex justify-end border-t border-slate-100 pt-5">
                  <SubmitButton isLoading={submitting.resubmit} className="w-auto">Upload Version</SubmitButton>
                </div>
              </form>
            </div>
          </motion.div>
        )}

        {showTrace && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card p-6">
              <div className="flex items-start gap-4 mb-8">
                <div className="rounded-xl bg-slate-100 p-3 text-slate-500">
                  <History size={24} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Complete Audit Trail</h2>
                  <p className="mt-1 text-sm text-slate-500">Historical transparency of all personnel interactions and state transitions.</p>
                </div>
              </div>
              
              <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100 pb-4">
                {data.audit.map((log, i) => (
                  <motion.div 
                    key={log._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="relative pl-10"
                  >
                    <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full border-4 border-white bg-slate-900 text-white flex items-center justify-center z-10 shadow-sm">
                      <div className="h-1.5 w-1.5 rounded-full bg-white" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                       <p className="text-xs font-black text-slate-900 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 inline-block w-fit">
                        {log.action.replaceAll('_', ' ')}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(log.createdAt).toLocaleString()}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-700 font-medium">
                      <span className="font-black text-slate-900">{log.actor?.fullName}</span> 
                      {log.action === 'DOCUMENT_CREATED' && ' initiated this record in the registry.'}
                      {log.action === 'STATUS_CHANGED' && ` transitioned this document from ${log.previousValue?.status?.replaceAll('_', ' ')} to ${log.newValue?.status?.replaceAll('_', ' ')}.`}
                      {log.action === 'COMMENT_ADDED' && ' contributed to the internal discussion.'}
                      {log.action === 'DOCUMENT_SHARED_ACCESS' && ` granted viewing privileges to ${log.newValue?.targetEmail}.`}
                      {log.action === 'DOCUMENT_ACCESS_UPDATED' && ' synchronized administrative access permissions.'}
                      {log.action === 'DOCUMENT_FORWARDED' && (
                        <>
                          {' forwarded the document to '}
                          <span className="font-bold text-blue-600">
                            {log.newValue?.recipients?.map(r => r.fullName || r.email).join(', ')}
                          </span>
                        </>
                      )}
                      {log.action === 'DOCUMENT_RESUBMITTED' && ` uploaded a new dossier version (V${log.newValue?.versionNumber}).`}
                      {log.action === 'DOCUMENT_DOWNLOADED' && ' accessed the source archive for local review.'}
                    </p>
                  </motion.div>
                ))}
                {data.audit.length === 0 && (
                  <p className="text-sm text-slate-500 italic">No tracing data available for this document.</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {feedback && <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{feedback}</div>}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <MessageSquare size={20} className="text-slate-400" />
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Conversations</h2>
            </div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {data.comments.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item._id} 
                  className="group rounded-2xl border border-slate-100 bg-slate-50/30 p-4 transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-slate-900 text-[8px] font-bold text-white flex items-center justify-center">
                        {item.author?.fullName?.[0]}
                      </div>
                      <p className="text-sm font-black text-slate-900">{item.author?.fullName}</p>
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white px-2 py-1 rounded-lg">{item.author?.role}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-relaxed text-slate-600">{item.message}</p>
                  <p className="mt-3 text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(item.createdAt).toLocaleString()}</p>
                </motion.div>
              ))}
              {data.comments.length === 0 && <p className="text-sm text-slate-500 italic p-4 text-center border-2 border-dashed border-slate-100 rounded-2xl">No internal comments yet.</p>}
            </div>
            {canManage && (
              <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
                <textarea 
                  rows="3" 
                  value={comment} 
                  onChange={(e) => setComment(e.target.value)} 
                  placeholder="Share your thoughts with the team..." 
                  className="bg-slate-50 border-transparent focus:bg-white"
                />
                <div className="flex justify-end">
                  <SubmitButton 
                    onClick={submitComment} 
                    isLoading={submitting.comment} 
                    className="w-auto px-10"
                  >
                    Post Reply
                  </SubmitButton>
                </div>
              </div>
            )}
          </div>

          {data.reviews && data.reviews.length > 0 && (
            <div className="card p-6 border-l-4 border-l-blue-500 bg-blue-50/5">
              <div className="flex items-center gap-3 mb-6">
                <Shield size={20} className="text-blue-500" />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Manager Review History</h2>
              </div>
              <div className="space-y-6">
                {data.reviews.map((review, i) => (
                  <div key={review._id} className="relative pl-6 border-l border-slate-200">
                    <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-500" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900">{review.reviewerId?.fullName}</span>
                        <StatusBadge status={review.status} />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                        {new Date(review.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="mt-2 text-sm font-medium text-slate-600 bg-white/50 p-3 rounded-xl border border-slate-100 italic">
                        "{review.comment}"
                      </p>
                    )}
                    <p className="mt-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                      {review.reviewerId?.department} · {review.reviewerId?.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}


          <div className="card p-6">
            <div className="flex items-center gap-3 mb-6">
              <Download size={20} className="text-slate-400" />
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Version Registry</h2>
            </div>
            <div className="space-y-3">
              {data.versions.map((version, i) => (
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={version._id} 
                  className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5 sm:flex-row sm:items-center sm:justify-between transition-all hover:bg-white hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm font-black text-slate-900">
                      V{version.versionNumber}
                    </div>
                    <div>
                      <p className="font-black text-slate-900 text-sm">{version.originalName}</p>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Uploaded by {version.uploadedBy?.fullName} · {new Date(version.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={async () => {
                      try {
                        const res = await api.get(`/documents/${id}/download/${version._id}`, { responseType: 'blob' });
                        const url = window.URL.createObjectURL(new Blob([res.data]));
                        const link = document.createElement('a');
                        link.href = url;
                        link.setAttribute('download', version.originalName);
                        document.body.appendChild(link);
                        link.click();
                        link.parentNode.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success('Download initiated');
                      } catch (e) {
                        toast.error('Download failed. Intelligence access denied.');
                      }
                    }}
                    className="flex items-center justify-center gap-2 rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all hover:bg-slate-900 hover:text-white hover:border-slate-900"
                  >
                    <Download size={14} />
                    Download File
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </div>


        </div>

        <div className="space-y-6">
          {canManage && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <ChevronRight size={20} className="text-slate-400" />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Status Control</h2>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target State</label>
                  <select className="bg-slate-50 border-transparent focus:bg-white" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value={data.document.currentStatus}>{data.document.currentStatus.replaceAll('_', ' ')} (current)</option>
                    {allowedStatuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Contextual Reason (Optional)</label>
                  <textarea rows="3" value={statusComment} onChange={(e) => setStatusComment(e.target.value)} placeholder="Why is this status being updated?" className="bg-slate-50 border-transparent focus:bg-white" />
                </div>
                <SubmitButton onClick={submitStatus} isLoading={submitting.status}>Apply State Change</SubmitButton>
              </div>
            </div>
          )}

          {canManage && (
            <div className="card p-6">
              <div className="flex items-center gap-3 mb-6">
                <Shield size={20} className="text-slate-400" />
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Forward Document</h2>
              </div>
              <p className="mb-6 text-xs font-medium leading-relaxed text-slate-500">Route this archival record to additional personnel. They will receive full trace history and management privileges.</p>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Forward To (Emails)</label>
                  <input placeholder="officer1@gov.zw, officer2@gov.zw..." value={assignment.assignedUsers} onChange={(e) => setAssignment((prev) => ({ ...prev, assignedUsers: e.target.value }))} className="bg-slate-50 border-transparent focus:bg-white font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">CC Observers (Emails)</label>
                  <input placeholder="observer@gov.zw..." value={assignment.recipients} onChange={(e) => setAssignment((prev) => ({ ...prev, recipients: e.target.value }))} className="bg-slate-50 border-transparent focus:bg-white font-bold" />
                </div>
                <SubmitButton onClick={updateAccess} isLoading={submitting.access}>Authorize Forwarding</SubmitButton>
              </div>
            </div>
          )}

          {canViewMetrics && (
            <>
              <div className="card p-6 border-l-4 border-l-amber-500 bg-amber-50/5">
                <div className="flex items-center gap-3 mb-6">
                  <Timer size={20} className="text-amber-500" />
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Processing Metrics</h2>
                </div>
                <div className="space-y-5">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Handling Time</p>
                      {data.document.finalizedAt ? (
                        <span className="text-[10px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full uppercase">Finalized</span>
                      ) : (
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse uppercase">Active</span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {data.document.finalizedAt 
                          ? formatDuration(data.document.totalProcessingTime) 
                          : formatDuration(now - new Date(data.document.submittedAt || data.document.createdAt).getTime())}
                      </p>
                      <p className="text-xs font-bold text-slate-400 whitespace-nowrap">submission → {data.document.finalizedAt ? 'completion' : 'now'}</p>
                    </div>
                  </div>

                  {data.document.inProgressStartedAt && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Active Processing Window</p>
                      <div className="flex items-baseline gap-2">
                        <p className="text-lg font-black text-slate-700 tracking-tight">
                          {data.document.finalizedAt 
                            ? formatDuration(data.document.inProgressDuration) 
                            : formatDuration(now - new Date(data.document.inProgressStartedAt).getTime())}
                        </p>
                        <p className="text-xs font-bold text-slate-400 italic">In-Progress → {data.document.finalizedAt ? 'completion' : 'now'}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card p-6 bg-slate-900 shadow-xl shadow-slate-900/10">
                <div className="flex items-center gap-3 mb-4">
                  <Target size={20} className="text-amber-400" />
                  <h2 className="text-xs font-black text-white uppercase tracking-widest">SLA Compliance</h2>
                </div>
                <p className="text-xs font-medium text-slate-400 leading-relaxed italic">
                  {data.document.finalizedAt 
                    ? "Workflow concluded within operational standards."
                    : "Continuous tracking enabled. Dossier is currently undergoing active managerial assessment."}
                </p>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
