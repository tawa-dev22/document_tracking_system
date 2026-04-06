import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, Briefcase, Mail, Award, Lock, Edit2, Check, X, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast';

const profileSchema = z.object({
  fullName: z.string().min(3, 'Full name must be at least 3 characters'),
  employeeId: z.string().min(3, 'Employee ID is required'),
  department: z.string().min(2, 'Department is required'),
  grade: z.string().min(1, 'Grade is required')
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/[0-9]/, 'Must include a number')
    .regex(/[^A-Za-z0-9]/, 'Must include a special character'),
  confirmPassword: z.string().min(1, 'Please confirm your new password')
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

function ProfileAvatar({ name }) {
  return (
    <div className="relative">
      <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-slate-800 to-slate-600 flex items-center justify-center text-4xl font-black text-white shadow-xl shadow-slate-200/50 border-4 border-white z-10 relative">
        {getInitials(name)}
      </div>
      <div className="absolute inset-0 rounded-full bg-slate-200 animate-ping opacity-20"></div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth(); 
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors, isSubmitting: isSubmittingProfile },
    reset: resetProfile
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user?.fullName || '',
      employeeId: user?.employeeId || '',
      department: user?.department || '',
      grade: user?.grade || ''
    }
  });

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: isSubmittingPassword },
    reset: resetPasswordForm
  } = useForm({
    resolver: zodResolver(passwordSchema)
  });

  const onUpdateProfile = async (data) => {
    try {
      const res = await api.put('/auth/profile', data);
      toast.success('Profile updated successfully');
      setIsEditingProfile(false);
      
      // Update global context so the sidebar/header updates instantly
      if (res.data?.user) {
        setUser(res.data.user);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    }
  };

  const onChangePassword = async (data) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      toast.success('Password updated successfully');
      resetPasswordForm();
      setIsChangingPassword(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      
      {/* HEADER EXCERPT */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full mix-blend-multiply filter blur-3xl opacity-70 translate-x-1/2 -translate-y-1/2"></div>
        <ProfileAvatar name={user?.fullName} />
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">{user?.fullName}</h1>
          <p className="text-sm font-bold text-slate-400 mt-1 uppercase tracking-widest flex items-center justify-center md:justify-start gap-2">
            <Shield size={14} /> {user?.role || 'System Agent'}
          </p>
        </div>
        {!isEditingProfile && (
          <button onClick={() => setIsEditingProfile(true)} className="z-10 group relative flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200 transition-all active:scale-95">
            <Edit2 size={16} /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid md:grid-cols-12 gap-8">
        
        {/* PROFILE INFORMATION */}
        <div className="md:col-span-12 lg:col-span-7 bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="bg-slate-100 p-2.5 rounded-xl text-slate-700">
              <User size={20} />
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Personal Details</h2>
          </div>

          <AnimatePresence mode="wait">
            {!isEditingProfile ? (
              <motion.div 
                key="view"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-1.5"><Mail size={12}/> Email Address</p>
                    <p className="text-sm font-bold text-slate-700">{user?.email}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-1.5"><Shield size={12}/> Employee ID</p>
                    <p className="text-sm font-bold text-slate-700">{user?.employeeId || 'N/A'}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-1.5"><Briefcase size={12}/> Department</p>
                    <p className="text-sm font-bold text-slate-700">{user?.department}</p>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-black text-slate-400 flex items-center gap-1.5"><Award size={12}/> Grade Level</p>
                    <p className="text-sm font-bold text-slate-700">{user?.grade}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.form 
                key="edit"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                onSubmit={handleProfileSubmit(onUpdateProfile)} className="space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Full Name</label>
                    <input {...registerProfile('fullName')} className={`w-full bg-slate-50 border ${profileErrors.fullName ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {profileErrors.fullName && <p className="text-xs font-bold text-rose-500">{profileErrors.fullName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Employee ID</label>
                    <input {...registerProfile('employeeId')} className={`w-full bg-slate-50 border ${profileErrors.employeeId ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {profileErrors.employeeId && <p className="text-xs font-bold text-rose-500">{profileErrors.employeeId.message}</p>}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Department</label>
                    <input {...registerProfile('department')} className={`w-full bg-slate-50 border ${profileErrors.department ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {profileErrors.department && <p className="text-xs font-bold text-rose-500">{profileErrors.department.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-500">Grade</label>
                    <input {...registerProfile('grade')} className={`w-full bg-slate-50 border ${profileErrors.grade ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {profileErrors.grade && <p className="text-xs font-bold text-rose-500">{profileErrors.grade.message}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-6 border-t border-slate-100">
                  <button type="submit" disabled={isSubmittingProfile} className="flex-1 bg-slate-900 text-white rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 transition-all">
                    {isSubmittingProfile ? 'Saving...' : <><Check size={16}/> Save Changes</>}
                  </button>
                  <button type="button" onClick={() => { resetProfile(); setIsEditingProfile(false); }} className="px-6 bg-white border border-slate-200 text-slate-600 rounded-xl py-3 text-sm font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                    <X size={16}/> Cancel
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {/* SECURITY SETTINGS */}
        <div className="md:col-span-12 lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-rose-50 p-2.5 rounded-xl text-rose-500">
                  <Lock size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">Security</h2>
              </div>
              {!isChangingPassword && (
                <button onClick={() => setIsChangingPassword(true)} className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg hover:bg-rose-100 transition-colors uppercase tracking-wider">
                  Update
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!isChangingPassword ? (
                <motion.div key="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <p className="text-sm font-bold text-slate-700">Account highly secure</p>
                  </div>
                  <p className="text-xs font-bold text-slate-400">Regularly updating your password prevents unauthorized access to sensitive archival records.</p>
                </motion.div>
              ) : (
                <motion.form key="change" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handlePasswordSubmit(onChangePassword)} className="space-y-4">
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Password</label>
                    <input type="password" {...registerPassword('currentPassword')} className={`w-full bg-slate-50 border ${passwordErrors.currentPassword ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {passwordErrors.currentPassword && <p className="text-[10px] font-bold text-rose-500">{passwordErrors.currentPassword.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">New Password</label>
                    <input type="password" {...registerPassword('newPassword')} className={`w-full bg-slate-50 border ${passwordErrors.newPassword ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {passwordErrors.newPassword && <p className="text-[10px] font-bold text-rose-500">{passwordErrors.newPassword.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Confirm New Password</label>
                    <input type="password" {...registerPassword('confirmPassword')} className={`w-full bg-slate-50 border ${passwordErrors.confirmPassword ? 'border-rose-300' : 'border-slate-200'} rounded-xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all`} />
                    {passwordErrors.confirmPassword && <p className="text-[10px] font-bold text-rose-500">{passwordErrors.confirmPassword.message}</p>}
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button type="button" onClick={() => { resetPasswordForm(); setIsChangingPassword(false); }} className="flex-1 bg-white border border-slate-200 text-slate-600 rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wider hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                    <button type="submit" disabled={isSubmittingPassword} className="flex-[2] bg-slate-900 text-white rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wider hover:bg-slate-800 disabled:opacity-50 transition-all text-center">
                      {isSubmittingPassword ? 'Saving...' : 'Save Password'}
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
