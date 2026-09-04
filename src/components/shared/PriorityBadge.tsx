import React from 'react';

export interface PriorityBadgeProps {
  priority: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const getPriorityTier = (priority: number) => {
  if (priority >= 75) {
    return {
      label: 'Critical',
      colorClass: 'bg-red-950/80 border-red-700/50 text-[var(--color-priority-critical,#F87171)]'
    };
  }
  if (priority >= 50) {
    return {
      label: 'High',
      colorClass: 'bg-orange-950/80 border-orange-700/50 text-[var(--color-priority-high,#FB923C)]'
    };
  }
  if (priority >= 25) {
    return {
      label: 'Medium',
      colorClass: 'bg-amber-950/80 border-amber-700/50 text-[var(--color-priority-medium,#FBBF24)]'
    };
  }
  return {
    label: 'Low',
    colorClass: 'bg-emerald-950/80 border-emerald-700/50 text-[var(--color-priority-low,#4ADE80)]'
  };
};

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  showLabel = true,
  size = 'md',
  className = ''
}) => {
  const roundedPriority = Math.max(0, Math.min(100, Math.round(priority)));
  const { label, colorClass } = getPriorityTier(roundedPriority);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3 py-1.5 font-extrabold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border numeric ${sizeClasses[size]} ${colorClass} ${className}`}
      title={`Practice Priority: ${roundedPriority}/100 (${label})`}
    >
      <span>{roundedPriority}</span>
      {showLabel && <span className="font-medium text-[0.85em] opacity-90">{label}</span>}
    </span>
  );
};
