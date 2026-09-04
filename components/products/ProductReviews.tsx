'use client';

import StarRating from '@/components/products/StarRating';
import { Loader2, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

export interface ProductReview {
  _id?: string;
  rating: number;
  title?: string;
  comment: string;
  verified?: boolean;
  helpful?: number;
  notHelpful?: number;
  createdAt: string;
  user?: { firstName?: string; lastName?: string } | string | null;
}

interface ProductReviewsProps {
  productSlug: string;
  initialReviews?: ProductReview[];
  initialAverage?: number;
  initialTotal?: number;
}

const PAGE_SIZE = 5;
const VOTED_KEY = 'reviewHelpfulVotes';

function reviewerName(user: ProductReview['user']): string {
  if (!user || typeof user === 'string') return 'Verified Shopper';
  const first = user.firstName?.trim() || '';
  const last = user.lastName?.trim() || '';
  if (!first && !last) return 'Verified Shopper';
  return `${first}${last ? ` ${last.charAt(0)}.` : ''}`.trim();
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function readVoted(): Record<string, 'up' | 'down'> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(window.localStorage.getItem(VOTED_KEY) || '{}');
  } catch {
    return {};
  }
}

export default function ProductReviews({
  productSlug,
  initialReviews = [],
  initialAverage = 0,
  initialTotal = 0,
}: ProductReviewsProps) {
  const { t, tPlural } = useTranslation();
  const { data: session } = useSession();
  const pathname = usePathname();

  const [reviews, setReviews] = useState<ProductReview[]>(initialReviews);
  const [average, setAverage] = useState(initialAverage);
  const [total, setTotal] = useState(initialTotal);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [voted, setVoted] = useState<Record<string, 'up' | 'down'>>({});

  useEffect(() => {
    setVoted(readVoted());
  }, []);

  const loadReviews = useCallback(async () => {
    try {
      const response = await fetch(`/api/products/${productSlug}/reviews`, {
        cache: 'no-store',
      });
      const data = await response.json();
      if (response.ok) {
        setReviews(data.reviews || []);
        setAverage(data.averageRating || 0);
        setTotal(data.totalReviews || 0);
      }
    } catch {
      // Keep whatever came with the product payload.
    }
  }, [productSlug]);

  const distribution = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach((review) => {
      const star = Math.min(5, Math.max(1, Math.round(review.rating)));
      counts[star] += 1;
    });
    return counts;
  }, [reviews]);

  const submitReview = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (rating < 1) {
      setError(t('products.productReviews.messages.pleaseSelectAStarRating'));
      return;
    }
    if (comment.trim().length < 10) {
      setError(t('products.productReviews.messages.pleaseWriteAtLeast10Characters'));
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/products/${productSlug}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, title: title.trim(), comment: comment.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || t('products.productReviews.messages.couldNotSubmitYourReview'));
        return;
      }
      setSuccess('Thank you — your review has been published.');
      setFormOpen(false);
      setRating(0);
      setTitle('');
      setComment('');
      await loadReviews();
    } catch {
      setError(t('products.productReviews.messages.couldNotSubmitYourReviewPlease'));
    } finally {
      setSubmitting(false);
    }
  };

  const voteHelpful = async (reviewId: string | undefined, vote: 'up' | 'down') => {
    if (!reviewId || voted[reviewId]) return;

    const next = { ...voted, [reviewId]: vote };
    setVoted(next);
    try {
      window.localStorage.setItem(VOTED_KEY, JSON.stringify(next));
    } catch {
      // Non-critical.
    }

    setReviews((current) =>
      current.map((review) =>
        review._id === reviewId
          ? {
              ...review,
              helpful: (review.helpful || 0) + (vote === 'up' ? 1 : 0),
              notHelpful: (review.notHelpful || 0) + (vote === 'down' ? 1 : 0),
            }
          : review,
      ),
    );

    try {
      await fetch(`/api/products/${productSlug}/reviews/helpful`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewId, vote }),
      });
    } catch {
      // Optimistic update stands; the count re-syncs on next load.
    }
  };

  const shown = reviews.slice(0, visible);

  return (
    <section id="reviews" className="border-t border-border pt-12">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-2xl tracking-tight text-foreground md:text-3xl">
          {t('products.productReviews.reviews')}
        </h2>

        <div className="mt-4 flex flex-col items-center gap-1">
          <StarRating value={average} size={20} precise />
          <p className="text-xs uppercase tracking-[0.1em] text-subtle-foreground">
            {average ? average.toFixed(1) : '0.0'} · {total} {total === 1 ? 'review' : 'reviews'}
          </p>
        </div>

        {total > 0 ? (
          <div className="mx-auto mt-6 max-w-xs space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] || 0;
              const pct = total ? Math.round((count / total) * 100) : 0;
              return (
                <div key={star} className="flex items-center gap-2 text-[11px] text-subtle-foreground">
                  <span className="w-3 text-right text-muted-foreground">{star}</span>
                  <div className="h-1 flex-1 overflow-hidden bg-accent">
                    <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-6 text-left">{count}</span>
                </div>
              );
            })}
          </div>
        ) : null}

        <div className="mt-10">
          <h3 className="font-subtitle text-xl text-foreground">{t('products.productReviews.shareYourThoughts')}</h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {t('products.productReviews.ifYouVeUsedThisProduct')}
          </p>

          {success ? (
            <p className="mt-4 text-sm text-success-700">{success}</p>
          ) : null}

          {!formOpen ? (
            session?.user ? (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="mt-5 inline-flex h-11 items-center justify-center border border-foreground px-8 text-xs font-button uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-primary hover:text-white"
              >
                {t('products.productReviews.writeAReview')}
              </button>
            ) : (
              <Link
                href={`/auth/signin?callbackUrl=${encodeURIComponent(pathname || '/')}`}
                className="mt-5 inline-flex h-11 items-center justify-center border border-foreground px-8 text-xs font-button uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-primary hover:text-white"
              >
                {t('products.productReviews.signInToReview')}
              </Link>
            )
          ) : null}
        </div>
      </div>

      {formOpen ? (
        <form
          onSubmit={submitReview}
          className="mx-auto mt-8 max-w-2xl space-y-4 border border-border p-6"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.1em] text-subtle-foreground">{t('products.productReviews.yourRating')}</p>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={tPlural('common.starRating', star)}
                  className="p-0.5"
                >
                  <StarRating value={(hoverRating || rating) >= star ? 1 : 0} size={22} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="review-title"
              className="text-xs font-label uppercase tracking-[0.1em] text-subtle-foreground"
            >
              {t('products.productReviews.titleOptional')}
            </label>
            <input
              id="review-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              className="mt-2 h-11 w-full border border-border px-3 text-sm font-paragraph outline-none focus:border-foreground"
              placeholder={t('products.productReviews.sumUpYourExperience')}
            />
          </div>

          <div>
            <label
              htmlFor="review-comment"
              className="text-xs font-label uppercase tracking-[0.1em] text-subtle-foreground"
            >
              {t('products.productReviews.yourReview')}
            </label>
            <textarea
              id="review-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={5}
              className="mt-2 w-full resize-y border border-border p-3 text-sm font-paragraph outline-none focus:border-foreground"
              placeholder={t('products.productReviews.whatDidYouLikeOrDislike')}
            />
          </div>

          {error ? <p className="text-sm text-destructive-600">{error}</p> : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center gap-2 bg-primary px-8 text-xs font-button uppercase tracking-[0.12em] text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('products.productReviews.submitReview')}
            </button>
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="inline-flex h-11 items-center justify-center border border-border px-6 text-xs font-button uppercase tracking-[0.12em] text-muted-foreground hover:bg-muted"
            >
              {t('products.productReviews.cancel')}
            </button>
          </div>
        </form>
      ) : null}

      {shown.length ? (
        <div className="mt-12 border-t border-border">
          {shown.map((review, index) => (
            <article
              key={review._id || `${review.createdAt}-${index}`}
              className="grid gap-3 border-b border-border py-7 md:grid-cols-[220px_1fr] md:gap-10"
            >
              <div className="space-y-1">
                <StarRating value={review.rating} size={13} />
                <p className="text-xs text-subtle-foreground">{formatDate(review.createdAt)}</p>
                <p className="text-xs text-muted-foreground">{reviewerName(review.user)}</p>
                {review.verified ? (
                  <p className="text-[10px] uppercase tracking-[0.1em] text-subtle-foreground">
                    {t('products.productReviews.verifiedPurchase')}
                  </p>
                ) : null}
              </div>

              <div>
                {review.title ? (
                  <h4 className="text-sm font-title text-foreground">{review.title}</h4>
                ) : null}
                <p className="mt-1 text-sm font-paragraph leading-relaxed text-muted-foreground">{review.comment}</p>

                <div className="mt-3 flex items-center gap-4 text-xs font-caption text-subtle-foreground">
                  <span>{t('products.productReviews.wasThisHelpful')}</span>
                  <button
                    type="button"
                    onClick={() => voteHelpful(review._id, 'up')}
                    disabled={Boolean(review._id && voted[review._id])}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-60"
                    aria-label={t('products.productReviews.markReviewAsHelpful')}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                    {review.helpful || 0}
                  </button>
                  <button
                    type="button"
                    onClick={() => voteHelpful(review._id, 'down')}
                    disabled={Boolean(review._id && voted[review._id])}
                    className="inline-flex items-center gap-1 transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-60"
                    aria-label={t('products.productReviews.markReviewAsNotHelpful')}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                    {review.notHelpful || 0}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {visible < reviews.length ? (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="inline-flex h-11 items-center justify-center border border-foreground px-8 text-xs font-button uppercase tracking-[0.12em] text-foreground transition-colors hover:bg-primary hover:text-white"
              >
                {t('products.productReviews.readMoreReviews')}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-10 text-center text-sm text-subtle-foreground">
          {t('products.productReviews.noReviewsYetBeTheFirst')}
        </p>
      )}
    </section>
  );
}
