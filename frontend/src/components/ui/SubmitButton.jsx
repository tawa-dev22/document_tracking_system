import { motion } from 'framer-motion';

export default function SubmitButton({
  children,
  loadingText = 'Processing...',
  isLoading = false,
  className = '',
  ...props
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      {...props}
      disabled={isLoading || props.disabled}
      className={`relative flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 ${className}`.trim()}
    >
      {isLoading ? (
        <>
          <svg className="h-5 w-5 animate-spin text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span>{loadingText}</span>
        </>
      ) : (
        children
      )}
    </motion.button>
  );
}
