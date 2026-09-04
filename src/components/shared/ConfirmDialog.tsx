import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const confirmBtnStyles = {
    danger: 'bg-[var(--color-status-danger,#F87171)] text-[#1a1a1e] hover:bg-red-400 font-semibold',
    warning: 'bg-[var(--color-status-warning,#FBBF24)] text-[#1a1a1e] hover:bg-amber-400 font-semibold',
    primary: 'bg-[var(--color-accent,#D4A843)] text-[var(--color-accent-fg,#1a1a1e)] hover:bg-[var(--color-accent-hover,#E0B84D)] font-semibold'
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--color-bg-overlay,#1a1a1ecc)] backdrop-blur-xs"
    >
      <div className="bg-[var(--color-bg-surface,#242428)] border border-[var(--color-border-subtle,#2E2E34)] rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 text-[var(--color-text-primary,#E8E8EC)]">
        <div className="flex items-start gap-3">
          {variant === 'danger' || variant === 'warning' ? (
            <div className="p-2 rounded-full bg-red-950/50 text-[var(--color-status-danger,#F87171)] border border-red-800/40">
              <AlertTriangle className="w-5 h-5" />
            </div>
          ) : null}
          <div>
            <h3 id="confirm-dialog-title" className="text-lg font-bold">
              {title}
            </h3>
            <div id="confirm-dialog-desc" className="text-sm text-[var(--color-text-secondary,#9A9AA0)] mt-1">
              {description}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--color-border-subtle,#2E2E34)]">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-[var(--color-border-subtle,#2E2E34)] text-[var(--color-text-secondary,#9A9AA0)] hover:text-[var(--color-text-primary,#E8E8EC)] hover:bg-[var(--color-bg-surface-hover,#2a2a2f)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#D4A843)]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#D4A843)] ${confirmBtnStyles[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
