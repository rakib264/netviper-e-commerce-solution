'use client';

import AdvertisementBand from '@/components/home/advertisements/AdvertisementBand';
import type { HomepageSectionProps } from '@/components/home/section-props';
import type { AdvertisementDTO } from '@/lib/advertisements/types';

interface HorizontalAdvertisementsProps extends HomepageSectionProps {
  initialAds?: AdvertisementDTO[] | null;
}

/** Homepage slot for the wide advertisement band. */
export default function HorizontalAdvertisements(
  props: HorizontalAdvertisementsProps = {},
) {
  return <AdvertisementBand adType="horizontal" {...props} />;
}
