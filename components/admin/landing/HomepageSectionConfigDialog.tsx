'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type {
  ConfigField,
  HomepageSectionConfig,
  HomepageSectionMeta,
  HomepageSectionSettings,
} from '@/lib/landing/homepage-sections';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Loader } from '@/components/ui/loader';

interface HomepageSectionConfigDialogProps {
  section: HomepageSectionConfig | null;
  meta?: HomepageSectionMeta;
  saving?: boolean;
  onClose: () => void;
  onSave: (settings: HomepageSectionSettings) => Promise<void> | void;
}

/**
 * Deep-customisation panel for one section.
 *
 * The form is generated from the section's `configFields` descriptors, so adding
 * an option means adding one entry to the registry — no change here.
 */
export function HomepageSectionConfigDialog({
  section,
  meta,
  saving = false,
  onClose,
  onSave,
}: HomepageSectionConfigDialogProps) {
  const [draft, setDraft] = useState<HomepageSectionSettings>({});

  useEffect(() => {
    setDraft(section ? { ...section.settings } : {});
  }, [section]);

  if (!section || !meta) return null;

  const setValue = (key: string, value: string | number | boolean) =>
    setDraft((previous) => ({ ...previous, [key]: value }));

  const renderField = (field: ConfigField) => {
    const value = draft[field.key] ?? field.defaultValue;

    if (field.type === 'boolean') {
      return (
        <div
          key={field.key}
          className="flex items-start justify-between gap-4 rounded-lg border border-border p-3"
        >
          <div className="min-w-0">
            <Label className="font-label">{field.label}</Label>
            {field.help ? (
              <p className="mt-0.5 font-caption text-xs text-muted-foreground">
                {field.help}
              </p>
            ) : null}
          </div>
          <Switch
            checked={Boolean(value)}
            onCheckedChange={(checked) => setValue(field.key, checked)}
          />
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key} className="space-y-1.5">
          <Label className="font-label">{field.label}</Label>
          <Select
            value={String(value)}
            onValueChange={(next) => setValue(field.key, next)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Choose ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.help ? (
            <p className="font-caption text-xs text-muted-foreground">{field.help}</p>
          ) : null}
        </div>
      );
    }

    return (
      <div key={field.key} className="space-y-1.5">
        <Label className="font-label">{field.label}</Label>
        <Input
          type={field.type === 'number' ? 'number' : 'text'}
          value={String(value)}
          min={field.min}
          max={field.max}
          onChange={(event) =>
            setValue(
              field.key,
              field.type === 'number'
                ? Number(event.target.value)
                : event.target.value,
            )
          }
        />
        {field.help ? (
          <p className="font-caption text-xs text-muted-foreground">{field.help}</p>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Configure {meta.label}</DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {meta.configFields.length > 0 ? (
            meta.configFields.map(renderField)
          ) : (
            <p className="font-paragraph text-sm text-muted-foreground">
              This section has no inline options yet.
              {meta.manageHref
                ? ' Its content is managed on a dedicated screen.'
                : ' Add entries to its `configFields` in lib/landing/homepage-sections.ts to expose controls here.'}
            </p>
          )}

          {meta.manageHref ? (
            <Link
              href={meta.manageHref}
              className="inline-flex items-center gap-1.5 font-navigation text-sm text-foreground underline-offset-4 hover:underline"
            >
              Manage {meta.label.toLowerCase()} content
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => onSave(draft)} disabled={saving}>
            {saving ? <Loader size="sm" label={null} className="mr-2" /> : null}
            Save settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default HomepageSectionConfigDialog;
