'use client';

/**
 * Neutral standing figure drawn in a normalized 84 × 320 space so it can be
 * scaled to any shopper height while keeping realistic body proportions
 * (head ≈ 1/7.5 of stature, waist at ~40%, hips at ~55%).
 */
const VB_W = 84;
const VB_H = 320;

const TORSO = `M 22 58
  C 22 50 28 46 42 46
  C 56 46 62 50 62 58
  C 64 74 60 98 56 120
  C 58 142 61 162 61 182
  L 23 182
  C 23 162 26 142 28 120
  C 24 98 20 74 22 58 Z`;

const ARM_LEFT = `M 24 60
  C 15 66 11 84 10 106
  C 9 128 11 152 13 172
  C 13.6 178 18.6 178 19 172
  C 20.4 150 21.6 122 23.6 104
  C 24.8 88 26 72 28 62 Z`;

const ARM_RIGHT = `M 60 60
  C 69 66 73 84 74 106
  C 75 128 73 152 71 172
  C 70.4 178 65.4 178 65 172
  C 63.6 150 62.4 122 60.4 104
  C 59.2 88 58 72 56 62 Z`;

const LEG_LEFT = `M 23 182
  C 22 210 24 240 25 268
  C 25.6 290 26 306 26 313
  Q 26 317 30 317 L 37 317 Q 40 317 40 313
  C 40 300 40.6 280 41 258
  C 41.4 230 41.6 206 41.6 182 Z`;

const LEG_RIGHT = `M 42.4 182
  C 42.4 206 42.6 230 43 258
  C 43.4 280 44 300 44 313
  Q 44 317 47 317 L 54 317 Q 58 317 58 313
  C 58 306 58.4 290 59 268
  C 60 240 62 210 61 182 Z`;

export default function HumanSilhouette({
  x,
  y,
  width,
  height,
  opacity = 1,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) scale(${width / VB_W} ${height / VB_H})`}
      fill="url(#svBody)"
      opacity={opacity}
    >
      <circle cx="42" cy="24" r="17" />
      <rect x="35" y="38" width="14" height="14" rx="5" />
      <path d={TORSO} />
      <path d={ARM_LEFT} />
      <path d={ARM_RIGHT} />
      <path d={LEG_LEFT} />
      <path d={LEG_RIGHT} />
    </g>
  );
}

/** Normalized shoulder anchor, used to attach the bag strap */
export const SHOULDER_ANCHOR = { x: 60 / VB_W, y: 58 / VB_H };
