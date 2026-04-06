import { ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../assets/logo.png';

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50/50 px-4 py-8">
      <div className="grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="hidden overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-10 shadow-sm lg:block"
        >
          <div className="inline-flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 text-xs font-bold uppercase tracking-widest text-slate-500">
            <ShieldCheck size={14} className="text-emerald-600" /> Secure Ministry Portal
          </div>
          <div className="mt-8 flex items-center gap-4">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-1 shadow-lg">
              <img src={logo} alt="Ministry of Finance — official seal" className="h-full w-full rounded-full object-cover" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter text-slate-900">Ministry of Finance</h1>
              <p className="text-sm font-bold uppercase tracking-widest text-slate-400">Document Tracking System</p>
            </div>
          </div>
          <p className="mt-8 max-w-xl text-lg font-medium leading-relaxed text-slate-600">
            A secure, real-time platform for processing, tracking, and managing critical government documentation with full audit accountability.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {[
              { label: 'Cloud Persistence', desc: 'Secure MongoDB document storage' },
              { label: 'Real-time Trace', desc: 'Instant activity logging and alerts' },
              { label: 'OTP Security', desc: 'Multi-factor authentication protocols' },
              { label: 'Access Control', desc: 'Document-level privilege management' }
            ].map((item, i) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                key={item.label} 
                className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 transition-colors hover:bg-slate-50"
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{item.label}</p>
                <p className="mt-1 text-sm font-bold text-slate-700">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden p-8 md:p-12"
        >
          <div className="flex items-center gap-3 lg:hidden">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white p-0.5 shadow-sm">
              <img src={logo} alt="" className="h-full w-full rounded-full object-cover" aria-hidden />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Ministry of Finance</p>
              <p className="text-xs font-bold text-slate-600">Document tracking portal</p>
            </div>
          </div>
          <Link to="/" className="mt-6 block text-xs font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors lg:mt-0">Ministry System</Link>
          <h2 className="mt-8 text-3xl font-black tracking-tight text-slate-900">{title}</h2>
          <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{subtitle}</p>
          <div className="mt-10">{children}</div>
          {footer && (
            <div className="mt-8 border-t border-slate-100 pt-8 text-sm font-bold text-slate-500">
              {footer}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
