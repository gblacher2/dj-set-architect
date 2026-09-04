import React from 'react';

export interface EnergyIndicatorProps {
  energy: number; // 1-10
  maxEnergy?: number; // default 10
  size?: 'sm' | 'md';
  showNumeric?: boolean;
  className?: string;
}

export const EnergyIndicator: React.FC<EnergyIndicatorProps> = ({
  energy,
  maxEnergy = 10,
  size = 'md',
  showNumeric = false,
  className = ''
}) => {
  const normalizedEnergy = Math.max(1, Math.min(maxEnergy, Math.round(energy)));
  const bars = Array.from({ length: maxEnergy }, (_, i) => i + 1);

  const barHeightMap = {
    sm: 'h-3 w-1',
    md: 'h-4 w-1.5'
  };

  return (
    <div
      role="meter"
      aria-label={`Energy level ${normalizedEnergy} of ${maxEnergy}`}
      aria-valuenow={normalizedEnergy}
      aria-valuemin={1}
      aria-valuemax={maxEnergy}
      className={`inline-flex items-center gap-1 ${className}`}
      title={`Energy Level: ${normalizedEnergy}/${maxEnergy}`}
    >
      <div className="flex items-end gap-0.5">
        {bars.map((barNum) => {
          const isActive = barNum <= normalizedEnergy;
          return (
            <span
              key={barNum}
              className={`${barHeightMap[size]} rounded-xs transition-colors ${
                isActive
                  ? 'bg-[var(--color-accent,#D4A843)] shadow-xs'
                  : 'bg-[var(--color-border-subtle,#2E2E34)] opacity-40'
              }`}
            />
          );
        })}
      </div>
      {showNumeric && (
        <span className="text-xs font-bold numeric text-[var(--color-text-secondary,#9A9AA0)] ml-1">
          {normalizedEnergy}
        </span>
      )}
    </div>
  );
};
