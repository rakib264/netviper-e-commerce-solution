'use client';

import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

interface AdMediaProps {
  mediaType: 'image' | 'video';
  /** Bunny CDN URL of the asset that fills the card. */
  url: string;
  /** Still frame: the video poster, and the fallback if playback fails. */
  poster?: string;
  alt: string;
  /** Responsive `sizes` hint for the image path. */
  sizes: string;
  /** Only the first card in the first band above the fold should preload. */
  priority?: boolean;
  /** Admin switch — off keeps the poster still and skips the video download. */
  autoplay?: boolean;
  className?: string;
}

/** Shared motion so the poster fade, the video fade and the hover drift agree. */
const EASE = 'transition-[transform,opacity] duration-700 ease-out';

/**
 * True when the visitor has asked for less motion or less data. Both are
 * reasons to leave the poster up rather than pull a video down a metered
 * connection — the common case on the mobile devices these bands are tuned for.
 */
function prefersStillMedia(): boolean {
  if (typeof window === 'undefined') return false;

  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;

  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (!connection) return false;

  return (
    connection.saveData === true ||
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g'
  );
}

/**
 * Background media for an advertisement card.
 *
 * Video is deliberately lazy: nothing is downloaded until the card is within a
 * screen of the viewport, and playback pauses again once it leaves, so a page
 * with three ad bands never has three videos decoding at once. The poster paints
 * immediately through `next/image` and fades up as it decodes, so the card is
 * never blank and never pops, and it is also what remains if the video 404s, the
 * codec is unsupported, or the visitor is on a metered connection.
 */
export function AdMedia({
  mediaType,
  url,
  poster,
  alt,
  sizes,
  priority = false,
  autoplay = true,
  className,
}: AdMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  /* Resolved on the client only, so the server and first paint always agree. */
  const [stillOnly, setStillOnly] = useState(true);

  const isVideo = mediaType === 'video' && !videoFailed && !stillOnly;
  const stillImage = poster || (mediaType === 'image' ? url : '');

  useEffect(() => {
    setStillOnly(prefersStillMedia());
  }, []);

  /* Arm the video only once the card is close to the viewport. */
  useEffect(() => {
    if (!isVideo) return;
    const node = containerRef.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin: '400px 0px', threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isVideo]);

  /* Play while visible, pause while not. */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isVideo) return;

    if (!inView || !autoplay) {
      video.pause();
      return;
    }

    const play = video.play();
    if (play && typeof play.catch === 'function') {
      // Autoplay can still be refused (low power mode); the poster stays up.
      play.catch(() => setVideoReady(false));
    }
  }, [inView, isVideo, autoplay]);

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', className)}
    >
      {/* Neutral wash so a missing asset reads as a deliberate surface. */}
      <div className="absolute inset-0 bg-muted" aria-hidden="true" />

      {stillImage && !imageFailed ? (
        <Image
          src={stillImage}
          alt={alt}
          fill
          sizes={sizes}
          quality={80}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
          className={cn(
            'select-none object-cover object-center',
            EASE,
            'motion-safe:group-hover:scale-[1.03]',
            imageLoaded && !videoReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}

      {isVideo && inView ? (
        <video
          ref={videoRef}
          src={url}
          poster={stillImage || undefined}
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          // `playing`, not `canplay`: if autoplay is refused the poster has to
          // stay up.
          onPlaying={() => setVideoReady(true)}
          onPause={() => setVideoReady(false)}
          onError={() => {
            setVideoFailed(true);
            setVideoReady(false);
          }}
          className={cn(
            'absolute inset-0 h-full w-full select-none object-cover object-center',
            EASE,
            'motion-safe:group-hover:scale-[1.03]',
            videoReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </div>
  );
}

export default AdMedia;
