import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, Mail, ArrowLeft, ShieldCheck, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { z } from 'zod';
import AuthShell from '../../components/common/AuthShell';
import SubmitButton from '../../components/ui/SubmitButton';
import api from '../../services/api';

const schema = z.object({
  email: z.string().trim().email('Invalid ministry email address')
});

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError
  } = useForm({
    resolver: zodResolver(schema)
  });

  const onSubmit = async (values) => {
    try {
      await api.post('/auth/forgot-password', values);
      setSubmitted(true);
      toast.success('Security link dispatched to your inbox');
    } catch (error) {
      const msg = error.response?.data?.message || 'Access reset failed.';
      setError('root', { message: msg });
      toast.error(msg);
    }
  };

  const shake = {
    error: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    }
  };

  if (submitted) {
    return (
      <AuthShell
        title="Check Your Inbox"
        subtitle="A secure recovery link has been sent to your registered address."
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6 text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 shadow-xl shadow-emerald-500/10 border border-emerald-100">
            <Mail size={40} strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 leading-relaxed px-4">
              Please click the link in the email to verify your identity and reset your security credentials. Link expires in 30 minutes.
            </p>
          </div>
          <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 shadow-sm transition-all hover:bg-slate-50 active:scale-95">
            <ArrowLeft size={16} /> Return to Login
          </Link>
        </motion.div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Recover Access"
      subtitle="Enter your official ministry email to receive a recovery link."
      footer={
        <div className="flex flex-wrap gap-6 pt-4">
          <Link className="text-slate-900 hover:underline underline-offset-4 font-bold" to="/login">Back to Sign in</Link>
          <a className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors" href="mailto:support@example.gov.zw">
            <HelpCircle size={14} /> Systems Authority
          </a>
        </div>
      }
    >
      <motion.form 
        animate={errors.root || errors.email ? 'error' : ''}
        variants={shake}
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-6"
      >
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <ShieldCheck size={12} /> Ministry Email Address
          </label>
          <input 
            type="email" 
            placeholder="name@example.gov.zw" 
            className={`transition-all ${errors.email ? 'border-rose-200 bg-rose-50/30' : 'focus:bg-white'}`}
            {...register('email')} 
          />
          <AnimatePresence>
            {errors.email && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1 text-xs font-bold text-rose-600"
              >
                <AlertCircle size={12} /> {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {errors.root && (
          <motion.p 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 border border-rose-100"
          >
            {errors.root.message}
          </motion.p>
        )}

        <SubmitButton isLoading={isSubmitting} loadingText="Verifying Identity...">
          Request Recovery Link
        </SubmitButton>
      </motion.form>
    </AuthShell>
  );
}
