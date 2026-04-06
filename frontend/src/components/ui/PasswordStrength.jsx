const config = {
  WEAK: { label: 'Weak', width: 'w-1/3', color: 'bg-rose-500' },
  MEDIUM: { label: 'Medium', width: 'w-2/3', color: 'bg-amber-500' },
  STRONG: { label: 'Strong', width: 'w-full', color: 'bg-emerald-500' }
};

function getStrength(password = '') {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 2) return 'WEAK';
  if (score <= 4) return 'MEDIUM';
  return 'STRONG';
}

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const strength = getStrength(password);
  const item = config[strength];

  return (
    <div className="mt-2">
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${item.width} ${item.color}`} />
      </div>
      <p className="mt-2 text-xs font-medium text-slate-500">Password strength: {item.label}</p>
    </div>
  );
}
