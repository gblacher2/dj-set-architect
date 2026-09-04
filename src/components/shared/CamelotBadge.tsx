import React from 'react';

export interface CamelotBadgeProps {
  camelotKey: string;
  size?: 'sm' | 'md' | 'lg';
  showMusicalKey?: boolean;
  className?: string;
}

const CAMELOT_TO_MUSICAL: Record<string, string> = {
  '1A': 'A♭m', '1B': 'B',
  '2A': 'E♭m', '2B': 'F♯',
  '3A': 'B♭m', '3B': 'D♭',
  '4A': 'Fm',  '4B': 'A♭',
  '5A': 'Cm',  '5B': 'E♭',
  '6A': 'Gm',  '6B': 'B♭',
  '7A': 'Dm',  '7B': 'F',
  '8A': 'Am',  '8B': 'C',
  '9A': 'Em',  '9B': 'G',
  '10A': 'Bm', '10B': 'D',
  '11A': 'F♯m', '11B': 'A',
  '12A': 'C♯m', '12B': 'E'
};

// 12 Camelot Wheel chromatic hues
const CAMELOT_HUES: Record<number, { bgA: string; textA: string; bgB: string; textB: string }> = {
  1:  { bgA: 'bg-rose-950/80 border-rose-700/50',   textA: 'text-rose-300',   bgB: 'bg-rose-900/60 border-rose-500/50',   textB: 'text-rose-200' },
  2:  { bgA: 'bg-orange-950/80 border-orange-700/50', textA: 'text-orange-300', bgB: 'bg-orange-900/60 border-orange-500/50', textB: 'text-orange-200' },
  3:  { bgA: 'bg-amber-950/80 border-amber-700/50',  textA: 'text-amber-300',  bgB: 'bg-amber-900/60 border-amber-500/50',  textB: 'text-amber-200' },
  4:  { bgA: 'bg-yellow-950/80 border-yellow-700/50', textA: 'text-yellow-300', bgB: 'bg-yellow-900/60 border-yellow-500/50', textB: 'text-yellow-200' },
  5:  { bgA: 'bg-green-950/80 border-green-700/50',  textA: 'text-green-300',  bgB: 'bg-green-900/60 border-green-500/50',  textB: 'text-green-200' },
  6:  { bgA: 'bg-emerald-950/80 border-emerald-700/50', textA: 'text-emerald-300', bgB: 'bg-emerald-900/60 border-emerald-500/50', textB: 'text-emerald-200' },
  7:  { bgA: 'bg-cyan-950/80 border-cyan-700/50',   textA: 'text-cyan-300',   bgB: 'bg-cyan-900/60 border-cyan-500/50',   textB: 'text-cyan-200' },
  8:  { bgA: 'bg-sky-950/80 border-sky-700/50',    textA: 'text-sky-300',    bgB: 'bg-sky-900/60 border-sky-500/50',    textB: 'text-sky-200' },
  9:  { bgA: 'bg-blue-950/80 border-blue-700/50',   textA: 'text-blue-300',   bgB: 'bg-blue-900/60 border-blue-500/50',   textB: 'text-blue-200' },
  10: { bgA: 'bg-indigo-950/80 border-indigo-700/50', textA: 'text-indigo-300', bgB: 'bg-indigo-900/60 border-indigo-500/50', textB: 'text-indigo-200' },
  11: { bgA: 'bg-purple-950/80 border-purple-700/50', textA: 'text-purple-300', bgB: 'bg-purple-900/60 border-purple-500/50', textB: 'text-purple-200' },
  12: { bgA: 'bg-fuchsia-950/80 border-fuchsia-700/50', textA: 'text-fuchsia-300', bgB: 'bg-fuchsia-900/60 border-fuchsia-500/50', textB: 'text-fuchsia-200' }
};

export const CamelotBadge: React.FC<CamelotBadgeProps> = ({
  camelotKey,
  size = 'md',
  showMusicalKey = false,
  className = ''
}) => {
  const normalizedKey = camelotKey.trim().toUpperCase();
  const match = normalizedKey.match(/^(\d{1,2})([AB])$/);

  let num = 8;
  let letter = 'A';
  if (match) {
    num = parseInt(match[1], 10);
    letter = match[2];
  }

  const hueConfig = CAMELOT_HUES[num] || CAMELOT_HUES[8];
  const isA = letter === 'A';
  const colorStyles = isA ? `${hueConfig.bgA} ${hueConfig.textA}` : `${hueConfig.bgB} ${hueConfig.textB}`;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 font-semibold',
    md: 'text-xs px-2.5 py-1 font-bold',
    lg: 'text-sm px-3 py-1.5 font-extrabold'
  };

  const musicalKey = CAMELOT_TO_MUSICAL[normalizedKey];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border numeric ${sizeClasses[size]} ${colorStyles} ${className}`}
      title={musicalKey ? `${normalizedKey} (${musicalKey})` : normalizedKey}
    >
      <span>{normalizedKey}</span>
      {showMusicalKey && musicalKey && (
        <span className="opacity-75 text-[0.85em] font-normal">({musicalKey})</span>
      )}
    </span>
  );
};
