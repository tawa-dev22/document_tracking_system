import { Eye, EyeOff } from 'lucide-react';
import { forwardRef, useId, useState } from 'react';

const PasswordInput = forwardRef(function PasswordInput(
  { label, error, className = '', inputClassName = '', ...props },
  ref
) {
  const [show, setShow] = useState(false);
  const generatedId = useId();
  const inputId = props.id || generatedId;

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}
      <div className={`relative ${className}`.trim()}>
        <input
          ref={ref}
          id={inputId}
          {...props}
          type={show ? 'text' : 'password'}
          className={`pr-12 ${inputClassName}`.trim()}
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-400 transition hover:text-slate-700 active:scale-95"
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-controls={inputId}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
    </div>
  );
});

export default PasswordInput;
