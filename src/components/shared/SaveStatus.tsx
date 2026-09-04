import React from 'react';
import { Check, RefreshCw, AlertCircle } from 'lucide-react';

export interface SaveStatusProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  onRetry?: () => void;
  className?: string;
}

export const SaveStatus: React.FC<SaveStatusProps> = ({
  status,
  onRetry,
  className = ''
}) => {
  if (status === 'idle') return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-1.5 text-xs ${className}`}
    >
      {status === 'saving' && (
        <span className="flex items-center gap-1 text-[var(--color-text-secondary,#9A9AA0)]">
          <RefreshCw className="w-3 h-3 animate-spin text-[var(--color-accent,#D4A843)]" />
          <span>Saving…</span>
        </span>
      )}

      {status === 'saved' && (
        <span className="flex items-center gap-1 text-[var(--color-text-muted,#5C5C64)]">
          <Check className="w-3 h-3 text-[var(--color-status-success,#4ADE80)]" />
          <span>Saved</span>
        </span>
      )}

      {status === 'error' && (
        <span className="flex items-center gap-1.5 text-[var(--color-status-danger,#F87171)]">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Save failed</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="underline hover:text-red-300 ml-0.5 focus:outline-none focus:ring-1 focus:ring-red-400 rounded"
            >
              retry
            </button>
          )}
        </span>
      )}
    </div>
  );
};
