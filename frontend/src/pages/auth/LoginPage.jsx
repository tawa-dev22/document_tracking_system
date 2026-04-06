import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { HelpCircle, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { z } from 'zod';
import AuthShell from '../../components/common/AuthShell';
import PasswordInput from '../../components/ui/PasswordInput';
import SubmitButton from '../../components/ui/SubmitButton';
import { useAuth } from '../../contexts/AuthContext';
import { fetchCsrfToken } from '../../services/api';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  useEffect(() => {
    fetchCsrfToken();
  }, []);

  const onSubmit = async (values) => {
    clearErrors('root');
    try {
      await login(values);
      toast.success('Welcome back to the Ministry Portal');
      navigate('/dashboard');
    } catch (error) {
      const msg = error.response?.data?.message || 'Authentication failed. Please check your credentials.';
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

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your verified ministry account to continue."
      footer={
        <div className="flex flex-wrap gap-6 pt-4">
          <Link className="text-slate-900 hover:underline underline-offset-4" to="/signup">Create account</Link>
          <Link className="text-slate-900 hover:underline underline-offset-4" to="/forgot-password">Reset password</Link>
          <a className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-900 transition-colors" href="mailto:support@example.gov.zw">
            <HelpCircle size={14} /> System Support
          </a>
        </div>
      }
    >
      <motion.form 
        animate={errors.root || Object.keys(errors).length > 0 ? 'error' : ''}
        variants={shake}
        onSubmit={handleSubmit(onSubmit)} 
        className="space-y-6"
      >
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Email address</label>
          <input 
            type="email" 
            autoComplete="email" 
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

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Security Password</label>
          <PasswordInput 
            autoComplete="current-password" 
            placeholder="••••••••" 
            className={errors.password ? 'border-rose-200 bg-rose-50/30' : 'focus:bg-white'}
            {...register('password')} 
          />
          <AnimatePresence>
            {errors.password && (
              <motion.p 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-1 text-xs font-bold text-rose-600"
              >
                <AlertCircle size={12} /> {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {errors.root && (
          <motion.p 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-rose-50 px-5 py-4 text-sm font-bold text-rose-700 border border-rose-100 flex items-start gap-3"
          >
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            {errors.root.message}
          </motion.p>
        )}

        <SubmitButton isLoading={isSubmitting} loadingText="Verifying identity...">
          Login
        </SubmitButton>
      </motion.form>
    </AuthShell>
  );
}
