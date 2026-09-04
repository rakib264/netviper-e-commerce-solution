'use client';

import AdvertisementBand from '@/components/home/advertisements/AdvertisementBand';
import type { HomepageSectionProps } from '@/components/home/section-props';
import type { AdvertisementDTO } from '@/lib/advertisements/types';

interface VerticalAdvertisementsProps extends HomepageSectionProps {
  initialAds?: AdvertisementDTO[] | null;
}

/** Homepage slot for the tall advertisement panels. */
export default function VerticalAdvertisements(
  props: VerticalAdvertisementsProps = {},
) {
  return <AdvertisementBand adType="vertical" {...props} />;
}
