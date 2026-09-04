'use client';

import {
  isPlayableVideoFile,
  isVideoUrl,
  toEmbedUrl,
  withPosterFrame,
  type MediaItem,
} from '@/lib/products/types';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  Pause,
  Play,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import Image from 'next/image';
import { type HTMLAttributes, useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface ProductGalleryProps {
  media: MediaItem[];
  productName: string;
  onToggleWishlist?: () => void;
  isInWishlist?: boolean;
}

const MAIN_VIEWER_FRAME_CLASS =
  'relative flex aspect-square w-full items-center justify-center overflow-hidden bg-muted p-4 md:p-6';

function MainViewerFrame({
  children,
  className = '',
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${MAIN_VIEWER_FRAME_CLASS} ${className}`} {...props}>
      {children}
    </div>
  );
}

function VideoThumb({ url, label }: { url: string; label: string }) {
  const { t } = useTranslation();
  if (!isPlayableVideoFile(url)) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-primary text-[10px] font-label uppercase tracking-wider text-white">
        {t('products.productGallery.video')}
      </div>
    );
  }

  return (
    <>
      <video
        src={withPosterFrame(url)}
        className="absolute inset-0 h-full w-full object-contain"
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={label}
      />
      <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="rounded-full bg-black/50 p-1.5 text-white">
          <Play className="h-3 w-3 fill-white" />
        </span>
      </span>
    </>
  );
}

function GalleryMedia({
  item,
  alt,
  priority,
  fillClass = 'object-contain',
  withControls = false,
  mode = 'intrinsic',
}: {
  item: MediaItem;
  alt: string;
  priority?: boolean;
  fillClass?: string;
  withControls?: boolean;
  mode?: 'intrinsic' | 'fill';
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const isVideo = item.type === 'video' || isVideoUrl(item.url);
  const isFile = isVideo && isPlayableVideoFile(item.url);
  const mediaClass =
    mode === 'fill'
      ? `absolute inset-0 h-full w-full ${fillClass}`
      : `block h-full w-full ${fillClass}`;
  // In intrinsic mode the media sits inside the frame's padding (p-4 md:p-6),
  // so the skeleton must inset by the same amount to line up with the media.
  const skeletonClass =
    mode === 'fill'
      ? 'pointer-events-none absolute inset-0 animate-pulse bg-accent'
      : 'pointer-events-none absolute inset-4 animate-pulse bg-accent md:inset-6';

  useEffect(() => {
    setIsLoading(true);
  }, [item.url]);

  // Autoplay has to wait for decodable data: calling play() straight after a
  // source swap gets aborted by the pending load request.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    setMuted(true);

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled) return;
      el.play()
        .then(() => setPlaying(true))
        .catch(() => setPlaying(false));
    };

    el.addEventListener('loadeddata', tryPlay);
    el.addEventListener('canplay', tryPlay);
    if (el.readyState >= 2) tryPlay();

    return () => {
      cancelled = true;
      el.removeEventListener('loadeddata', tryPlay);
      el.removeEventListener('canplay', tryPlay);
    };
  }, [item.url]);

  const togglePlay = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => undefined);
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  }, []);

  const toggleMute = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  }, []);

  if (isFile) {
    return (
      <>
        {isLoading ? <div className={skeletonClass} /> : null}
        <video
          key={item.url}
          ref={videoRef}
          src={withPosterFrame(item.url)}
          className={mediaClass}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={alt}
          onLoadStart={() => setIsLoading(true)}
          onLoadedData={() => setIsLoading(false)}
          onCanPlay={() => setIsLoading(false)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        {withControls ? (
          <div className="absolute bottom-3 left-3 z-10 flex gap-2">
            <button
              type="button"
              onClick={togglePlay}
              className="border border-white/40 bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
              aria-label={playing ? t('products.productGallery.pauseVideo') : t('products.productGallery.playVideo')}
            >
              {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              className="border border-white/40 bg-black/45 p-2 text-white backdrop-blur-sm transition hover:bg-black/70"
              aria-label={muted ? t('products.productGallery.unmuteVideo') : t('products.productGallery.muteVideo')}
            >
              {muted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        ) : null}
      </>
    );
  }

  if (isVideo) {
    return (
      <div
        className={
          mode === 'fill'
            ? 'absolute inset-0 h-full w-full bg-[#111]'
            : 'relative flex h-full w-full items-center justify-center bg-[#111]'
        }
      >
        {isLoading ? (
          <div className="pointer-events-none absolute inset-0 z-[1] animate-pulse bg-accent" />
        ) : null}
        <iframe
          src={toEmbedUrl(item.url)}
          title={alt}
          className="h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  return (
    mode === 'fill' ? (
      <>
        {isLoading ? <div className={skeletonClass} /> : null}
        <Image
          src={item.url}
          alt={alt}
          fill
          priority={priority}
          sizes="(max-width: 1200px) 100vw, 62vw"
          className={fillClass}
          onLoadingComplete={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </>
    ) : (
      <>
        {isLoading ? <div className={skeletonClass} /> : null}
        <img
          src={item.url}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          className={mediaClass}
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      </>
    )
  );
}

export default function ProductGallery({
  media,
  productName,
  onToggleWishlist,
  isInWishlist,
}: ProductGalleryProps) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const thumbRailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);
  const [thumbScroll, setThumbScroll] = useState({
    canUp: false,
    canDown: false,
    overflowing: false,
  });

  const updateThumbScrollState = useCallback(() => {
    const el = thumbRailRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setThumbScroll({
      overflowing: maxScroll > 2,
      canUp: el.scrollTop > 2,
      canDown: el.scrollTop < maxScroll - 2,
    });
  }, []);

  const scrollThumbs = useCallback(
    (direction: 1 | -1) => {
      const el = thumbRailRef.current;
      if (!el) return;
      // Two thumbnails: 76px each + 12px gap
      el.scrollBy({ top: direction * 88 * 2, behavior: 'smooth' });
    },
    [],
  );

  useEffect(() => {
    setSelected(0);
  }, [media]);

  useEffect(() => {
    updateThumbScrollState();
    const el = thumbRailRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(updateThumbScrollState);
    observer.observe(el);
    return () => observer.disconnect();
  }, [media, updateThumbScrollState]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightboxOpen(false);
    };
    window.addEventListener('keydown', onEsc);

    // Lock background scroll while the lightbox is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onEsc);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxOpen]);

  const items =
    media.length > 0
      ? media
      : [{ id: 'placeholder', type: 'image' as const, url: '/placeholder-product.jpg' }];
  const active = items[Math.min(selected, items.length - 1)];
  const { canUp: canScrollUp, canDown: canScrollDown, overflowing } = thumbScroll;

  return (
    <>
      <div className="hidden gap-4 lg:grid lg:grid-cols-[84px_auto] lg:items-stretch">
        <div className="relative h-full w-[76px]">
          <button
            type="button"
            onClick={() => scrollThumbs(-1)}
            disabled={!canScrollUp}
            aria-label={t('products.productGallery.previousThumbnails')}
            className={`absolute -top-8 left-0 z-10 flex h-7 w-full items-center justify-center text-foreground transition-opacity ${
              overflowing ? '' : 'invisible'
            } ${canScrollUp ? 'hover:opacity-60' : 'cursor-default opacity-25'}`}
          >
            <ChevronUp className="h-5 w-5" strokeWidth={1.25} />
          </button>

          <div
            ref={thumbRailRef}
            onScroll={updateThumbScrollState}
            className="scrollbar-hide absolute inset-0 space-y-3 overflow-y-auto scroll-smooth"
          >
            {items.map((item, index) => (
              <button
                key={item.id || `${item.url}-${index}`}
                type="button"
                onClick={() => setSelected(index)}
                className={`relative mx-auto block h-[76px] w-[76px] shrink-0 border p-[3px] transition-colors ${
                  selected === index
                    ? 'border-foreground'
                    : 'border-border hover:border-border'
                }`}
              >
                <span className="relative block h-full w-full overflow-hidden bg-muted">
                  {item.type === 'image' ? (
                    <Image
                      src={item.url}
                      alt={t('common.productThumbnail', { product: productName, index: index + 1 })}
                      fill
                      sizes="96px"
                      className="object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <VideoThumb url={item.url} label={t('common.productVideo', { product: productName, index: index + 1 })} />
                  )}
                </span>
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => scrollThumbs(1)}
            disabled={!canScrollDown}
            aria-label={t('products.productGallery.moreThumbnails')}
            className={`absolute -bottom-8 left-0 z-10 flex h-7 w-full items-center justify-center text-foreground transition-opacity ${
              overflowing ? '' : 'invisible'
            } ${canScrollDown ? 'hover:opacity-60' : 'cursor-default opacity-25'}`}
          >
            <ChevronDown className="h-5 w-5" strokeWidth={1.25} />
          </button>
        </div>

        <div className="relative w-full">
          <MainViewerFrame
            role="button"
            tabIndex={0}
            onClick={() => setLightboxOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setLightboxOpen(true);
            }}
            className="cursor-zoom-in"
          >
            <GalleryMedia
              item={active}
              alt={productName}
              priority
              withControls
              mode="intrinsic"
              fillClass="object-contain"
            />
          </MainViewerFrame>
          {onToggleWishlist ? (
            <button
              type="button"
              onClick={onToggleWishlist}
              className="absolute right-3 top-3 z-10 border border-border bg-card/90 p-2 text-foreground backdrop-blur-sm"
              aria-label={t('products.productGallery.addToFavorites')}
            >
              <Heart
                className={`h-4 w-4 ${isInWishlist ? 'fill-foreground' : ''}`}
              />
            </button>
          ) : null}
        </div>
      </div>

      <div className="lg:hidden">
        <div className="relative w-full">
          <MainViewerFrame
            role="button"
            tabIndex={0}
            onClick={() => setLightboxOpen(true)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') setLightboxOpen(true);
            }}
            className="cursor-zoom-in"
          >
            <GalleryMedia
              item={active}
              alt={productName}
              priority
              withControls
              mode="intrinsic"
              fillClass="object-contain"
            />
          </MainViewerFrame>
          {onToggleWishlist ? (
            <button
              type="button"
              onClick={onToggleWishlist}
              className="absolute right-3 top-3 z-10 border border-border bg-card/90 p-2"
              aria-label={t('products.productGallery.addToFavorites')}
            >
              <Heart
                className={`h-4 w-4 ${isInWishlist ? 'fill-foreground' : ''}`}
              />
            </button>
          ) : null}
        </div>
        <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto">
          {items.map((item, index) => (
            <button
              key={item.id || `${item.url}-${index}`}
              type="button"
              onClick={() => setSelected(index)}
              className={`relative h-[64px] w-[52px] shrink-0 border p-[3px] transition-colors ${
                selected === index ? 'border-foreground' : 'border-border'
              }`}
            >
              <span className="relative block h-full w-full overflow-hidden bg-muted">
              {item.type === 'image' ? (
                <Image
                  src={item.url}
                  alt=""
                  fill
                  sizes="64px"
                  className="object-contain"
                  loading="lazy"
                />
              ) : (
                <VideoThumb url={item.url} label={t('common.productVideo', { product: productName, index: index + 1 })} />
              )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {mounted && lightboxOpen
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t('common.productGallery', { product: productName })}
              onClick={() => setLightboxOpen(false)}
              className="fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-black/95"
            >
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setLightboxOpen(false);
                }}
                className="absolute right-4 top-4 z-20 border border-white/30 p-2 text-white transition hover:bg-card/10"
                aria-label={t('products.productGallery.closeGallery')}
              >
                <X className="h-5 w-5" />
              </button>
              {items.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected((c) => Math.max(0, c - 1));
                    }}
                    className="absolute left-4 top-1/2 z-20 -translate-y-1/2 border border-white/30 p-2 text-white transition hover:bg-card/10"
                    aria-label={t('products.productGallery.previous')}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected((c) => Math.min(items.length - 1, c + 1));
                    }}
                    className="absolute right-4 top-1/2 z-20 -translate-y-1/2 border border-white/30 p-2 text-white transition hover:bg-card/10"
                    aria-label={t('products.productGallery.next')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              ) : null}
              <div
                onClick={(event) => event.stopPropagation()}
                className="relative mx-auto flex h-full w-full max-w-6xl items-center justify-center px-4 py-16"
              >
                <GalleryMedia
                  item={active}
                  alt={t('common.productLightbox', { product: productName })}
                  mode="fill"
                  fillClass="object-contain"
                  withControls
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
