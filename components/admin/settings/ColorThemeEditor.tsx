'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Label } from '@/components/ui/label';
import {
  COLOR_PRESET_LIST,
  applyColorPreset,
  resolveColors,
  type ColorSettings,
} from '@/lib/theme/colors';
import { cn } from '@/lib/utils';
import { AlertTriangle, Check, Palette, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';
import { formatCurrency } from '@/lib/currency/format';

interface ColorThemeEditorProps {
  value: ColorSettings;
  onChange: (next: ColorSettings) => void;
}

/** Tokens worth surfacing in the preview — the ones a brand owner recognises. */
const PREVIEW_SWATCHES: Array<{ token: string; label: string }> = [
  { token: '--background', label: 'Background' },
  { token: '--foreground', label: 'Foreground' },
  { token: '--card', label: 'Card' },
  { token: '--muted', label: 'Muted' },
  { token: '--muted-foreground', label: 'Muted text' },
  { token: '--primary', label: 'Primary' },
  { token: '--secondary', label: 'Secondary' },
  { token: '--accent', label: 'Accent' },
  { token: '--border', label: 'Border' },
  { token: '--ring', label: 'Ring' },
  { token: '--destructive', label: 'Destructive' },
  { token: '--success', label: 'Success' },
  { token: '--warning', label: 'Warning' },
  { token: '--info', label: 'Info' },
];

const CHART_TOKENS = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

export function ColorThemeEditor({ value, onChange }: ColorThemeEditorProps) {
  // Pure derivation, so the preview updates on every keystroke without a round-trip.
  const resolved = useMemo(() => resolveColors(value), [value]);
  const failures = resolved.contrast.filter((check) => !check.passes);

  const selectPreset = (presetId: string) => {
    const next = applyColorPreset(presetId);
    if (next) onChange(next);
  };

  const setColor = (key: 'primaryColor' | 'secondaryColor', color: string) => {
    // Editing a colour by hand detaches the selection from its preset.
    onChange({ ...value, [key]: color, presetId: null });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette size={20} />
          <span>Colour Theme</span>
        </CardTitle>
        <p className="font-paragraph text-sm text-muted-foreground">
          Every surface, text, border, state and chart colour is derived from these two
          values. Pick a preset or choose your own — the whole storefront and admin
          re-theme together.
        </p>
      </CardHeader>

      <CardContent className="space-y-8">
        {/* ── Presets ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <Label>Curated palettes</Label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {COLOR_PRESET_LIST.map((preset) => {
              const active = value.presetId === preset.id;
              const swatches = resolveColors({ presetId: preset.id }).lightHex;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  aria-pressed={active}
                  className={cn(
                    'group rounded-lg border p-3 text-left transition-all',
                    active
                      ? 'border-ring ring-2 ring-ring/30'
                      : 'border-border hover:border-ring/60',
                  )}
                >
                  <div className="mb-2.5 flex h-9 overflow-hidden rounded-md">
                    {[
                      swatches['--primary'],
                      swatches['--secondary'],
                      swatches['--accent'],
                      swatches['--muted'],
                      swatches['--background'],
                    ].map((color, index) => (
                      <span
                        key={index}
                        className="flex-1"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-title text-sm text-foreground">{preset.name}</span>
                    {active ? <Check size={14} className="shrink-0 text-ring" /> : null}
                  </div>
                  <span className="font-caption text-xs text-muted-foreground">
                    {preset.useCase}
                  </span>
                  <p className="mt-1 font-caption text-xs leading-snug text-muted-foreground/80">
                    {preset.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Brand colours ───────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>Brand colours</Label>
            <div className="flex items-center gap-2">
              {value.presetId ? (
                <Badge variant="subtle">Preset: {value.presetId}</Badge>
              ) : (
                <Badge variant="outline">Custom</Badge>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => selectPreset(COLOR_PRESET_LIST[0].id)}
              >
                <RotateCcw size={14} className="mr-1.5" />
                Reset
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ColorPicker
              color={value.primaryColor}
              onChange={(color) => setColor('primaryColor', color)}
              label="Primary Colour"
            />
            <ColorPicker
              color={value.secondaryColor}
              onChange={(color) => setColor('secondaryColor', color)}
              label="Secondary Colour"
            />
          </div>
        </div>

        {/* ── Derived palette ─────────────────────────────────────────── */}
        <div className="space-y-3">
          <Label>Derived palette</Label>
          {(
            [
              ['Light', resolved.lightHex],
              ['Dark', resolved.darkHex],
            ] as const
          ).map(([appearance, palette]) => (
            <div key={appearance} className="rounded-lg border border-border p-3">
              <p className="mb-2.5 font-label text-xs uppercase tracking-wider text-muted-foreground">
                {appearance}
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {PREVIEW_SWATCHES.map(({ token, label }) => (
                  <div key={token} className="min-w-0">
                    <span
                      className="block h-9 rounded border border-border"
                      style={{ backgroundColor: palette[token] }}
                      title={`${token}: ${palette[token]}`}
                    />
                    <span className="mt-1 block truncate font-caption text-[11px] text-muted-foreground">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="font-caption text-[11px] text-muted-foreground">Charts</span>
                <div className="flex flex-1 gap-1.5">
                  {CHART_TOKENS.map((token) => (
                    <span
                      key={token}
                      className="h-5 flex-1 rounded"
                      style={{ backgroundColor: palette[token] }}
                      title={`${token}: ${palette[token]}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Accessibility ───────────────────────────────────────────── */}
        <div
          className={cn(
            'flex items-start gap-2.5 rounded-lg border p-3',
            failures.length
              ? 'border-warning/40 bg-warning/10'
              : 'border-success/40 bg-success/10',
          )}
        >
          {failures.length ? (
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning-700" />
          ) : (
            <Check size={16} className="mt-0.5 shrink-0 text-success-700" />
          )}
          <div className="min-w-0 font-paragraph text-sm">
            {failures.length ? (
              <>
                <p className="text-foreground">
                  {failures.length} of {resolved.contrast.length} contrast checks need
                  attention.
                </p>
                <ul className="mt-1 space-y-0.5 font-caption text-xs text-muted-foreground">
                  {failures.slice(0, 6).map((check) => (
                    <li key={`${check.token}-${check.against}`}>
                      {check.token} on {check.against}: {check.ratio}:1 (needs{' '}
                      {check.required}:1)
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-foreground">
                All {resolved.contrast.length} contrast checks pass WCAG AA across light
                and dark.
              </p>
            )}
          </div>
        </div>

        {/* ── Live component preview ──────────────────────────────────── */}
        <div className="space-y-3">
          <Label>Component preview</Label>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {(
              [
                ['Light', resolved.lightHex],
                ['Dark', resolved.darkHex],
              ] as const
            ).map(([appearance, palette]) => (
              <div
                key={appearance}
                className="rounded-lg border p-4"
                style={{
                  backgroundColor: palette['--background'],
                  borderColor: palette['--border'],
                  color: palette['--foreground'],
                }}
              >
                <p
                  className="font-label text-[11px] uppercase tracking-wider"
                  style={{ color: palette['--muted-foreground'] }}
                >
                  {appearance}
                </p>
                <div
                  className="mt-2 rounded-md border p-3"
                  style={{
                    backgroundColor: palette['--card'],
                    borderColor: palette['--border'],
                  }}
                >
                  <p className="font-title text-sm">Wide-strap leather tote</p>
                  <p className="font-price mt-0.5 text-sm">{formatCurrency(249)}</p>
                  <p
                    className="font-caption mt-1 text-xs"
                    style={{ color: palette['--muted-foreground'] }}
                  >
                    Full-grain, vegetable tanned
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="font-button rounded-md px-3 py-1.5 text-xs"
                      style={{
                        backgroundColor: palette['--primary'],
                        color: palette['--primary-foreground'],
                      }}
                    >
                      Add to basket
                    </span>
                    <span
                      className="font-button rounded-md px-3 py-1.5 text-xs"
                      style={{
                        backgroundColor: palette['--secondary'],
                        color: palette['--secondary-foreground'],
                      }}
                    >
                      Wishlist
                    </span>
                    <span
                      className="font-label rounded-full px-2 py-0.5 text-[10px]"
                      style={{
                        backgroundColor: palette['--accent'],
                        color: palette['--accent-foreground'],
                      }}
                    >
                      New
                    </span>
                    <span
                      className="font-label rounded-full px-2 py-0.5 text-[10px]"
                      style={{
                        backgroundColor: palette['--destructive'],
                        color: palette['--destructive-foreground'],
                      }}
                    >
                      Low stock
                    </span>
                  </div>
                  <span
                    className="font-paragraph mt-3 block rounded-md border px-2.5 py-1.5 text-xs"
                    style={{
                      backgroundColor: palette['--input'],
                      borderColor: palette['--border'],
                      color: palette['--muted-foreground'],
                    }}
                  >
                    Search the collection…
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ColorThemeEditor;
