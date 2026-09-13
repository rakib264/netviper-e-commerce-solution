'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
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
import { usePathaoLocations } from '@/hooks/use-pathao-locations';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

/**
 * The way out of the failed lane.
 *
 * A consignment lands there when the address could not be resolved to Pathao
 * routing ids — a district Pathao spells differently, a town that matches two
 * zones, an address with no district at all. Two ways back: correct the
 * address and let the resolver try again, or name the city/zone/area directly
 * from Pathao's own cascade, which is always right by construction.
 */

export interface FixRoutingTarget {
  _id: string;
  courierId: string;
  receiver: { address?: string; city?: string; district?: string; division?: string };
  dispatchError?: string;
  routingErrorKey?: string;
}

export default function FixRoutingDialog({
  target,
  onClose,
  onFixed,
}: {
  target: FixRoutingTarget | null;
  onClose: () => void;
  onFixed: () => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [saving, setSaving] = useState(false);

  const locations = usePathaoLocations({
    onError: (message) =>
      toast({ title: t('admin.courier.routing.pathaoError'), description: message, variant: 'error' }),
  });

  useEffect(() => {
    if (!target) return;
    setAddress(target.receiver?.address ?? '');
    setCity(target.receiver?.city ?? '');
    setDistrict(target.receiver?.district ?? '');
    locations.reset();
    locations.loadCities();
    // Re-seeding on every `locations` identity change would refetch the city
    // list on each keystroke; the target is the only thing that should reset it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const save = async () => {
    if (!target) return;
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/courier/${target._id}/routing`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          city,
          district,
          pathaoCityId: locations.cityId ? Number(locations.cityId) : undefined,
          pathaoZoneId: locations.zoneId ? Number(locations.zoneId) : undefined,
          pathaoAreaId: locations.areaId ? Number(locations.areaId) : undefined,
          // No explicit zone picked means "resolve it again from the address".
          clearPathaoRouting: !locations.zoneId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      toast({ title: t('admin.courier.routing.saved'), variant: 'success' });
      onFixed();
      onClose();
    } catch (error) {
      toast({
        title: t('admin.courier.routing.saveError'),
        description: error instanceof Error ? error.message : undefined,
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('admin.courier.routing.title')}</DialogTitle>
          <DialogDescription>
            {target?.routingErrorKey
              ? t(target.routingErrorKey)
              : (target?.dispatchError ?? t('admin.courier.routing.subtitle'))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="fix-address">{t('admin.courier.routing.address')}</Label>
            <Input
              id="fix-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="fix-city">{t('admin.courier.routing.city')}</Label>
              <Input id="fix-city" value={city} onChange={(event) => setCity(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="fix-district">{t('admin.courier.routing.district')}</Label>
              <Input
                id="fix-district"
                value={district}
                onChange={(event) => setDistrict(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <p className="typography-caption text-hierarchy-title">
              {t('admin.courier.routing.explicitTitle')}
            </p>
            <p className="mt-1 typography-micro text-muted-foreground">
              {t('admin.courier.routing.explicitHelp')}
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Select value={locations.cityId} onValueChange={locations.selectCity}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.courier.routing.pathaoCity')} />
                </SelectTrigger>
                <SelectContent>
                  {(locations.cities ?? []).map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={locations.zoneId}
                onValueChange={locations.selectZone}
                disabled={!locations.cityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.courier.routing.pathaoZone')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.zones.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={locations.areaId}
                onValueChange={locations.selectArea}
                disabled={!locations.zoneId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.courier.routing.pathaoArea')} />
                </SelectTrigger>
                <SelectContent>
                  {locations.areas
                    .filter((option) => option.home_delivery_available)
                    .map((option) => (
                      <SelectItem key={option.area_id} value={String(option.area_id)}>
                        {option.area_name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            {locations.loading && (
              <Loader2 className="mt-2 h-3.5 w-3.5 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {t('admin.courier.routing.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
