'use client';

import { Star } from 'lucide-react';

interface StarRatingProps {
  value: number;
  size?: number;
  className?: string;
  /** Renders a partially filled star for fractional averages */
  precise?: boolean;
}

export default function StarRating({
  value,
  size = 14,
  className = '',
  precise = false,
}: StarRatingProps) {
  const rating = Math.max(0, Math.min(5, value || 0));

  return (
    <span
      className={`inline-flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = precise
          ? Math.max(0, Math.min(1, rating - index))
          : rating - index >= 0.5
            ? 1
            : 0;
        return (
          <span
            key={index}
            className="relative inline-block"
            style={{ width: size, height: size }}
          >
            <Star
              className="absolute inset-0 text-subtle-foreground"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            {fill > 0 ? (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${fill * 100}%` }}
              >
                <Star
                  className="fill-foreground text-foreground"
                  style={{ width: size, height: size }}
                  strokeWidth={1.5}
                />
              </span>
            ) : null}
          </span>
        );
      })}
    </span>
  );
}
