'use client';

import type { SizeReferenceId } from '@/lib/products/types';

/**
 * Detailed, real-world-proportioned SVG glyphs for the size comparison stage.
 * Every glyph draws inside a local 0,0 → (w,h) box so the caller controls the
 * true physical scale.
 */
export function ReferenceGlyph({
  id,
  w,
  h,
}: {
  id: SizeReferenceId;
  w: number;
  h: number;
}) {
  switch (id) {
    case 'iphone': {
      const r = w * 0.15;
      const bezel = Math.max(1.4, w * 0.055);
      return (
        <g>
          <rect width={w} height={h} rx={r} fill="url(#glyphMetal)" />
          <rect
            x={bezel * 0.35}
            y={bezel * 0.35}
            width={w - bezel * 0.7}
            height={h - bezel * 0.7}
            rx={r * 0.92}
            fill="#1D1D1F"
          />
          <rect
            x={bezel}
            y={bezel}
            width={w - bezel * 2}
            height={h - bezel * 2}
            rx={r * 0.8}
            fill="url(#glyphScreen)"
          />
          <rect
            x={w * 0.36}
            y={bezel + h * 0.018}
            width={w * 0.28}
            height={Math.max(2.5, h * 0.022)}
            rx={h * 0.012}
            fill="#0B0B0D"
          />
          <rect
            x={-Math.max(1, w * 0.018)}
            y={h * 0.2}
            width={Math.max(1, w * 0.018)}
            height={h * 0.06}
            rx={1}
            fill="#8E8E93"
          />
          <rect
            x={-Math.max(1, w * 0.018)}
            y={h * 0.3}
            width={Math.max(1, w * 0.018)}
            height={h * 0.09}
            rx={1}
            fill="#8E8E93"
          />
          <rect
            x={w}
            y={h * 0.26}
            width={Math.max(1, w * 0.018)}
            height={h * 0.12}
            rx={1}
            fill="#8E8E93"
          />
        </g>
      );
    }

    case 'credit-card': {
      const r = h * 0.1;
      return (
        <g>
          <rect width={w} height={h} rx={r} fill="url(#glyphCard)" />
          <rect
            x={w * 0.08}
            y={h * 0.3}
            width={w * 0.14}
            height={h * 0.22}
            rx={h * 0.04}
            fill="#D9B65F"
          />
          <path
            d={`M ${w * 0.08} ${h * 0.41} H ${w * 0.22} M ${w * 0.15} ${h * 0.3} V ${h * 0.52}`}
            stroke="#A8863C"
            strokeWidth={Math.max(0.5, h * 0.012)}
          />
          <path
            d={`M ${w * 0.28} ${h * 0.34} a ${h * 0.09} ${h * 0.09} 0 0 1 0 ${h * 0.14}
                M ${w * 0.32} ${h * 0.3} a ${h * 0.14} ${h * 0.14} 0 0 1 0 ${h * 0.22}`}
            fill="none"
            stroke="#D9B65F"
            strokeWidth={Math.max(0.6, h * 0.018)}
            strokeLinecap="round"
          />
          <rect
            x={w * 0.08}
            y={h * 0.66}
            width={w * 0.5}
            height={h * 0.075}
            rx={h * 0.037}
            fill="#FFFFFF"
            opacity={0.45}
          />
          <rect
            x={w * 0.08}
            y={h * 0.79}
            width={w * 0.28}
            height={h * 0.06}
            rx={h * 0.03}
            fill="#FFFFFF"
            opacity={0.25}
          />
        </g>
      );
    }

    case 'wine-bottle': {
      const neck = w * 0.34;
      const nx = (w - neck) / 2;
      const shoulder = h * 0.3;
      return (
        <g>
          <path
            d={`M ${nx} ${h * 0.02}
                L ${nx} ${shoulder * 0.78}
                C ${nx} ${shoulder * 0.95} ${0} ${shoulder * 0.95} ${0} ${shoulder + h * 0.03}
                L 0 ${h - w * 0.12}
                Q 0 ${h} ${w * 0.12} ${h}
                L ${w - w * 0.12} ${h}
                Q ${w} ${h} ${w} ${h - w * 0.12}
                L ${w} ${shoulder + h * 0.03}
                C ${w} ${shoulder * 0.95} ${nx + neck} ${shoulder * 0.95} ${nx + neck} ${shoulder * 0.78}
                L ${nx + neck} ${h * 0.02} Z`}
            fill="url(#glyphGlass)"
          />
          <rect
            x={nx - w * 0.02}
            y={0}
            width={neck + w * 0.04}
            height={h * 0.09}
            rx={w * 0.03}
            fill="#4A1F27"
          />
          <rect
            x={w * 0.06}
            y={h * 0.52}
            width={w * 0.88}
            height={h * 0.26}
            rx={w * 0.03}
            fill="#F3EFE4"
          />
          <path
            d={`M ${w * 0.18} ${h * 0.6} H ${w * 0.82} M ${w * 0.24} ${h * 0.66} H ${w * 0.76} M ${w * 0.3} ${h * 0.72} H ${w * 0.7}`}
            stroke="#B9AE93"
            strokeWidth={Math.max(0.5, w * 0.025)}
            strokeLinecap="round"
          />
          <rect
            x={w * 0.12}
            y={h * 0.34}
            width={w * 0.1}
            height={h * 0.5}
            rx={w * 0.05}
            fill="#FFFFFF"
            opacity={0.22}
          />
        </g>
      );
    }

    case 'a4-paper': {
      const lines = Array.from({ length: 9 }, (_, i) => h * 0.18 + i * h * 0.075);
      return (
        <g>
          <rect width={w} height={h} rx={w * 0.012} fill="#FFFFFF" stroke="#DEDCD6" />
          {lines.map((y, i) => (
            <rect
              key={y}
              x={w * 0.12}
              y={y}
              width={w * (i % 3 === 2 ? 0.5 : 0.76)}
              height={Math.max(0.8, h * 0.008)}
              rx={h * 0.004}
              fill="#D7D4CC"
            />
          ))}
          <path d={`M ${w} ${h * 0.86} L ${w * 0.88} ${h} L ${w} ${h} Z`} fill="#EFEDE7" />
        </g>
      );
    }

    case 'laptop': {
      const r = h * 0.06;
      return (
        <g>
          <rect width={w} height={h} rx={r} fill="url(#glyphMetal)" />
          <rect
            x={w * 0.02}
            y={h * 0.04}
            width={w * 0.96}
            height={h * 0.92}
            rx={r * 0.8}
            fill="none"
            stroke="#FFFFFF"
            strokeOpacity={0.35}
          />
          <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) * 0.1} fill="#FFFFFF" opacity={0.28} />
          <rect
            x={w * 0.35}
            y={h - Math.max(1.5, h * 0.03)}
            width={w * 0.3}
            height={Math.max(1.5, h * 0.03)}
            rx={h * 0.015}
            fill="#9C9C9C"
          />
        </g>
      );
    }

    case 'water-bottle': {
      const cap = w * 0.62;
      const cx = (w - cap) / 2;
      return (
        <g>
          <rect x={cx} y={0} width={cap} height={h * 0.08} rx={w * 0.06} fill="#3E6B85" />
          <rect x={cx + w * 0.04} y={h * 0.075} width={cap - w * 0.08} height={h * 0.04} fill="#5C89A3" />
          <path
            d={`M ${cx + w * 0.02} ${h * 0.11}
                C ${cx} ${h * 0.16} ${0} ${h * 0.18} 0 ${h * 0.26}
                L 0 ${h - w * 0.18} Q 0 ${h} ${w * 0.18} ${h}
                L ${w - w * 0.18} ${h} Q ${w} ${h} ${w} ${h - w * 0.18}
                L ${w} ${h * 0.26}
                C ${w} ${h * 0.18} ${cx + cap} ${h * 0.16} ${cx + cap - w * 0.02} ${h * 0.11} Z`}
            fill="url(#glyphWater)"
          />
          <rect x={0} y={h * 0.42} width={w} height={h * 0.24} fill="#2F5C74" opacity={0.85} />
          <rect
            x={w * 0.14}
            y={h * 0.2}
            width={w * 0.12}
            height={h * 0.66}
            rx={w * 0.06}
            fill="#FFFFFF"
            opacity={0.25}
          />
        </g>
      );
    }

    case 'coffee-mug': {
      const bodyW = w * 0.78;
      return (
        <g>
          <path
            d={`M ${bodyW} ${h * 0.24} q ${w * 0.34} ${h * 0.05} ${w * 0.16} ${h * 0.26}
                q ${-w * 0.06} ${h * 0.16} ${-w * 0.16} ${h * 0.16}`}
            fill="none"
            stroke="#C9B49A"
            strokeWidth={Math.max(2, w * 0.09)}
            strokeLinecap="round"
          />
          <path
            d={`M ${w * 0.02} ${h * 0.1}
                L ${w * 0.07} ${h * 0.9} Q ${w * 0.08} ${h} ${w * 0.2} ${h}
                L ${bodyW - w * 0.12} ${h} Q ${bodyW - w * 0.02} ${h} ${bodyW - w * 0.01} ${h * 0.9}
                L ${bodyW} ${h * 0.1} Z`}
            fill="url(#glyphCeramic)"
          />
          <ellipse
            cx={(bodyW + w * 0.02) / 2}
            cy={h * 0.1}
            rx={(bodyW - w * 0.02) / 2}
            ry={h * 0.07}
            fill="#EDE6DC"
          />
          <ellipse
            cx={(bodyW + w * 0.02) / 2}
            cy={h * 0.11}
            rx={(bodyW - w * 0.02) / 2.5}
            ry={h * 0.05}
            fill="#4A3524"
          />
        </g>
      );
    }

    default:
      return <rect width={w} height={h} rx={4} fill="#D8D6D1" />;
  }
}

/** Shared gradient/filter definitions used by the glyphs and the stage */
export function GlyphDefs() {
  return (
    <defs>
      <linearGradient id="glyphMetal" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#D5D6D8" />
        <stop offset="45%" stopColor="#A9ABAF" />
        <stop offset="100%" stopColor="#7E8085" />
      </linearGradient>
      <linearGradient id="glyphScreen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3A4756" />
        <stop offset="50%" stopColor="#1B2430" />
        <stop offset="100%" stopColor="#0E141C" />
      </linearGradient>
      <linearGradient id="glyphCard" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4A4E57" />
        <stop offset="55%" stopColor="#2C2F36" />
        <stop offset="100%" stopColor="#191B20" />
      </linearGradient>
      <linearGradient id="glyphGlass" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#1F3A25" />
        <stop offset="35%" stopColor="#365C3C" />
        <stop offset="70%" stopColor="#22402A" />
        <stop offset="100%" stopColor="#152A1A" />
      </linearGradient>
      <linearGradient id="glyphWater" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#7FB0C9" />
        <stop offset="45%" stopColor="#A9CFE1" />
        <stop offset="100%" stopColor="#6E9AB2" />
      </linearGradient>
      <linearGradient id="glyphCeramic" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#F3EDE4" />
        <stop offset="60%" stopColor="#E2D7C7" />
        <stop offset="100%" stopColor="#CDBFAA" />
      </linearGradient>
      <linearGradient id="svBody" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#DAD7D0" />
        <stop offset="100%" stopColor="#C3BFB6" />
      </linearGradient>
      <linearGradient id="svBagFallback" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#3C3A36" />
        <stop offset="100%" stopColor="#1E1D1B" />
      </linearGradient>
      <radialGradient id="svStage" cx="50%" cy="35%" r="75%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="100%" stopColor="#EFEEE9" />
      </radialGradient>
      <radialGradient id="svShadow">
        <stop offset="0%" stopColor="#1A1A1A" stopOpacity={0.28} />
        <stop offset="100%" stopColor="#1A1A1A" stopOpacity={0} />
      </radialGradient>
      <marker
        id="svArrowStart"
        markerWidth="6"
        markerHeight="6"
        refX="5"
        refY="3"
        orient="auto"
      >
        <path d="M6 0 L0 3 L6 6 z" fill="#8C8A85" />
      </marker>
      <marker id="svArrowEnd" markerWidth="6" markerHeight="6" refX="1" refY="3" orient="auto">
        <path d="M0 0 L6 3 L0 6 z" fill="#8C8A85" />
      </marker>
    </defs>
  );
}

/** Miniature icon used inside the reference selector chips */
export function GlyphIcon({ id }: { id: SizeReferenceId }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.3 } as const;
  switch (id) {
    case 'iphone':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <rect x="4.5" y="1.5" width="7" height="13" rx="1.6" {...common} />
          <path d="M6.8 3.2h2.4" {...common} />
        </svg>
      );
    case 'credit-card':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <rect x="1.5" y="4" width="13" height="8" rx="1.4" {...common} />
          <path d="M1.5 7h13M3.6 9.8h3" {...common} />
        </svg>
      );
    case 'wine-bottle':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path d="M6.6 1.5h2.8v3.2c1.2.8 1.8 1.8 1.8 3v6.8H4.8V7.7c0-1.2.6-2.2 1.8-3z" {...common} />
        </svg>
      );
    case 'a4-paper':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <rect x="3" y="1.5" width="10" height="13" rx="1" {...common} />
          <path d="M5.4 5h5.2M5.4 8h5.2M5.4 11h3" {...common} />
        </svg>
      );
    case 'laptop':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <rect x="2" y="3.5" width="12" height="8" rx="1.2" {...common} />
          <path d="M1 13.5h14" {...common} />
        </svg>
      );
    case 'water-bottle':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path d="M6.4 1.5h3.2v2.2c1 .7 1.5 1.5 1.5 2.6v7.2c0 .6-.4 1-1 1H5.9c-.6 0-1-.4-1-1V6.3c0-1.1.5-1.9 1.5-2.6z" {...common} />
        </svg>
      );
    case 'coffee-mug':
      return (
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path d="M2.5 4.5h8v7a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5z" {...common} />
          <path d="M10.5 6h1.6a1.9 1.9 0 0 1 0 3.8h-1.6" {...common} />
        </svg>
      );
    default:
      return null;
  }
}
