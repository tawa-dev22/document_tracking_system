import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MailOpen, Trash2, CheckCircle2, ShieldAlert, ExternalLink, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { setNotificationSummary } = useAuth();

  const loadNotifications = async () => {
    try {
      const [list, summary] = await Promise.all([api.get('/notifications'), api.get('/notifications/summary')]);
      setNotifications(list.data.data);
      setNotificationSummary(summary.data.data);
    } catch (error) {
      toast.error('Failed to sync intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const markRead = async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((item) => (item._id === id ? { ...item, isRead: true } : item)));
      setNotificationSummary((prev) => ({ ...prev, unreadCount: res.data.data.unreadCount }));
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  const deleteNotification = async (id) => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((item) => item._id !== id));
      setNotificationSummary((prev) => ({ ...prev, unreadCount: res.data.data.unreadCount }));
      toast.success('Record purged');
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const clearAll = async () => {
    try {
      if (!window.confirm('Confirm intelligence purge?')) return;
      await api.delete('/notifications');
      setNotifications([]);
      setNotificationSummary((prev) => ({ ...prev, unreadCount: 0 }));
      toast.success('All records cleared');
    } catch (error) {
      toast.error('Purge failed');
    }
  };

  const navigateToDoc = async (item) => {
    if (!item.isRead) await markRead(item._id);
    if (item.documentId) {
      window.location.href = `/documents/${item.documentId}`;
    }
  };

  const markAll = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setNotificationSummary((prev) => ({ ...prev, unreadCount: 0 }));
      toast.success('Intelligence acknowledged');
    } catch (error) {
      toast.error('Ack failed');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-slate-100 rounded-xl" />
        {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-slate-100 rounded-[2rem]" />)}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Intelligence</h1>
          <p className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-widest text-slate-400">System Notifications & Priority Alerts</p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-3">
            <button 
              onClick={markAll} 
              className="px-6 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              Acknowledge All
            </button>
            <button 
              onClick={clearAll} 
              className="px-6 py-3 rounded-2xl bg-rose-50 text-xs font-black uppercase tracking-widest text-rose-700 hover:bg-rose-100 transition-all border border-rose-100/50 active:scale-95 flex items-center gap-2"
            >
              <Trash2 size={14} /> Clear All
            </button>
          </div>
        )}
      </motion.div>

      <div className="space-y-3">
        <AnimatePresence mode="wait">
          {notifications.map((item, i) => (
            <motion.div 
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              key={item._id} 
              className={`group relative flex flex-col gap-4 sm:flex-row sm:items-start p-6 rounded-[2rem] border transition-all hover:shadow-xl cursor-default ${!item.isRead ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-900'}`}
            >
              <div 
                className="flex-1 cursor-pointer" 
                onClick={() => navigateToDoc(item)}
              >
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${!item.isRead ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}`}>
                    {!item.isRead ? <Bell size={20} className="animate-bounce" /> : <MailOpen size={20} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-sm font-black uppercase tracking-tight">{item.title}</h3>
                      {!item.isRead && <span className="rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-500/20">Critical</span>}
                    </div>
                    <p className={`text-sm mt-1 leading-relaxed ${!item.isRead ? 'text-slate-300 font-bold' : 'text-slate-500 font-medium'}`}>{item.message}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400 pl-16">
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(item.createdAt).toLocaleString()}</span>
                  <span className="flex items-center gap-1 opacity-50"><ShieldAlert size={12} /> {item.type}</span>
                </div>
              </div>
              
              <div className="flex gap-2 shrink-0 self-end sm:self-auto pt-2 sm:pt-0">
                {item.documentId && (
                  <button 
                    onClick={() => navigateToDoc(item)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-lg transition-all active:scale-95 ${!item.isRead ? 'bg-white text-slate-900 hover:bg-slate-100' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                  >
                    <ExternalLink size={16} />
                  </button>
                )}
                {!item.isRead && (
                  <button 
                     onClick={(e) => { e.stopPropagation(); markRead(item._id); }} 
                     className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all active:scale-95"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                )}
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteNotification(item._id); }} 
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all active:scale-95 ${!item.isRead ? 'bg-rose-500 text-white hover:bg-rose-600' : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-100/50'}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {notifications.length === 0 && !loading && (
          <div className="p-20 text-center">
            <div className="inline-flex p-4 rounded-full bg-slate-50 text-slate-300 mb-4">
              <CheckCircle2 size={40} />
            </div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Zero Activity</h3>
            <p className="text-sm font-bold text-slate-500">Your intelligence queue is clear. No active alerts.</p>
          </div>
        )}
      </div>
    </div>
  );
}
