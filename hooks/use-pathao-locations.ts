'use client';

import { useCallback, useState } from 'react';

/**
 * Pathao's city → zone → area cascade.
 *
 * Each level is only fetchable once its parent is chosen, and picking a parent
 * has to invalidate everything below it — a stale zone id from a previous city
 * is the one mistake that produces a consignment routed to the wrong place.
 * Both the coverage/price check and the test-order dialog drive the same
 * cascade, so it lives here rather than twice in the integrations panel.
 */

export interface PathaoLocationOption {
  id: number;
  name: string;
}

export interface PathaoAreaOption {
  area_id: number;
  area_name: string;
  home_delivery_available: boolean;
  pickup_available: boolean;
}

type LoadingLevel = 'cities' | 'zones' | 'areas' | null;

export function usePathaoLocations(options: { onError?: (message?: string) => void } = {}) {
  const { onError } = options;

  // `null` means "never loaded" — distinct from an empty list, which would be a
  // merchant account Pathao returned no cities for.
  const [cities, setCities] = useState<PathaoLocationOption[] | null>(null);
  const [zones, setZones] = useState<PathaoLocationOption[]>([]);
  const [areas, setAreas] = useState<PathaoAreaOption[]>([]);
  const [cityId, setCityId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [loading, setLoading] = useState<LoadingLevel>(null);

  const fail = useCallback(
    (error: unknown) => onError?.(error instanceof Error ? error.message : undefined),
    [onError],
  );

  const loadCities = useCallback(async () => {
    setLoading('cities');
    try {
      const response = await fetch('/api/admin/courier/pathao/cities', {
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setCities(
        (data.cities ?? []).map((city: any) => ({
          id: city.city_id,
          name: city.city_name,
        })),
      );
    } catch (error) {
      fail(error);
    } finally {
      setLoading(null);
    }
  }, [fail]);

  const selectCity = useCallback(
    async (value: string) => {
      setCityId(value);
      setZoneId('');
      setAreaId('');
      setZones([]);
      setAreas([]);
      setLoading('zones');
      try {
        const response = await fetch(`/api/admin/courier/pathao/zones?cityId=${value}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setZones(
          (data.zones ?? []).map((zone: any) => ({
            id: zone.zone_id,
            name: zone.zone_name,
          })),
        );
      } catch (error) {
        fail(error);
      } finally {
        setLoading(null);
      }
    },
    [fail],
  );

  const selectZone = useCallback(
    async (value: string) => {
      setZoneId(value);
      setAreaId('');
      setAreas([]);
      setLoading('areas');
      try {
        const response = await fetch(`/api/admin/courier/pathao/areas?zoneId=${value}`, {
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setAreas(data.areas ?? []);
      } catch (error) {
        fail(error);
      } finally {
        setLoading(null);
      }
    },
    [fail],
  );

  const reset = useCallback(() => {
    setCityId('');
    setZoneId('');
    setAreaId('');
    setZones([]);
    setAreas([]);
  }, []);

  const selectedArea = areas.find((area) => String(area.area_id) === areaId) ?? null;

  return {
    cities,
    zones,
    areas,
    cityId,
    zoneId,
    areaId,
    selectedArea,
    loading,
    loadCities,
    selectCity,
    selectZone,
    selectArea: setAreaId,
    reset,
  };
}
