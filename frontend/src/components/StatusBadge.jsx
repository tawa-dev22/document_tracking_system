const styles = {
  SUBMITTED: 'bg-blue-50 text-blue-700 ring-1 ring-blue-100',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-1 ring-amber-100',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100',
  REJECTED: 'bg-rose-50 text-rose-700 ring-1 ring-rose-100',
  RESUBMITTED: 'bg-violet-50 text-violet-700 ring-1 ring-violet-100'
};

export default function StatusBadge({ status }) {
  if (!status) return <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">UNKNOWN</span>;
  const label = status.replaceAll('_', ' ');
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status] || 'bg-slate-100 text-slate-700'}`}>{label}</span>;
}
