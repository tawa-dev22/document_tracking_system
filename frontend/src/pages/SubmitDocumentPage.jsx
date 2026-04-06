import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Send, AlertCircle, Info, Mail, Users, Calendar, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import SubmitButton from '../components/ui/SubmitButton';
import api from '../services/api';

const today = new Date().toISOString().split('T')[0];

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(150),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  dueDate: z.string().optional().refine((value) => !value || value >= today, 'Due date cannot be in the past'),
  recipients: z.string().min(1, 'At least one recipient is required'),
  assignedUsers: z.string().optional(),
  department: z.string().min(2, 'Department name is required').max(100)
});

export default function SubmitDocumentPage() {
  const [selectedFileLabel, setSelectedFileLabel] = useState('');
  const [existingDepartments, setExistingDepartments] = useState([]);

  useState(() => {
    const fetchDepts = async () => {
      try {
        const res = await api.get('/departments');
        if (res.data.success) setExistingDepartments(res.data.data);
      } catch (err) {
        console.error('Failed to fetch departments');
      }
    };
    fetchDepts();
  }, []);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { priority: 'MEDIUM' }
  });

  const onSubmit = async (values) => {
    const fileInput = document.getElementById('file');
    const file = fileInput.files?.[0];
    if (!file) {
      toast.error('Please attach a document file.');
      return;
    }

    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => {
      if (!value) return;
      if (key === 'recipients' || key === 'assignedUsers') {
        value.split(',').map((entry) => entry.trim()).filter(Boolean).forEach((entry) => formData.append(key, entry));
      } else {
        formData.append(key, value);
      }
    });
    formData.append('file', file);

    try {
      await api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Document officially recorded in registry');
      reset();
      fileInput.value = '';
      setSelectedFileLabel('');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Archival failed. Please check network.');
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedFileLabel('');
      return;
    }
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    setSelectedFileLabel(`${file.name} (${sizeMb} MB)`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Registry Submission</h1>
        <p className="mt-1 text-sm font-bold text-slate-400 uppercase tracking-widest">Official Document Ingestion Portal</p>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-slate-900 p-8 text-white">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl">
              <Upload size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">New Record</h2>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">Mandatory Audit Trail Required</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Formal Document Title</label>
              <input 
                {...register('title')} 
                placeholder="Project Alpha - Q2 Financial Summary" 
                className={`text-lg font-black tracking-tight ${errors.title ? 'border-rose-200 bg-rose-50/50' : ''}`} 
              />
              {errors.title && <p className="text-[11px] font-bold text-rose-600">{errors.title.message}</p>}
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Summary Context</label>
              <textarea 
                rows="4" 
                {...register('description')} 
                placeholder="Briefly describe the purpose and context of this document..." 
                className={`font-medium text-slate-600 ${errors.description ? 'border-rose-200 bg-rose-50/50' : ''}`} 
              />
              {errors.description && <p className="text-[11px] font-bold text-rose-600">{errors.description.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <ShieldCheck size={12} /> Ministry Priority
              </label>
              <select {...register('priority')} className="font-bold text-slate-700">
                <option value="LOW">Normal Processing</option>
                <option value="MEDIUM">High Visibility</option>
                <option value="HIGH">Critical Action</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Calendar size={12} /> Archival Due Date
              </label>
              <input type="date" {...register('dueDate')} className={`font-bold ${errors.dueDate ? 'border-rose-200 bg-rose-50/50' : ''}`} />
              {errors.dueDate && <p className="text-[11px] font-bold text-rose-600">{errors.dueDate.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <FileText size={12} /> Target Department
              </label>
              <input 
                {...register('department')} 
                list="department-list" 
                placeholder="Finance, ICT, HR..." 
                className={`font-bold ${errors.department ? 'border-rose-200 bg-rose-50/50' : ''}`} 
              />
              <datalist id="department-list">
                {existingDepartments.map(d => <option key={d._id} value={d.name} />)}
              </datalist>
              {errors.department && <p className="text-[11px] font-bold text-rose-600">{errors.department.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Users size={12} /> Recipient Registry (Emails)
              </label>
              <input 
                {...register('recipients')} 
                placeholder="boss@gov.zw, officer@gov.zw..." 
                className={`text-sm font-bold ${errors.recipients ? 'border-rose-200 bg-rose-50/50' : ''}`} 
              />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Requires comma-separated ministerial addresses.</p>
              {errors.recipients && <p className="text-[11px] font-bold text-rose-600">{errors.recipients.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Mail size={12} /> Carbon Copy (Observers)
              </label>
              <input {...register('assignedUsers')} placeholder="cc@gov.zw..." className="text-sm font-bold" />
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Source Archive (File Upload)</label>
              <div className="relative rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-12 text-center transition-all hover:border-slate-300 hover:bg-white group cursor-pointer">
                <input id="file" type="file" onChange={handleFileSelect} className="absolute inset-0 z-10 cursor-pointer opacity-0" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl shadow-slate-200/50 text-slate-400 group-hover:scale-110 group-hover:text-slate-900 transition-all">
                  <FileText size={32} />
                </div>
                <p className="mt-6 text-base font-black text-slate-900 tracking-tight">
                  {selectedFileLabel ? 'Selected document' : 'Click to select primary document'}
                </p>
                {selectedFileLabel && (
                  <p className="mt-2 text-sm font-semibold text-emerald-700 break-all">{selectedFileLabel}</p>
                )}
                <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-widest font-bold">PDF, DOCX, XLSX up to 20MB</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-100 pt-8">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 px-4 py-2.5 rounded-2xl border border-amber-100/50 max-w-sm">
              <AlertCircle size={18} className="shrink-0" />
              <p className="text-[11px] font-bold leading-tight uppercase tracking-wide">Documents entered here are officially logged into the Government Audit Trail system.</p>
            </div>
            <SubmitButton isLoading={isSubmitting} loadingText="Authorizing & Ingesting..." className="w-full sm:w-auto px-12 h-14">
              Log Record
            </SubmitButton>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
