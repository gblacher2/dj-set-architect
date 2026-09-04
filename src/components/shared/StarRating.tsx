import React from 'react';
import { Star } from 'lucide-react';

export interface StarRatingProps {
  value?: number; // 1-5
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  value = 0,
  onChange,
  readOnly = false,
  size = 'md',
  className = ''
}) => {
  const stars = [1, 2, 3, 4, 5];

  const sizeClasses = {
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const handleKeyDown = (e: React.KeyboardEvent, star: number) => {
    if (readOnly || !onChange) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange(star);
    } else if (e.key === 'ArrowRight' && star < 5) {
      e.preventDefault();
      onChange(star + 1);
    } else if (e.key === 'ArrowLeft' && star > 1) {
      e.preventDefault();
      onChange(star - 1);
    }
  };

  return (
    <div
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={`Rating: ${value} out of 5 stars`}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {stars.map((star) => {
        const isFilled = star <= value;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            role={readOnly ? undefined : 'radio'}
            aria-checked={readOnly ? undefined : star === value}
            aria-label={`${star} Star${star > 1 ? 's' : ''}`}
            onClick={() => !readOnly && onChange?.(star)}
            onKeyDown={(e) => handleKeyDown(e, star)}
            className={`transition-transform focus:outline-none focus:ring-1 focus:ring-[var(--color-accent,#D4A843)] rounded ${
              readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            }`}
          >
            <Star
              className={`${sizeClasses[size]} ${
                isFilled
                  ? 'fill-[var(--color-accent,#D4A843)] text-[var(--color-accent,#D4A843)]'
                  : 'fill-transparent text-[var(--color-text-muted,#5C5C64)]'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
