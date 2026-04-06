import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Shield, 
  UserX, 
  UserCheck, 
  Lock, 
  Key,
  Briefcase,
  Mail,
  Award,
  Clock,
  XSquare
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [userAuditLogs, setUserAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/users', {
        params: {
          search,
          role: roleFilter,
          status: statusFilter,
          page
        }
      });
      setUsers(res.data.users);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      toast.error('Failed to fetch user directory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter, page]);

  const toggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await api.put(`/admin/users/${userId}`, { accountStatus: newStatus });
      toast.success(`Account ${newStatus === 'ACTIVE' ? 'activated' : 'suspended'}`);
      fetchUsers();
    } catch (error) {
      toast.error('Operation failed');
    }
  };

  const updateUserDetails = async (userId, data) => {
    try {
      await api.put(`/admin/users/${userId}`, data);
      toast.success('User updated successfully');
      fetchUsers();
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    }
  };

  const fetchUserAudit = async (user) => {
    setSelectedUser(user);
    setAuditLoading(true);
    setShowAuditModal(true);
    try {
      const res = await api.get('/admin/logs', { params: { actorId: user._id, limit: 50 } });
      setUserAuditLogs(res.data.logs);
    } catch (error) {
      toast.error('Failed to load access history');
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Personnel Directory</h1>
        <p className="text-slate-500 font-medium">Manage organization accounts, access privileges, and security status.</p>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email, or employee ID..." 
            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-4 focus:ring-slate-100 transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-4">
          <select 
             className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all"
             value={roleFilter}
             onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="USER">User</option>
            <option value="MANAGER">Manager</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select 
             className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-100 transition-all"
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="PENDING_VERIFICATION">Pending</option>
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 uppercase tracking-widest text-[9px] font-black text-slate-400">
                <th className="px-4 py-4 text-left">Identity</th>
                <th className="px-4 py-4 text-left">Organization Info</th>
                <th className="px-4 py-4 text-left">Privileges</th>
                <th className="px-4 py-4 text-left">Status</th>
                <th className="px-4 py-4 text-right">Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              <AnimatePresence mode="popLayout">
                {users.map((u) => (
                  <motion.tr 
                    key={u._id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-700 text-[10px]">
                          {u.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">{u.fullName}</p>
                          <p className="text-[10px] font-medium text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5"><Briefcase size={12}/> {u.department}</p>
                      <p className="text-[9px] font-black text-slate-400 uppercase mt-0.5">Grade {u.grade}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-700 outline-none hover:border-slate-300 transition-colors"
                        value={u.role}
                        onChange={(e) => updateUserDetails(u._id, { role: e.target.value })}
                      >
                        <option value="USER">User</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                        u.accountStatus === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600' :
                        u.accountStatus === 'SUSPENDED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                         {u.accountStatus}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => { setSelectedUser(u); setShowPasswordModal(true); }}
                          className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-100 transition-all"
                          title="Reset Password"
                        >
                          <Key size={14} />
                        </button>
                        <button 
                          onClick={() => fetchUserAudit(u)}
                          className="p-1.5 rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                          title="View Access History"
                        >
                          <Lock size={14} />
                        </button>
                        <button 
                          onClick={() => toggleStatus(u._id, u.accountStatus)}
                          className={`p-1.5 rounded-lg border transition-all ${
                            u.accountStatus === 'ACTIVE' ? 'border-rose-100 text-rose-500 hover:bg-rose-50' : 'border-emerald-100 text-emerald-500 hover:bg-emerald-50'
                          }`}
                        >
                          {u.accountStatus === 'ACTIVE' ? <UserX size={14} /> : <UserCheck size={14} />}
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
        
        {/* PAGINATION */}
      </div>

      {/* PASSWORD RESET MODAL */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPasswordModal(false)} />
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden">
              <div className="bg-amber-500 p-6 text-white">
                <Key className="w-10 h-10 mb-2 opacity-50" />
                <h2 className="text-xl font-bold">Security Override</h2>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-100">Force Password Reset for {selectedUser?.fullName}</p>
              </div>
              <div className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Secure Password</label>
                  <input 
                    type="password" 
                    placeholder="Enter at least 8 characters..." 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-amber-100 outline-none transition-all"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowPasswordModal(false)} className="flex-1 px-6 py-3 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50">Cancel</button>
                  <button 
                    onClick={() => updateUserDetails(selectedUser._id, { password: newPassword })}
                    className="flex-[2] px-6 py-3 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-200"
                  >
                    Update Password
                  </button>
                </div>
              </div>
           </motion.div>
        </div>
      )}

      {/* AUDIT HISTORY MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowAuditModal(false)} />
           <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-xl rounded-3xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[80vh]">
              <div className="bg-slate-900 p-6 text-white shrink-0">
                <Shield className="w-8 h-8 mb-2 text-indigo-400" />
                <h2 className="text-lg font-black">Account Access History</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Audit Trail for {selectedUser?.fullName}</p>
              </div>
              <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-3">
                {auditLoading ? (
                  <div className="py-20 flex justify-center"><div className="animate-spin h-6 w-6 border-2 border-slate-900 border-t-transparent rounded-full" /></div>
                ) : userAuditLogs.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-10">No recent activity recorded for this user.</p>
                ) : (
                  userAuditLogs.map((log) => (
                    <div key={log._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                      <div className="h-8 w-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                        <Clock size={12} />
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 uppercase">{log.action.replaceAll('_', ' ')}</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">{new Date(log.createdAt).toLocaleString()} · IP: {log.ipAddress || 'Internal'}</p>
                        {log.metadata?.referenceNumber && <p className="text-[9px] font-black text-indigo-500 mt-1">DOC REF: {log.metadata.referenceNumber}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-6 border-t border-slate-100 shrink-0">
                <button onClick={() => setShowAuditModal(false)} className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800">Close Audit Trail</button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
