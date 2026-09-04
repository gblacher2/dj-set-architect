import React from 'react';
import { Music2 } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Music2,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center bg-[var(--color-bg-surface,#242428)] border border-[var(--color-border-subtle,#2E2E34)] rounded-lg ${className}`}>
      <div className="w-12 h-12 rounded-full bg-[var(--color-bg-base,#1a1a1e)] border border-[var(--color-border-subtle,#2E2E34)] flex items-center justify-center text-[var(--color-accent,#D4A843)] mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-[var(--color-text-primary,#E8E8EC)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-secondary,#9A9AA0)] max-w-sm mb-4">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 text-sm font-semibold rounded-md bg-[var(--color-accent,#D4A843)] text-[var(--color-accent-fg,#1a1a1e)] hover:bg-[var(--color-accent-hover,#E0B84D)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#D4A843)]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
