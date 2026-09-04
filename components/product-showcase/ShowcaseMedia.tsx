'use client';

import {
  mediaRatio,
  resolveMediaFraming,
} from '@/lib/product-showcase/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

interface ShowcaseMediaProps {
  mediaType: 'image' | 'video';
  /** Bunny CDN URL of the asset that fills the frame. */
  url: string;
  /** Still frame: the video poster, and the fallback if playback fails. */
  poster?: string;
  alt: string;
  /** Responsive `sizes` hint for the image path. */
  sizes: string;
  /** Only media above the fold should preload. */
  priority?: boolean;
  className?: string;
}

/** Shared motion so the poster fade, the video fade and the hover drift agree. */
const EASE = 'transition-[transform,opacity] duration-700 ease-out';

/**
 * True when the visitor has asked for less motion or less data — both good
 * reasons to leave the poster up rather than pull a campaign video down a
 * metered connection.
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
 * Background media for a showcase panel or promo card.
 *
 * Playback is driven from an effect rather than the `autoPlay` attribute. React
 * does not emit `muted` in server-rendered HTML (it is a property, not an
 * attribute), so an `autoPlay muted` video can reach the browser looking
 * unmuted and have autoplay refused outright — which is why one of these panels
 * would render a frozen frame while the other played. Setting `muted` on the
 * element and calling `play()` ourselves makes both panels behave the same, and
 * gives us somewhere to handle a rejected promise.
 *
 * Nothing downloads until the panel is within a screen of the viewport, and
 * playback pauses when it leaves, so a page with several campaigns never has
 * several videos decoding at once.
 */
export function ShowcaseMedia({
  mediaType,
  url,
  poster,
  alt,
  sizes,
  priority = false,
  className,
}: ShowcaseMediaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [inView, setInView] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  /**
   * `optimized` goes through `next/image`; `raw` is the escape hatch for a host
   * that is not in `next.config.js`, which the optimizer rejects with a 400.
   * Without it, pasting a URL from an unconfigured CDN would blank the panel.
   */
  const [imageMode, setImageMode] = useState<'optimized' | 'raw' | 'failed'>(
    'optimized',
  );
  /* Resolved on the client only, so the server and first paint always agree. */
  const [stillOnly, setStillOnly] = useState(true);
  /**
   * Intrinsic ratio of whatever is on screen, measured from the element itself.
   * The section has no stored dimensions — and adding them would change the
   * data model — so the asset is asked once its metadata arrives.
   */
  const [ratio, setRatio] = useState<number | null>(null);

  const isVideo = mediaType === 'video' && !videoFailed && !stillOnly;
  const stillImage = poster || (mediaType === 'image' ? url : '');
  /**
   * A poster-less video has nothing to show until the first frame is decoded,
   * so the media fragment asks for it up front. Browsers seek to it without a
   * second request, and Bunny never sees the fragment.
   */
  const videoSrc = stillImage ? url : `${url}#t=0.001`;

  const framing = useMemo(() => resolveMediaFraming(ratio), [ratio]);

  useEffect(() => {
    setStillOnly(prefersStillMedia());
  }, []);

  /* Reset the measurement when the panel is given a different asset. */
  useEffect(() => {
    setRatio(null);
  }, [url, poster]);


  /* Arm the video only once the panel is close to the viewport. */
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

    // Belt and braces: the property is what the autoplay policy actually reads.
    video.muted = true;
    video.defaultMuted = true;

    if (!inView) {
      video.pause();
      return;
    }

    const play = video.play();
    if (play && typeof play.catch === 'function') {
      // Autoplay can still be refused (low power mode); the poster stays up.
      play.catch(() => setVideoReady(false));
    }
  }, [inView, isVideo]);

  return (
    <div
      ref={containerRef}
      className={cn('absolute inset-0 overflow-hidden', className)}
    >
      {/* Neutral wash so a missing asset reads as a deliberate surface. */}
      <div className="absolute inset-0 bg-muted" aria-hidden="true" />

      {stillImage && imageMode === 'optimized' ? (
        <Image
          src={stillImage}
          alt={alt}
          fill
          sizes={sizes}
          quality={80}
          priority={priority}
          loading={priority ? undefined : 'lazy'}
          draggable={false}
          onLoad={(event) => {
            setImageLoaded(true);
            // The still is measured too: a video's poster shares its shape, so
            // the crop is anchored correctly before the video itself arrives.
            const image = event.currentTarget;
            setRatio(
              (current) =>
                current ?? mediaRatio(image.naturalWidth, image.naturalHeight),
            );
          }}
          onError={() => setImageMode('raw')}
          style={{ objectPosition: framing.objectPosition }}
          className={cn(
            'select-none object-cover',
            EASE,
            'motion-safe:group-hover:scale-[1.03]',
            imageLoaded && !videoReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}

      {stillImage && imageMode === 'raw' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={stillImage}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          onLoad={(event) => {
            setImageLoaded(true);
            const image = event.currentTarget;
            setRatio(
              (current) =>
                current ?? mediaRatio(image.naturalWidth, image.naturalHeight),
            );
          }}
          onError={() => setImageMode('failed')}
          style={{ objectPosition: framing.objectPosition }}
          className={cn(
            'absolute inset-0 h-full w-full select-none object-cover',
            EASE,
            'motion-safe:group-hover:scale-[1.03]',
            imageLoaded && !videoReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}

      {isVideo && inView ? (
        <video
          ref={videoRef}
          src={videoSrc}
          poster={stillImage || undefined}
          muted
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          // The video's own dimensions are the authority on how to crop it: a
          // portrait clip is anchored high instead of through the middle.
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;
            setRatio(mediaRatio(video.videoWidth, video.videoHeight));
          }}
          // With a poster, `playing` is the cue — if autoplay is refused the
          // poster has to stay up. Without one there is nothing behind the
          // video but the neutral wash, so the first decoded frame is shown
          // rather than holding a grey panel until playback starts.
          onLoadedData={() => {
            if (!stillImage) setVideoReady(true);
          }}
          onPlaying={() => setVideoReady(true)}
          onPause={() => {
            if (stillImage) setVideoReady(false);
          }}
          onError={() => {
            setVideoFailed(true);
            setVideoReady(false);
          }}
          style={{ objectPosition: framing.objectPosition }}
          className={cn(
            'absolute inset-0 h-full w-full select-none object-cover',
            EASE,
            'motion-safe:group-hover:scale-[1.03]',
            videoReady ? 'opacity-100' : 'opacity-0',
          )}
        />
      ) : null}
    </div>
  );
}

export default ShowcaseMedia;
