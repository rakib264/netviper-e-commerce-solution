'use client';

import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import SizeVisualizer from '@/components/products/SizeVisualizer';
import { hasAnyDimension } from '@/lib/products/measurements';
import {
  SIZE_REFERENCE_OBJECTS,
} from '@/lib/products/size-visualizer';
import type { SizeReferenceId, SizeVisualizerConfig } from '@/lib/products/types';

interface SizeVisualizerConfigFormProps {
  value: SizeVisualizerConfig;
  onChange: (value: SizeVisualizerConfig) => void;
  dimensions: { length: string; width: string; height: string };
  productName?: string;
  productImage?: string;
}

const defaultConfig = (): SizeVisualizerConfig => ({
  enabled: false,
  referenceObjectIds: ['iphone', 'credit-card', 'wine-bottle'],
  bodySilhouetteEnabled: true,
  defaultReferenceId: 'iphone',
  unit: 'cm',
  wearStyle: 'shoulder',
});

const WEAR_STYLES: Array<{ id: NonNullable<SizeVisualizerConfig['wearStyle']>; label: string }> = [
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'crossbody', label: 'Crossbody' },
  { id: 'handheld', label: 'Handheld' },
];

export default function SizeVisualizerConfigForm({
  value,
  onChange,
  dimensions,
  productName = 'Product',
  productImage,
}: SizeVisualizerConfigFormProps) {
  const config = {
    ...defaultConfig(),
    ...value,
    referenceObjectIds: value?.referenceObjectIds?.length
      ? value.referenceObjectIds
      : defaultConfig().referenceObjectIds,
  };

  const toggleRef = (id: SizeReferenceId, checked: boolean) => {
    let ids = [...config.referenceObjectIds];
    if (checked) {
      if (ids.length >= 3) return;
      ids = [...ids, id];
    } else {
      ids = ids.filter((x) => x !== id);
    }
    onChange({
      ...config,
      referenceObjectIds: ids,
      defaultReferenceId: ids.includes(config.defaultReferenceId as SizeReferenceId)
        ? config.defaultReferenceId
        : ids[0],
    });
  };

  const hasDimensions = hasAnyDimension(dimensions);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <div>
          <p className="text-sm font-medium text-foreground">Enable Size & Fit Visualizer</p>
          <p className="text-xs text-subtle-foreground">
            Interactive comparison widget on the product page (replaces size image)
          </p>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(enabled) => onChange({ ...config, enabled })}
        />
      </div>

      {config.enabled ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Measurement unit</Label>
              <p className="text-xs text-subtle-foreground">
                Unit assumed for measurements typed without a suffix. Values like
                <span className="mx-1 font-mono">10.25&quot;</span>
                or <span className="mx-1 font-mono">26cm</span> always win.
              </p>
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {(['cm', 'in'] as const).map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => onChange({ ...config, unit: u })}
                    className={`px-3 py-1.5 text-sm uppercase ${
                      (config.unit || 'cm') === u
                        ? 'bg-foreground text-white'
                        : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">Carry style</Label>
              <p className="text-xs text-subtle-foreground">
                Where the product sits on the figure in body mode
              </p>
              <div className="inline-flex overflow-hidden rounded-md border border-border">
                {WEAR_STYLES.map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => onChange({ ...config, wearStyle: style.id })}
                    className={`px-3 py-1.5 text-sm ${
                      (config.wearStyle || 'shoulder') === style.id
                        ? 'bg-foreground text-white'
                        : 'bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Reference objects (pick 1–3)
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {SIZE_REFERENCE_OBJECTS.map((obj) => {
                const checked = config.referenceObjectIds.includes(obj.id);
                const disabled =
                  !checked && config.referenceObjectIds.length >= 3;
                return (
                  <label
                    key={obj.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 ${
                      checked ? 'border-foreground bg-muted' : 'border-border'
                    } ${disabled ? 'opacity-50' : ''}`}
                  >
                    <Checkbox
                      checked={checked}
                      disabled={disabled}
                      onCheckedChange={(c) => toggleRef(obj.id, Boolean(c))}
                    />
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {obj.label}
                      </span>
                      <span className="block text-xs font-caption text-subtle-foreground">
                        {obj.widthCm}×{obj.heightCm} cm · {obj.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
            <div>
              <p className="text-sm font-medium text-foreground">Body silhouette mode</p>
              <p className="text-xs text-subtle-foreground">
                Let shoppers enter their height to see how the bag sits when worn
              </p>
            </div>
            <Switch
              checked={config.bodySilhouetteEnabled}
              onCheckedChange={(bodySilhouetteEnabled) =>
                onChange({ ...config, bodySilhouetteEnabled })
              }
            />
          </div>

          {!hasDimensions ? (
            <p className="text-sm text-warning-600">
              Enter length, width, and height in Measurements (e.g. 10.25&quot;) to preview the visualizer.
            </p>
          ) : (
            <div className="rounded-lg border border-border bg-background p-4">
              <p className="mb-3 text-xs uppercase tracking-[0.1em] text-subtle-foreground">
                Live preview
              </p>
              <SizeVisualizer
                productName={productName}
                dimensions={dimensions}
                config={config}
                productImage={productImage}
                compact
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
