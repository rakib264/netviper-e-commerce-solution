'use client';

import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToastWithTypes } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { Gift, Lock, Loader2, Stamp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export interface PunchCardSummary {
  id: string;
  dealId: string;
  dealName: string;
  punches: number;
  target: number;
  completedCount: number;
}

export interface MysteryBoxSummary {
  id: string;
  dealName: string;
  status: 'pending' | 'available' | 'revealed';
}

export interface RevealedBoxSummary {
  id: string;
  dealName: string;
  productName: string | null;
  productImage: string | null;
  productSlug: string | null;
}

/**
 * The visual punch card, plus any box it has earned.
 *
 * Filled stamps are the whole point of the surface, so the slots are rendered
 * literally rather than as a progress bar.
 */
export default function RewardsCard({
  punchCards,
  mysteryBoxes,
  revealedBoxes,
  onRevealed,
}: {
  punchCards: PunchCardSummary[];
  mysteryBoxes: MysteryBoxSummary[];
  revealedBoxes: RevealedBoxSummary[];
  onRevealed: () => void;
}) {
  const { t } = useTranslation();

  if (punchCards.length === 0 && mysteryBoxes.length === 0 && revealedBoxes.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-10 text-center">
          <Stamp className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">{t('profile.rewards.cardEmpty')}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('profile.rewards.cardEmptyDescription')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {punchCards.map((card) => (
        <Card
          key={card.id}
          className="rounded-2xl border border-border bg-card shadow-none hover:shadow-none"
        >
          <CardHeader className="flex-row items-center gap-3 space-y-0 border-b border-border px-5 py-4 sm:px-6">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Stamp size={15} />
            </span>
            <CardTitle className="flex flex-1 items-center justify-between gap-3 typography-card-title text-hierarchy-title">
              <span className="min-w-0 truncate">{card.dealName}</span>
              {card.completedCount > 0 && (
                <span className="shrink-0 typography-micro text-muted-foreground">
                  {t('profile.rewards.completedCount', { count: card.completedCount })}
                </span>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-3">
            <div
              className="flex flex-wrap gap-2"
              role="img"
              aria-label={t('profile.rewards.stampsProgress', {
                punches: card.punches,
                target: card.target,
              })}
            >
              {Array.from({ length: card.target }).map((_, index) => {
                const filled = index < card.punches;
                return (
                  <motion.span
                    key={index}
                    initial={false}
                    animate={{ scale: filled ? 1 : 0.94 }}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-semibold',
                      filled
                        ? 'border-primary bg-primary text-white'
                        : 'border-dashed border-border bg-muted/40 text-muted-foreground'
                    )}
                  >
                    {filled ? <Stamp className="h-4 w-4" /> : index + 1}
                  </motion.span>
                );
              })}
            </div>

            <p className="text-sm text-muted-foreground">
              {t('profile.rewards.stampsProgress', {
                punches: card.punches,
                target: card.target,
              })}
            </p>
          </CardContent>
        </Card>
      ))}

      {mysteryBoxes.map((box) => (
        <MysteryBoxCard key={box.id} box={box} onRevealed={onRevealed} />
      ))}

      {revealedBoxes.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="p-6 pb-0">
            <CardTitle className="text-base font-semibold text-foreground">
              {t('profile.rewards.pastPrizes')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 pt-4">
            <ul className="space-y-3">
              {revealedBoxes.map((box) => (
                <li key={box.id} className="flex items-center gap-3">
                  {box.productImage ? (
                    <img src={box.productImage} alt="" className="h-12 w-12 rounded object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded bg-accent">
                      <Gift className="h-5 w-5 text-muted-foreground" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {box.productName || box.dealName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{box.dealName}</p>
                  </div>
                  {box.productSlug && (
                    <Link
                      href={`/products/${box.productSlug}`}
                      className="text-xs font-medium text-primary-700 hover:underline"
                    >
                      {t('profile.rewards.viewProduct')}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MysteryBoxCard({
  box,
  onRevealed,
}: {
  box: MysteryBoxSummary;
  onRevealed: () => void;
}) {
  const { t } = useTranslation();
  const { error } = useToastWithTypes();
  const [revealing, setRevealing] = useState(false);
  const [prize, setPrize] = useState<{ name: string | null; image: string | null; slug: string | null } | null>(
    null
  );

  const locked = box.status === 'pending';

  const reveal = async () => {
    if (locked || revealing || prize) return;
    setRevealing(true);
    try {
      const res = await fetch('/api/profile/rewards/reveal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boxId: box.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        error(data.error || t('profile.rewards.revealFailed'));
        return;
      }
      setPrize({
        name: data.box.productName,
        image: data.box.productImage,
        slug: data.box.productSlug,
      });
      onRevealed();
    } catch {
      error(t('profile.rewards.revealFailed'));
    } finally {
      setRevealing(false);
    }
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border-0 shadow-xl rounded-2xl overflow-hidden">
      <CardContent className="p-6">
        <AnimatePresence mode="wait">
          {prize ? (
            <motion.div
              key="prize"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="flex items-center gap-4"
            >
              {prize.image ? (
                <img src={prize.image} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded bg-accent">
                  <Gift className="h-6 w-6 text-muted-foreground" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-success-700">
                  {t('profile.rewards.youWon')}
                </p>
                <p className="truncate text-base font-semibold text-foreground">
                  {prize.name || box.dealName}
                </p>
                {prize.slug && (
                  <Link
                    href={`/products/${prize.slug}`}
                    className="text-xs font-medium text-primary-700 hover:underline"
                  >
                    {t('profile.rewards.viewProduct')}
                  </Link>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="box"
              type="button"
              onClick={reveal}
              disabled={locked || revealing}
              whileTap={locked ? undefined : { scale: 0.97 }}
              className={cn(
                'flex w-full items-center gap-4 text-left',
                locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
              )}
            >
              <motion.span
                animate={locked ? {} : { rotate: [0, -4, 4, -3, 0] }}
                transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.7 }}
                className={cn(
                  'flex h-16 w-16 shrink-0 items-center justify-center rounded',
                  locked ? 'bg-muted' : 'bg-foreground'
                )}
              >
                {locked ? (
                  <Lock className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Gift className="h-7 w-7 text-background" />
                )}
              </motion.span>

              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-foreground">
                  {t('profile.rewards.mysteryBox')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {locked
                    ? t('profile.rewards.unlocksAfterDelivery')
                    : t('profile.rewards.tapToOpen')}
                </p>
              </div>

              {revealing && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
            </motion.button>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
