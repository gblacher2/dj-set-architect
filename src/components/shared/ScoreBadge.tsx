import React from 'react';

export interface ScoreBadgeProps {
  score: number; // 0-100
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const getScoreQualityTier = (score: number) => {
  if (score >= 80) {
    return {
      label: 'Smooth',
      colorClass: 'bg-emerald-950/80 border-emerald-700/50 text-[var(--color-quality-good,#4ADE80)]'
    };
  }
  if (score >= 60) {
    return {
      label: 'Acceptable',
      colorClass: 'bg-amber-950/80 border-amber-700/50 text-[var(--color-quality-ok,#FBBF24)]'
    };
  }
  if (score >= 40) {
    return {
      label: 'Watch',
      colorClass: 'bg-orange-950/80 border-orange-700/50 text-[var(--color-quality-caution,#FB923C)]'
    };
  }
  return {
    label: 'Risky',
    colorClass: 'bg-red-950/80 border-red-700/50 text-[var(--color-quality-warning,#F87171)]'
  };
};

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  showLabel = true,
  size = 'md',
  className = ''
}) => {
  const roundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const { label, colorClass } = getScoreQualityTier(roundedScore);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3 py-1.5 font-extrabold'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border numeric ${sizeClasses[size]} ${colorClass} ${className}`}
      title={`Transition Quality Score: ${roundedScore}/100 (${label})`}
    >
      <span>{roundedScore}</span>
      {showLabel && <span className="font-medium text-[0.85em] opacity-90">{label}</span>}
    </span>
  );
};
