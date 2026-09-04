'use client';

import { getLocaleMeta, type Locale } from '@/lib/i18n/config';
import { cn } from '@/lib/utils';
import { useId } from 'react';

/**
 * Flag for a locale, drawn inline as SVG.
 *
 * Inline rather than emoji or an image: emoji flags do not render on Windows at
 * all, and an <img> would be a network request per header. Every flag is drawn
 * on its own true aspect ratio and then scaled into one shared box, so a row of
 * them lines up regardless of whether the source ratio is 3:2, 5:3 or 10:6.
 */

interface LocaleFlagProps {
  locale: Locale | string;
  className?: string;
}

/** Union Flag, built on the canonical 60×30 grid. */
function FlagGB({ uid }: { uid: string }) {
  return (
    <svg viewBox="0 0 60 30" className="h-full w-full" aria-hidden focusable="false">
      <clipPath id={`${uid}-frame`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${uid}-quarters`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${uid}-frame)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFFFFF" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${uid}-quarters)`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#FFFFFF" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  );
}

/** Bangladesh: disc offset toward the hoist so it looks centred when flying. */
function FlagBD() {
  return (
    <svg viewBox="0 0 10 6" className="h-full w-full" aria-hidden focusable="false">
      <rect width="10" height="6" fill="#006A4E" />
      <circle cx="4.5" cy="3" r="2" fill="#F42A41" />
    </svg>
  );
}

function FlagDE() {
  return (
    <svg viewBox="0 0 5 3" className="h-full w-full" aria-hidden focusable="false">
      <rect width="5" height="1" y="0" fill="#000000" />
      <rect width="5" height="1" y="1" fill="#DD0000" />
      <rect width="5" height="1" y="2" fill="#FFCE00" />
    </svg>
  );
}

export function LocaleFlag({ locale, className }: LocaleFlagProps) {
  // Unique per instance: two elements sharing a clipPath id is invalid markup,
  // and the sanitiser keeps React's generated id usable inside url(#…).
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const meta = getLocaleMeta(locale);

  return (
    <span
      className={cn(
        // One fixed box for every flag, with a hairline edge so a light flag
        // still reads as a flag against a white header.
        'relative inline-block h-[13px] w-[19px] shrink-0 overflow-hidden rounded-[2px]',
        'shadow-[inset_0_0_0_1px_rgba(0,0,0,0.14)]',
        className,
      )}
      role="img"
      aria-label={meta.label}
    >
      {meta.code === 'bn' ? <FlagBD /> : meta.code === 'de' ? <FlagDE /> : <FlagGB uid={uid} />}
    </span>
  );
}
