import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, AlertCircle, CheckCircle2, ShieldCheck, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { z } from 'zod';
import AuthShell from '../../components/common/AuthShell';
import PasswordInput from '../../components/ui/PasswordInput';
import PasswordStrength from '../../components/ui/PasswordStrength';
import SubmitButton from '../../components/ui/SubmitButton';
import api from '../../services/api';

const signupSchema = z.object({
  fullName: z.string().trim().min(3, 'Full name is required').max(120),
  email: z.string().trim().email('Enter a valid email address'),
  employeeId: z.string().trim().min(3, 'Employee ID is required').max(40),
  department: z.string().trim().min(2, 'Department is required').max(120),
  grade: z.string().trim().min(1, 'Personnel grade is required').max(50),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Include an uppercase letter')
    .regex(/[a-z]/, 'Include a lowercase letter')
    .regex(/[0-9]/, 'Include a number')
    .regex(/[^A-Za-z0-9]/, 'Include a special character'),
  confirmPassword: z.string().min(1, 'Please confirm your password')
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
});

const otpSchema = z.object({ otp: z.string().trim().length(6, 'Enter the 6-digit OTP') });

export default function SignupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState('signup');
  const [email, setEmail] = useState('');
  const [serverMessage, setServerMessage] = useState('');
  const [isResending, setIsResending] = useState(false);

  const signupForm = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      fullName: '', 
      email: searchParams.get('email') || '', 
      employeeId: '', 
      department: '', 
      grade: '', 
      password: '', 
      confirmPassword: '' 
    },
    mode: 'onSubmit'
  });


  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) {
      signupForm.setValue('email', urlEmail);
    }
  }, [searchParams, signupForm]);

  const otpForm = useForm({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: '' }
  });

  const password = signupForm.watch('password');

  const submitSignup = async (values) => {
    signupForm.clearErrors('root');
    try {
      const response = await api.post('/auth/register', values);
      setEmail(values.email);
      setServerMessage(response.data.message);
      setStep('verify');
      toast.success('Registration request sent. Please verify your email.');
    } catch (error) {
      const msg = error.response?.data?.message || 'Unable to create account.';
      signupForm.setError('root', { message: msg });
      toast.error(msg);
    }
  };

  const verifyOtp = async ({ otp }) => {
    otpForm.clearErrors('root');
    try {
      const response = await api.post('/auth/verify-email', { email, otp });
      setServerMessage(response.data.message);
      setStep('verified');
      toast.success('Email verified successfully');
    } catch (error) {
      const msg = error.response?.data?.message || 'Verification failed.';
      otpForm.setError('root', { message: msg });
      toast.error(msg);
    }
  };

  const resendOtp = async () => {
    setIsResending(true);
    otpForm.clearErrors('root');
    try {
      const response = await api.post('/auth/resend-verification-otp', { email });
      setServerMessage(response.data.message);
      toast.success('New OTP sent to your inbox');
    } catch (error) {
      toast.error('Failed to resend code');
    } finally {
      setIsResending(false);
    }
  };

  const shake = {
    error: {
      x: [0, -10, 10, -10, 10, 0],
      transition: { duration: 0.4 }
    }
  };

  return (
    <AuthShell
      title={step === 'signup' ? 'Create Authorization' : step === 'verify' ? 'Identity Verification' : 'Access Granted'}
      subtitle={step === 'signup' ? 'Join the Ministry Document Tracking System.' : step === 'verify' ? `A security code was sent to ${email}.` : 'Your account is now active.'}
      footer={
        <div className="flex flex-wrap gap-6 pt-4">
          <Link className="text-slate-900 hover:underline underline-offset-4" to="/login">Sign in instead</Link>
          <a className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors" href="mailto:support@example.gov.zw">
            <HelpCircle size={14} /> Systems Authority
          </a>
        </div>
      }
    >
      <AnimatePresence mode="wait">
        {step === 'signup' && (
          <motion.form 
            key="signup"
            initial={{ opacity: 0, x: 20 }}
            animate={signupForm.formState.errors.root || Object.keys(signupForm.formState.errors).length > 0 ? { opacity: 1, x: 0, ...shake.error } : { opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={signupForm.handleSubmit(submitSignup)} 
            className="space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Personnel Name</label>
                <input placeholder="Hon. John Doe" {...signupForm.register('fullName')} className={signupForm.formState.errors.fullName ? 'border-rose-200 bg-rose-50/30' : ''} />
                {signupForm.formState.errors.fullName && <p className="text-[11px] font-bold text-rose-600">{signupForm.formState.errors.fullName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ministry Email</label>
                <input type="email" placeholder="name@example.gov.zw" {...signupForm.register('email')} className={signupForm.formState.errors.email ? 'border-rose-200 bg-rose-50/30' : ''} />
                {signupForm.formState.errors.email && <p className="text-[11px] font-bold text-rose-600">{signupForm.formState.errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Employee ID</label>
                <input placeholder="MOF-XXX" {...signupForm.register('employeeId')} className={signupForm.formState.errors.employeeId ? 'border-rose-200 bg-rose-50/30' : ''} />
                {signupForm.formState.errors.employeeId && <p className="text-[11px] font-bold text-rose-600">{signupForm.formState.errors.employeeId.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Department</label>
                <input 
                  id="reg-dept"
                  autoComplete="off"
                  placeholder="Finance, Treasury, ICT..." 
                  {...signupForm.register('department')} 
                  className={signupForm.formState.errors.department ? 'border-rose-200 bg-rose-50/30' : ''} 
                />
                {signupForm.formState.errors.department && <p className="text-[11px] font-bold text-rose-600">{signupForm.formState.errors.department.message}</p>}
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personnel Grade</label>
                <input 
                  id="reg-grade"
                  autoComplete="off"
                  placeholder="Grade 12, Senior Officer..." 
                  {...signupForm.register('grade')} 
                  className={signupForm.formState.errors.grade ? 'border-rose-200 bg-rose-50/30' : ''} 
                />
                {signupForm.formState.errors.grade && <p className="text-[11px] font-bold text-rose-600">{signupForm.formState.errors.grade.message}</p>}
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Password</label>
                <PasswordInput placeholder="••••••••" error={signupForm.formState.errors.password?.message} {...signupForm.register('password')} />
                <PasswordStrength password={password} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confirm Password</label>
                <PasswordInput placeholder="••••••••" error={signupForm.formState.errors.confirmPassword?.message} {...signupForm.register('confirmPassword')} />
              </div>
            </div>
            {signupForm.formState.errors.root && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 border border-rose-100">{signupForm.formState.errors.root.message}</p>}
            <SubmitButton isLoading={signupForm.formState.isSubmitting}>Register Account</SubmitButton>
          </motion.form>
        )}

        {step === 'verify' && (
          <motion.form 
            key="verify"
            initial={{ opacity: 0, x: 20 }}
            animate={otpForm.formState.errors.root || Object.keys(otpForm.formState.errors).length > 0 ? { opacity: 1, x: 0, ...shake.error } : { opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onSubmit={otpForm.handleSubmit(verifyOtp)} 
            className="space-y-6"
          >
            <div className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 border border-emerald-100 flex items-center gap-3">
              <Mail className="shrink-0" size={18} />
              {serverMessage}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">One-Time Security Code</label>
              <input inputMode="numeric" placeholder="000000" maxLength={6} {...otpForm.register('otp')} className="text-center text-3xl font-black tracking-[0.4em] focus:bg-white" />
              {otpForm.formState.errors.otp && <p className="text-[11px] font-bold text-rose-600">{otpForm.formState.errors.otp.message}</p>}
            </div>
            {otpForm.formState.errors.root && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 border border-rose-100">{otpForm.formState.errors.root.message}</p>}
            <SubmitButton isLoading={otpForm.formState.isSubmitting} loadingText="Verifying Code...">Authorize Email</SubmitButton>
            <button 
              type="button" 
              onClick={resendOtp} 
              disabled={isResending}
              className="group flex w-full items-center justify-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={isResending ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
              {isResending ? 'Sending Code...' : 'Resend Security Code'}
            </button>
          </motion.form>
        )}

        {step === 'verified' && (
          <motion.div 
            key="verified"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600 shadow-xl shadow-emerald-500/10">
              <CheckCircle2 size={40} strokeWidth={3} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 tracking-tight">Identity Confirmed</p>
              <p className="mt-2 text-sm font-medium text-slate-500 leading-relaxed">{serverMessage}</p>
            </div>
            <Link to="/login" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all hover:scale-105 active:scale-95">
              Proceed to Dashboard <ArrowRight size={18} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
