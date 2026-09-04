import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  title,
  message,
  duration = 3500,
  onDismiss
}) => {
  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  const iconMap = {
    success: <CheckCircle2 className="w-5 h-5 text-[var(--color-status-success,#4ADE80)] shrink-0" />,
    error: <XCircle className="w-5 h-5 text-[var(--color-status-danger,#F87171)] shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-[var(--color-status-warning,#FBBF24)] shrink-0" />,
    info: <Info className="w-5 h-5 text-[var(--color-status-info,#60A5FA)] shrink-0" />
  };

  const borderMap = {
    success: 'border-l-4 border-l-[var(--color-status-success,#4ADE80)]',
    error: 'border-l-4 border-l-[var(--color-status-danger,#F87171)]',
    warning: 'border-l-4 border-l-[var(--color-status-warning,#FBBF24)]',
    info: 'border-l-4 border-l-[var(--color-status-info,#60A5FA)]'
  };

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live="polite"
      className={`bg-[var(--color-bg-surface,#242428)] text-[var(--color-text-primary,#E8E8EC)] border border-[var(--color-border-subtle,#2E2E34)] ${borderMap[type]} p-3.5 rounded-md shadow-lg flex items-start gap-3 justify-between`}
    >
      <div className="flex items-start gap-3">
        {iconMap[type]}
        <div>
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          {message && <p className="text-xs text-[var(--color-text-secondary,#9A9AA0)] mt-1">{message}</p>}
        </div>
      </div>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Close notification"
        className="text-[var(--color-text-muted,#5C5C64)] hover:text-[var(--color-text-primary,#E8E8EC)] transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-[var(--color-accent,#D4A843)]"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
