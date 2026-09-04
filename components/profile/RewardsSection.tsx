'use client';

import PointsWallet, { type PointsSummary } from '@/components/profile/PointsWallet';
import RewardsCard, {
  type MysteryBoxSummary,
  type PunchCardSummary,
  type RevealedBoxSummary,
} from '@/components/profile/RewardsCard';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Loader } from '@/components/ui/loader';
import { useCallback, useEffect, useState } from 'react';

interface RewardsPayload {
  points: PointsSummary;
  punchCards: PunchCardSummary[];
  mysteryBoxes: MysteryBoxSummary[];
  revealedBoxes: RevealedBoxSummary[];
}

/** The profile's Rewards tab: points wallet above, punch cards below. */
export default function RewardsSection() {
  const { t } = useTranslation();
  const [data, setData] = useState<RewardsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/rewards');
      if (!res.ok) throw new Error();
      setData(await res.json());
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader />
      </div>
    );
  }

  if (failed || !data) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        {t('profile.rewards.loadFailed')}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <PointsWallet points={data.points} onClaimed={load} />
      <RewardsCard
        punchCards={data.punchCards}
        mysteryBoxes={data.mysteryBoxes}
        revealedBoxes={data.revealedBoxes}
        onRevealed={load}
      />
    </div>
  );
}
