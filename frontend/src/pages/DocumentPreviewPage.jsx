import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { renderAsync } from 'docx-preview';
import toast from 'react-hot-toast';
import { Upload, Download, StickyNote as StickyNoteIcon, MessageSquare } from 'lucide-react';
import api from '../services/api';
import SubmitButton from '../components/ui/SubmitButton';
import { useAuth } from '../contexts/AuthContext';

const STICKY_COLORS = ['yellow', 'pink', 'orange', 'red', 'green', 'blue', 'purple'];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export default function DocumentPreviewPage() {
  const { id, versionId } = useParams();
  const { user, socket } = useAuth();
  const [data, setData] = useState(null);
  const [activeVersionId, setActiveVersionId] = useState(versionId);
  const [loading, setLoading] = useState(true);
  const [showResubmit, setShowResubmit] = useState(false);
  const [resubmitFile, setResubmitFile] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [annotationsLoading, setAnnotationsLoading] = useState(false);
  const [previewType, setPreviewType] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewBlob, setPreviewBlob] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [addingNote, setAddingNote] = useState(false);
  const [selectionContext, setSelectionContext] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const docxRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/documents/${id}`);
        if (!isMounted) return;
        setData(res.data.data);
        const selected = versionId || res.data.data.document.currentVersionId?._id || res.data.data.versions?.[0]?._id;
        setActiveVersionId(selected);
      } catch {
        toast.error('Failed to load document metadata');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    load();
    return () => {
      isMounted = false;
    };
  }, [id, versionId]);

  const selectedVersion = useMemo(
    () => data?.versions?.find((v) => v._id === activeVersionId),
    [data?.versions, activeVersionId]
  );

  useEffect(() => {
    if (!activeVersionId) return;
    let cancelled = false;
    async function loadAnnotations() {
      setAnnotationsLoading(true);
      try {
        const res = await api.get(`/documents/${id}/annotations`, { params: { versionId: activeVersionId } });
        if (!cancelled) setAnnotations(res.data.data || []);
      } catch {
        if (!cancelled) toast.error('Failed to load annotations');
      } finally {
        if (!cancelled) setAnnotationsLoading(false);
      }
    }
    loadAnnotations();
    return () => {
      cancelled = true;
    };
  }, [id, activeVersionId]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('document:join', id);

    const onAdded = (annotation) => {
      if (!annotation || String(annotation.versionId) !== String(activeVersionId)) return;
      setAnnotations((prev) => {
        if (prev.some((item) => item._id === annotation._id)) return prev;
        return [...prev, annotation];
      });
    };

    const onUpdated = (annotation) => {
      if (!annotation || String(annotation.versionId) !== String(activeVersionId)) return;
      setAnnotations((prev) => prev.map(a => a._id === annotation._id ? annotation : a));
    };

    const onDeleted = (payload) => {
      if (!payload || String(payload.versionId) !== String(activeVersionId)) return;
      setAnnotations((prev) => prev.filter((item) => item._id !== payload.annotationId));
    };

    socket.on('document:annotationAdded', onAdded);
    socket.on('document:annotationUpdated', onUpdated);
    socket.on('document:annotationDeleted', onDeleted);
    return () => {
      socket.off('document:annotationAdded', onAdded);
      socket.off('document:annotationUpdated', onUpdated);
      socket.off('document:annotationDeleted', onDeleted);
    };
  }, [socket, id, activeVersionId]);

  useEffect(() => {
    if (!activeVersionId) return;
    let cleanupUrl = '';
    async function loadPreview() {
      setPreviewLoading(true);
      try {
        const res = await api.get(`/documents/${id}/preview/${activeVersionId}`, { responseType: 'blob' });
        const blob = res.data;
        setPreviewBlob(blob);

        const mime = selectedVersion?.mimeType || blob.type || '';
        const name = (selectedVersion?.originalName || '').toLowerCase();
        const nextPreviewType = mime.includes('pdf') || name.endsWith('.pdf') ? 'pdf' : (name.endsWith('.docx') ? 'docx' : 'unsupported');
        setPreviewType(nextPreviewType);

        if (nextPreviewType === 'pdf') {
          const blobUrl = window.URL.createObjectURL(blob);
          cleanupUrl = blobUrl;
          setPreviewUrl(blobUrl);
        } else if (nextPreviewType === 'docx') {
          setPreviewUrl('');
        } else {
          setPreviewUrl('');
        }
      } catch {
        toast.error('Failed to load preview');
      } finally {
        setPreviewLoading(false);
      }
    }
    loadPreview();
    return () => {
      if (cleanupUrl) window.URL.revokeObjectURL(cleanupUrl);
    };
  }, [id, activeVersionId, selectedVersion?.mimeType, selectedVersion?.originalName]);

  useEffect(() => {
    if (!draggingId || !layerRef.current) return;

    const onMove = (e) => {
      const layer = layerRef.current;
      const rect = layer.getBoundingClientRect();
      const x = clamp(((e.clientX - rect.left - dragOffset.x + layer.scrollLeft) / layer.scrollWidth) * 100, 0, 96);
      const y = clamp(((e.clientY - rect.top - dragOffset.y + layer.scrollTop) / layer.scrollHeight) * 100, 0, 96);
      setAnnotations((prev) => prev.map(a => a._id === draggingId ? { ...a, x, y } : a));
    };

    const onUp = () => {
      const note = annotations.find(a => a._id === draggingId);
      if (note) {
        handleUpdateStickyNote(draggingId, { x: note.x, y: note.y });
      }
      setDraggingId(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [draggingId, dragOffset, annotations]);

  useEffect(() => {
    if (previewType !== 'docx' || !previewBlob || !docxRef.current) return;
    let cancelled = false;

    async function renderDocx() {
      try {
        const target = docxRef.current;
        if (!target) return;
        target.innerHTML = '';
        const arrayBuffer = await previewBlob.arrayBuffer();
        if (cancelled) return;
        await renderAsync(arrayBuffer, target, undefined, {
          className: 'docx-preview',
          ignoreWidth: true,
          ignoreHeight: false
        });
      } catch {
        toast.error('Failed to render DOCX preview');
      }
    }

    renderDocx();
    return () => {
      cancelled = true;
    };
  }, [previewType, previewBlob]);

  const handleAddStickyNote = async () => {
    if (addingNote || !activeVersionId) return;
    setAddingNote(true);
    try {
      const res = await api.post(`/documents/${id}/annotations`, {
        versionId: activeVersionId,
        tool: 'sticky',
        text: '',
        color: 'yellow',
        x: 75,
        y: 5
      });
      const saved = res.data.data;
      setAnnotations((prev) => {
        if (prev.some((item) => item._id === saved._id)) return prev;
        return [...prev, saved];
      });
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to add sticky note';
      toast.error(msg);
    } finally {
      setAddingNote(false);
    }
  };

  const handleLocalNoteChange = (annotationId, text) => {
    setAnnotations(prev => prev.map(a => a._id === annotationId ? { ...a, text } : a));
  };

  const handleUpdateStickyNote = async (annotationId, updates) => {
    try {
      await api.patch(`/documents/${id}/annotations/${annotationId}`, updates);
    } catch {
      toast.error('Failed to update note sync');
    }
  };

  const handleResubmit = async (e) => {
    e.preventDefault();
    if (!resubmitFile) return toast.error('Please select a file');
    setSubmitting(true);
    const formData = new FormData();
    formData.append('document', resubmitFile);
    formData.append('notes', 'Revised version based on preview assessments.');

    try {
      const res = await api.post(`/documents/${id}/resubmit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Document resubmitted successfully');
      setShowResubmit(false);
      setResubmitFile(null);
      const docRes = await api.get(`/documents/${id}`);
      setData(docRes.data.data);
      setActiveVersionId(res.data.data._id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resubmit');
    } finally {
      setSubmitting(false);
    }
  };

  const removeAnnotation = async (annotationId) => {
    try {
      await api.delete(`/documents/${id}/annotations/${annotationId}`);
      setAnnotations((prev) => prev.filter((a) => a._id !== annotationId));
    } catch (error) {
      const msg = error?.response?.data?.message || 'Failed to remove annotation';
      toast.error(msg);
    }
  };

  const handleSelection = () => {
    if (previewType !== 'docx') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.toString().trim() === '') {
      setSelectionContext(null);
      return;
    }
    
    const layer = layerRef.current;
    if (!layer || !activeVersionId) return;
    const layerRect = layer.getBoundingClientRect();
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    if (rect.width === 0 || rect.height === 0) return;

    const selX = clamp(((rect.left - layerRect.left + layer.scrollLeft) / layer.scrollWidth) * 100, 0, 100);
    const selY = clamp(((rect.top - layerRect.top + layer.scrollTop) / layer.scrollHeight) * 100, 0, 100);
    const selW = (rect.width / layer.scrollWidth) * 100;
    const selH = (rect.height / layer.scrollHeight) * 100;

    const overlapping = annotations.filter(a => 
      (a.tool === 'highlight' || a.tool === 'strikethrough') &&
      a.x >= selX - 0.5 && a.x <= selX + selW + 0.5 &&
      a.y >= selY - 0.5 && a.y <= selY + selH + 0.5
    );

    setSelectionContext({
      text: selection.toString(),
      x: selX,
      y: selY,
      width: selW,
      height: selH,
      hasHighlight: overlapping.some(a => a.tool === 'highlight'),
      hasStrike: overlapping.some(a => a.tool === 'strikethrough'),
      menuX: rect.left - layerRect.left + layer.scrollLeft + (rect.width / 2),
      menuY: rect.top - layerRect.top + layer.scrollTop - 45
    });
  };

  const addSelectionAnnotation = async (tool) => {
    if (!selectionContext || !activeVersionId || addingNote) return;
    setAddingNote(true);
    try {
      const res = await api.post(`/documents/${id}/annotations`, {
        versionId: activeVersionId,
        tool,
        text: selectionContext.text,
        x: selectionContext.x,
        y: selectionContext.y,
        width: selectionContext.width,
        height: selectionContext.height
      });
      const saved = res.data.data;
      setAnnotations((prev) => {
        if (prev.some((item) => item._id === saved._id)) return prev;
        return [...prev, saved];
      });
      setSelectionContext(null);
      window.getSelection().removeAllRanges();
    } catch {
      toast.error(`Failed to apply ${tool}`);
    } finally {
      setAddingNote(false);
    }
  };

  const clearSelectionAnnotations = async (tool) => {
    if (!selectionContext) return;
    const toRemove = annotations.filter(a => 
      a.tool === tool &&
      a.x >= selectionContext.x - 0.5 && a.x <= selectionContext.x + selectionContext.width + 0.5 &&
      a.y >= selectionContext.y - 0.5 && a.y <= selectionContext.y + selectionContext.height + 0.5
    );
    toRemove.forEach(a => removeAnnotation(a._id));
    setSelectionContext(null);
    window.getSelection().removeAllRanges();
  };

  const handleStartDrag = (e, annotationId) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.closest('.sticky-note').getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setDraggingId(annotationId);
    e.preventDefault();
  };

  const printPreview = () => {
    if (!previewBlob) return;
    const printUrl = window.URL.createObjectURL(previewBlob);
    const win = window.open(printUrl, '_blank', 'noopener,noreferrer');
    if (!win) {
      toast.error('Allow popups to print the preview');
      window.URL.revokeObjectURL(printUrl);
      return;
    }
    win.addEventListener('load', () => {
      win.print();
      setTimeout(() => window.URL.revokeObjectURL(printUrl), 2000);
    });
  };

  const downloadCurrent = async () => {
    if (!selectedVersion) return;
    try {
      const res = await api.get(`/documents/${id}/download/${selectedVersion._id}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', selectedVersion.originalName);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const dispatchReview = async (event) => {
    event.preventDefault();
    const notes = event.target.notes.value;
    setSubmitting(true);
    try {
      await api.post(`/documents/${id}/dispatch-review`, { notes: notes || 'Reviewed document' });
      toast.success('Review notifications dispatched');
      event.target.reset();
    } catch {
      toast.error('Failed to notify team');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="card p-8 text-sm font-bold text-slate-500">Loading preview workspace...</div>;
  if (!data || !selectedVersion) return <div className="card p-8 text-sm font-bold text-slate-500">Preview unavailable.</div>;

  const getSafeId = (obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    if (obj._id) return String(obj._id);
    if (obj.id) return String(obj.id);
    return String(obj);
  };

  const currentUserId = getSafeId(user);
  const isSender = getSafeId(data.document.sender) === currentUserId;
  const isRecipient = data.document.recipients?.some(u => getSafeId(u) === currentUserId);
  const isCurrentHandler = getSafeId(data.document.currentHandler) === currentUserId;
  
  // Handlers are those in the Recipient Registry or explicitly set as currentHandler
  const isHandler = isRecipient || isCurrentHandler;

  const myStickyNote = annotations.find(a => a.tool === 'sticky' && getSafeId(a.createdBy) === currentUserId);

  return (
    <div className="flex flex-col bg-slate-50 overflow-hidden -m-4 md:-m-6 lg:-m-8 h-screen border-l border-slate-200 shadow-sm transition-all duration-300">
      {/* HEADER / TOOLBAR */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 shadow-sm z-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link 
              to={`/documents/${id}`} 
              className="group flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition-all hover:bg-slate-900 hover:text-white"
              title="Return to details"
            >
              <div className="transform group-hover:-translate-x-0.5 transition-transform">←</div>
            </Link>
            <div>
              <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate max-w-[200px] sm:max-w-md">{data.document.title}</h1>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                <span>{data.document.referenceNumber}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                <span>V{selectedVersion?.versionNumber}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={printPreview} 
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
            >
              Print
            </button>
            <button 
              type="button" 
              onClick={downloadCurrent} 
              className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50"
            >
              <Download size={14} className="sm:hidden" />
              <span className="hidden sm:inline">Download</span>
            </button>
            {isSender && (
              <button 
                type="button" 
                onClick={() => setShowResubmit(true)}
                className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-slate-900/20 active:scale-95 transition-transform"
              >
                <Upload size={14} />
                <span className="hidden sm:inline">Resubmit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* VERSION & NOTE CONTROLS */}
      <div className="shrink-0 bg-white border-b border-slate-100 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Viewing Version</span>
          <select 
            value={activeVersionId} 
            onChange={(e) => setActiveVersionId(e.target.value)} 
            className="w-auto min-w-[200px] h-9 py-0 px-3 text-xs font-bold bg-slate-50 border-slate-200"
          >
            {data.versions.map((v) => (
              <option key={v._id} value={v._id}>
                Version {v.versionNumber} ({new Date(v.createdAt).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
        
        {isHandler && (
          <button
            type="button"
            onClick={handleAddStickyNote}
            disabled={addingNote || !!myStickyNote}
            className="flex h-9 items-center gap-2 rounded-xl bg-amber-100 px-4 text-[10px] font-black uppercase tracking-widest text-amber-900 transition hover:bg-amber-200 disabled:opacity-50"
            title={myStickyNote ? "Assessment already added" : "Add sticky assessment"}
          >
            <StickyNoteIcon size={14} />
            {myStickyNote ? "Assessment Recorded" : "Add Sticky Note"}
          </button>
        )}
      </div>

      {/* PREVIEW AREA */}
      <div className="flex-1 relative overflow-hidden bg-slate-200/50">
        <div
          ref={layerRef}
          className="absolute inset-0 overflow-auto custom-scrollbar p-6 sm:p-10"
          onMouseUp={handleSelection}
        >
          <div className="relative min-h-full w-full max-w-[1000px] mx-auto group">
            {previewLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm rounded-3xl animate-in fade-in">
                <div className="w-10 h-10 border-4 border-slate-100 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Synchronizing Archive...</p>
              </div>
            )}
            
            {!previewLoading && previewType === 'pdf' && previewUrl && (
              <div className="h-[1200px] w-full bg-white rounded-3xl shadow-2xl overflow-hidden ring-1 ring-slate-200">
                 <iframe title="Document Preview" src={previewUrl} className="h-full w-full border-none" />
              </div>
            )}
            
            {!previewLoading && previewType === 'docx' && (
              <div className="min-h-[1200px] bg-white p-12 sm:p-20 shadow-2xl rounded-3xl ring-1 ring-slate-200 mx-auto">
                <div ref={docxRef} className="docx-content" />
              </div>
            )}
            
            {!previewLoading && previewType === 'unsupported' && (
              <div className="h-[60vh] bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center p-12">
                 <div className="h-16 w-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-6 font-black uppercase tracking-widest text-xs">ERR</div>
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-2">Format Not Rendered Inline</h3>
                 <p className="text-sm font-semibold text-slate-500 max-w-sm mb-8">This file type is currently logged for download/print only. You can still apply sticky notes to the workspace.</p>
                 <button onClick={downloadCurrent} className="bg-slate-900 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest">Download Primary Source</button>
              </div>
            )}

            {/* SELECTION MENU */}
            {selectionContext && (
              <div 
                className="absolute z-[100] flex items-center gap-1 rounded-xl bg-slate-950 p-1.5 shadow-2xl border border-white/10 pointer-events-auto transform -translate-x-1/2 -translate-y-full"
                style={{ left: `${selectionContext.menuX}px`, top: `${selectionContext.menuY}px` }}
              >
                {!selectionContext.hasHighlight ? (
                  <button 
                    onClick={(e) => { e.stopPropagation(); addSelectionAnnotation('highlight'); }}
                    className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10"
                  >
                    Highlight
                  </button>
                ) : (
                  <button 
                    onClick={(e) => { e.stopPropagation(); clearSelectionAnnotations('highlight'); }}
                    className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-white/10"
                  >
                    Remove
                  </button>
                )}
                <div className="h-4 w-px bg-white/20"></div>
                <button 
                  onClick={(e) => { e.stopPropagation(); addSelectionAnnotation('strikethrough'); }}
                  className="rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 line-through"
                >
                  Strike
                </button>
              </div>
            )}

            {/* ANNOTATION LAYER */}
            <div className="pointer-events-none absolute inset-0">
              {annotations.map((item) => {
                if (item.tool === 'highlight' || item.tool === 'strikethrough') {
                  const isAnnotator = String(item.createdBy?._id || item.createdBy || '') === currentUserId;
                  return (
                    <div
                      key={item._id}
                      className={`absolute z-40 pointer-events-auto cursor-pointer transition-all ${
                        item.tool === 'highlight' ? 'bg-[#fde047]/40 ring-1 ring-[#fde047]/20' : 'bg-rose-500/10'
                      }`}
                      style={{ left: `${item.x}%`, top: `${item.y}%`, width: `${item.width}%`, height: `${item.height}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if ((isHandler || isAnnotator) && window.confirm('Remove this assessment mark?')) removeAnnotation(item._id);
                      }}
                    >
                      {item.tool === 'strikethrough' && <div className="absolute top-1/2 left-0 w-full h-[2px] bg-rose-600/60 transform -translate-y-1/2" />}
                    </div>
                  );
                }

                if (item.tool !== 'sticky') return null;
                const isOwner = String(item.createdBy?._id || item.createdBy || '') === currentUserId;

                return (
                  <div
                    key={item._id}
                    className={`sticky-note sticky-color-${item.color || 'yellow'} absolute z-50 group hover:z-[60]`}
                    style={{ left: `${item.x}%`, top: `${item.y}%` }}
                  >
                    {(isOwner || isHandler) && (
                      <button 
                        onClick={() => { if (window.confirm('Discard this sticky assessment?')) removeAnnotation(item._id); }}
                        className="absolute -top-3 -right-3 flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white opacity-0 shadow-xl transition-all hover:scale-110 group-hover:opacity-100 pointer-events-auto z-[70]"
                      >
                        ✕
                      </button>
                    )}
                    <div 
                      className={`flex items-center gap-2 mb-4 shrink-0 ${isOwner ? 'cursor-grab active:cursor-grabbing' : ''}`}
                      onMouseDown={(e) => isOwner && handleStartDrag(e, item._id)}
                    >
                      <div className="h-5 w-5 rounded bg-black/5 flex items-center justify-center text-[10px] font-black text-black/20">
                        {item.createdBy?.fullName?.charAt(0) || 'R'}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-black/40 truncate select-none">
                        {item.createdBy?.fullName || 'Registry Official'}
                      </span>
                    </div>
                    
                    <textarea
                      className="sticky-textarea custom-scrollbar pointer-events-auto"
                      value={item.text || ''}
                      onChange={(e) => isOwner && handleLocalNoteChange(item._id, e.target.value)}
                      readOnly={!isOwner}
                      placeholder={isOwner ? "Enter assessment details..." : "No comments recorded."}
                      onBlur={(e) => { if (isOwner) handleUpdateStickyNote(item._id, { text: e.target.value }); }}
                    />

                    {isOwner && (
                      <div className="flex items-center gap-1.5 mt-4 pt-4 border-t border-black/5 pointer-events-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        {STICKY_COLORS.map(c => (
                          <button
                            key={c}
                            onClick={() => handleUpdateStickyNote(item._id, { color: c })}
                            className={`h-4 w-4 rounded-full border border-black/5 transition-all hover:scale-125 ${
                              c === 'yellow' ? 'bg-[#fde047]' : 
                              c === 'pink' ? 'bg-[#f9a8d4]' : 
                              c === 'orange' ? 'bg-[#fdba74]' : 
                              c === 'red' ? 'bg-[#fca5a5]' : 
                              c === 'green' ? 'bg-[#86efac]' : 
                              c === 'blue' ? 'bg-[#93c5fd]' : 'bg-[#d8b4fe]'
                            } ${(item.color || 'yellow') === c ? 'ring-2 ring-black/20 ring-offset-2' : ''}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTION (ONLY HANDLERS) */}
      {isHandler && (
        <div className="shrink-0 bg-white border-t border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
           <div className="flex items-start gap-4">
              <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
                <MessageSquare size={18} />
              </div>
              <div className="max-w-md">
                <p className="text-xs font-black uppercase tracking-tight text-slate-900">Completion Dispatch</p>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Push final review assessments to the Registry Audit trail.</p>
              </div>
           </div>
           <form onSubmit={dispatchReview} className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
              <input 
                name="notes"
                placeholder="Final summary notes..."
                className="h-11 min-w-[300px] text-xs font-bold bg-slate-50 border-slate-200"
              />
              <SubmitButton isLoading={submitting} className="h-11 px-8 bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/20">
                 Dispatch Status
              </SubmitButton>
           </form>
        </div>
      )}

      {/* RESUBMIT MODAL (REUSED FROM ORIG) */}
      <AnimatePresence>
        {showResubmit && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowResubmit(false)} />
             <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white w-full max-w-md rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col">
                <div className="bg-slate-950 p-10 text-white">
                   <Upload className="w-12 h-12 mb-4 text-slate-400" />
                   <h2 className="text-2xl font-black uppercase tracking-tight">Record Update</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mt-1">Upload Revised Official Document Version</p>
                </div>
                <form onSubmit={handleResubmit} className="p-10 space-y-8">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Archival Payload</label>
                      <div className="relative group rounded-3xl border-2 border-dashed border-slate-100 p-10 text-center hover:bg-slate-50 transition-all cursor-pointer">
                         <input type="file" onChange={(e) => setResubmitFile(e.target.files[0])} className="absolute inset-0 opacity-0 cursor-pointer z-10" required />
                         <p className="text-xs font-black text-slate-900 uppercase">{resubmitFile ? resubmitFile.name : "Select Source File"}</p>
                      </div>
                   </div>
                   <div className="flex gap-3">
                      <button type="button" onClick={() => setShowResubmit(false)} className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400">Cancel</button>
                      <SubmitButton isLoading={submitting} className="flex-[2] h-14 bg-slate-950 shadow-xl shadow-slate-200">Ingest Version</SubmitButton>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
