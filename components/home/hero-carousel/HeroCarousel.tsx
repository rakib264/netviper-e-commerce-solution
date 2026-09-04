'use client';

import ProductCard from '@/components/home/hero-carousel/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getSlideCta,
  getSlideProducts,
  hasProductCard,
  isVideoAssetUrl,
  productCardOnLeft,
  type HeroSlide,
} from '@/lib/hero-carousel/types';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type Hls from 'hls.js';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

type LoadState = 'loading' | 'ready' | 'empty' | 'error';

const HERO_HEIGHT_CLASSES =
  'h-[min(68svh,560px)] min-h-[420px] md:h-[min(78vh,720px)] md:min-h-[560px] lg:h-[min(88vh,860px)] lg:min-h-[640px]';
const HLS_MIME_TYPE = 'application/vnd.apple.mpegurl';

function isHlsManifestUrl(url: string): boolean {
  return /\.m3u8(\?|#|$)/i.test(url);
}

function getUrlOrigin(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function ensureHeadLink(
  rel: 'preconnect' | 'dns-prefetch',
  href: string,
  crossOrigin?: 'anonymous'
) {
  const selector = `link[rel="${rel}"][href="${href}"]`;
  if (document.head.querySelector(selector)) return;

  const link = document.createElement('link');
  link.rel = rel;
  link.href = href;
  if (crossOrigin) {
    link.crossOrigin = crossOrigin;
  }
  document.head.appendChild(link);
}

function HeroCarouselSkeleton() {
  const { t } = useTranslation();
  return (
    <section
      className={cn(
        'relative overflow-hidden bg-primary',
        HERO_HEIGHT_CLASSES
      )}
      aria-label={t('home.heroCarousel.heroCarousel.loadingFeaturedCampaigns')}
      aria-busy="true"
    >
      <div className="absolute inset-0">
        <Skeleton className="h-full w-full rounded-none bg-card/10" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/35 via-transparent to-black/20 lg:block" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-end px-4 pb-12 pt-20 sm:px-6 sm:pb-14 lg:items-center lg:justify-center lg:px-8 lg:pb-20 lg:pt-24">
        <div className="mx-auto flex w-full max-w-[820px] flex-col items-stretch gap-4 lg:flex-row lg:items-center lg:justify-center lg:gap-9">
          <div className="order-1 min-w-0 text-center text-white lg:max-w-[22rem] lg:shrink-0 lg:text-left xl:max-w-[24rem]">
            <Skeleton className="mx-auto h-12 w-4/5 bg-card/25 lg:mx-0 lg:h-14 lg:w-full" />
            <Skeleton className="mx-auto mt-2 h-12 w-3/4 bg-card/20 lg:mx-0 lg:w-11/12" />
            <Skeleton className="mx-auto mt-5 h-9 w-32 rounded-full bg-card/30 lg:mx-0" />
          </div>

          <div className="order-2 w-full lg:w-auto lg:shrink-0">
            <div className="flex w-full flex-col gap-2 lg:w-auto lg:gap-3">
              {Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`hero-skeleton-card-${index}`}
                  className="flex w-full overflow-hidden bg-card/85 lg:w-[300px]"
                >
                  <Skeleton className="h-[88px] w-[80px] rounded-none bg-accent sm:h-[110px] sm:w-[100px] lg:h-[120px] lg:w-[110px]" />
                  <div className="flex flex-1 flex-col justify-between gap-2 px-3 py-2.5">
                    <Skeleton className="h-4 w-4/5 bg-border" />
                    <Skeleton className="h-3 w-2/3 bg-border" />
                    <div className="flex gap-1.5">
                      <Skeleton className="h-7 flex-1 rounded-none bg-border" />
                      <Skeleton className="h-7 flex-1 rounded-none bg-border" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export interface HeroCarouselProps {
  /**
   * Slides resolved on the server. Present on the homepage, where the hero is
   * the LCP element and must be in the initial HTML; `null` when the carousel is
   * mounted somewhere without a server data path, in which case it fetches.
   */
  initialSlides?: HeroSlide[] | null;
}

/** A slide with neither an image nor a video would render an empty frame. */
function usableSlides(slides: HeroSlide[]): HeroSlide[] {
  return slides.filter((slide) => {
    const image = slide.image?.trim();
    const video = slide.backgroundVideo?.trim();
    return Boolean(image || video);
  });
}

export default function HeroCarousel({ initialSlides }: HeroCarouselProps = {}) {
  const { t } = useTranslation();
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const serverSlides = initialSlides ? usableSlides(initialSlides) : null;

  const [slides, setSlides] = useState<HeroSlide[]>(serverSlides || []);
  const [current, setCurrent] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isOffscreenPaused, setIsOffscreenPaused] = useState(false);
  const [isDocumentHidden, setIsDocumentHidden] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>(
    serverSlides ? (serverSlides.length > 0 ? 'ready' : 'empty') : 'loading',
  );
  const [videoReady, setVideoReady] = useState(false);
  /**
   * Whether a slide transition has happened yet.
   *
   * The enter animations below are skipped on the first render. Framer Motion
   * honours `initial` during SSR, so an `opacity: 0` start would ship the hero
   * headline and its backdrop — the page's LCP element — invisible, and only
   * reveal them once the bundle hydrated. That is the exact delay this work
   * exists to remove, so the first slide paints at rest and only subsequent
   * ones animate in.
   */
  const [hasTransitioned, setHasTransitioned] = useState(false);

  useEffect(() => {
    if (current !== 0) setHasTransitioned(true);
  }, [current]);

  useEffect(() => {
    // The homepage resolves the slides server-side; only a mount without that
    // path has to ask for them.
    if (initialSlides) return;
    const controller = new AbortController();

    const load = async () => {
      setLoadState('loading');
      try {
        const response = await fetch('/api/banners?limit=8', {
          signal: controller.signal,
        });
        if (!response.ok) {
          setSlides([]);
          setLoadState('error');
          return;
        }
        const data = await response.json();
        const loadedSlides = Array.isArray(data.banners)
          ? usableSlides(data.banners as HeroSlide[])
          : [];

        setSlides(loadedSlides);
        setLoadState(loadedSlides.length > 0 ? 'ready' : 'empty');
      } catch (error) {
        if ((error as Error).name === 'AbortError') return;
        setSlides([]);
        setLoadState('error');
      }
    };

    load();
    return () => controller.abort();
  }, [initialSlides]);

  useEffect(() => {
    if (!serverSlides) return;
    setSlides(serverSlides);
    setLoadState(serverSlides.length > 0 ? 'ready' : 'empty');
    // Identity changes only when the server payload does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlides]);

  useEffect(() => {
    if (!slides.length) return;
    setCurrent((index) => {
      if (index < slides.length) return index;
      return 0;
    });
  }, [slides.length]);

  const count = slides.length;
  const hasMultiple = count > 1;
  const hasSlides = loadState === 'ready' && count > 0;
  const isCarouselPaused = isHoverPaused || isOffscreenPaused;
  const isVideoPlaybackPaused = isOffscreenPaused || isDocumentHidden;

  const goTo = useCallback(
    (index: number) => {
      if (!count) return;
      setCurrent(((index % count) + count) % count);
    },
    [count]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setIsOffscreenPaused((prev) => {
          const ratio = entry?.intersectionRatio ?? 0;
          const intersects = Boolean(entry?.isIntersecting);

          // Hysteresis: avoid rapid pause/play flapping near viewport boundary.
          if (prev) {
            if (intersects && ratio > 0.24) return false;
            return true;
          }
          if (!intersects || ratio < 0.08) return true;
          return false;
        });
      },
      {
        threshold: [0, 0.08, 0.24, 0.5],
        root: null,
      }
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => {
      setIsDocumentHidden(document.hidden);
    };
    onVisibilityChange();
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () =>
      document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!hasSlides || !hasMultiple || isCarouselPaused) return;
    const timer = window.setInterval(() => {
      setCurrent((prevIndex) => (prevIndex + 1) % count);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [hasSlides, hasMultiple, isCarouselPaused, count]);

  const slide = useMemo(() => slides[current], [slides, current]);
  const cta = useMemo(() => (slide ? getSlideCta(slide) : null), [slide]);
  const cardLeft = productCardOnLeft(current);
  const products = useMemo(() => (slide ? getSlideProducts(slide) : []), [slide]);
  const showCards = slide ? hasProductCard(slide) : false;

  const imageUrl = slide?.image?.trim() || '';
  const backgroundVideoUrl = slide?.backgroundVideo?.trim() || '';
  const videoUrl =
    backgroundVideoUrl || (isVideoAssetUrl(imageUrl) ? imageUrl : '');
  const stillImageUrl = videoUrl ? '' : imageUrl;
  const posterUrl =
    videoUrl && imageUrl && !isVideoAssetUrl(imageUrl) ? imageUrl : undefined;
  const isHlsSource = isHlsManifestUrl(videoUrl);

  useEffect(() => {
    if (!videoUrl) return;
    const origin = getUrlOrigin(videoUrl);
    if (!origin) return;

    // Bunny-hosted videos start quicker with connection warmup.
    ensureHeadLink('preconnect', origin, 'anonymous');
    ensureHeadLink('dns-prefetch', origin);
  }, [videoUrl]);

  useEffect(() => {
    if (!slides.length || !hasMultiple) return;

    const nextSlide = slides[(current + 1) % slides.length];
    const nextImage = nextSlide.image?.trim() || '';
    const nextBackgroundVideo = nextSlide.backgroundVideo?.trim() || '';
    const nextVideo =
      nextBackgroundVideo || (isVideoAssetUrl(nextImage) ? nextImage : '');

    // Don't preload whole next videos; it competes with current stream bandwidth.
    if (nextVideo) return;

    if (nextImage && !isVideoAssetUrl(nextImage)) {
      const img = new window.Image();
      img.decoding = 'async';
      img.src = nextImage;
    }
  }, [slides, current, hasMultiple]);

  useEffect(() => {
    if (!cta) return;
    router.prefetch(cta.url);
    for (const product of products) {
      if (product.productSlug) {
        router.prefetch(`/products/${product.productSlug}`);
      }
    }
  }, [router, cta, products]);

  useEffect(() => {
    setVideoReady(false);
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    let isCancelled = false;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = isHlsSource ? 'metadata' : 'auto';

    const markReady = () => {
      if (isCancelled) return;
      setVideoReady(true);
      void video.play().catch(() => undefined);
    };

    const destroyHls = () => {
      if (!hlsRef.current) return;
      hlsRef.current.destroy();
      hlsRef.current = null;
    };

    const attachDirectSource = () => {
      destroyHls();
      if (video.src !== videoUrl) {
        video.src = videoUrl;
      }
      if (video.readyState >= 2) {
        markReady();
      } else {
        void video.play().catch(() => undefined);
      }
    };

    const setupSource = async () => {
      if (!isHlsSource) {
        attachDirectSource();
        return;
      }

      // Safari/iOS can usually play HLS natively.
      if (video.canPlayType(HLS_MIME_TYPE)) {
        attachDirectSource();
        return;
      }

      try {
        const { default: HlsCtor } = await import('hls.js');
        if (isCancelled) return;

        if (!HlsCtor.isSupported()) {
          attachDirectSource();
          return;
        }

        destroyHls();
        const hls = new HlsCtor({
          enableWorker: true,
          capLevelToPlayerSize: true,
          startLevel: -1,
          maxBufferLength: 30,
          maxMaxBufferLength: 120,
          backBufferLength: 90,
        });
        hlsRef.current = hls;

        hls.on(HlsCtor.Events.MEDIA_ATTACHED, () => {
          if (isCancelled) return;
          hls.loadSource(videoUrl);
        });
        hls.on(HlsCtor.Events.MANIFEST_PARSED, () => {
          markReady();
        });
        hls.on(HlsCtor.Events.ERROR, (_event, data) => {
          if (!data?.fatal) return;

          switch (data.type) {
            case HlsCtor.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case HlsCtor.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              destroyHls();
              attachDirectSource();
          }
        });

        hls.attachMedia(video);
      } catch {
        attachDirectSource();
      }
    };

    void setupSource();

    video.addEventListener('canplay', markReady);
    video.addEventListener('canplaythrough', markReady);
    video.addEventListener('loadeddata', markReady);
    video.addEventListener('playing', markReady);

    return () => {
      isCancelled = true;
      video.removeEventListener('canplay', markReady);
      video.removeEventListener('canplaythrough', markReady);
      video.removeEventListener('loadeddata', markReady);
      video.removeEventListener('playing', markReady);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [videoUrl, isHlsSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoUrl) return;
    if (isVideoPlaybackPaused) video.pause();
    else void video.play().catch(() => undefined);
  }, [isVideoPlaybackPaused, videoUrl]);

  if (loadState === 'loading') {
    return <HeroCarouselSkeleton />;
  }

  if (!hasSlides || !slide || !cta) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      className={cn(
        'relative overflow-hidden bg-primary',
        // Mobile: compact hero — not full-screen tall
        HERO_HEIGHT_CLASSES
      )}
      onMouseEnter={() => setIsHoverPaused(true)}
      onMouseLeave={() => setIsHoverPaused(false)}
      aria-roledescription="carousel"
      aria-label={t('home.heroCarousel.heroCarousel.featuredCampaigns')}
    >
      <div className="absolute inset-0">
        {videoUrl ? (
          <>
            {posterUrl ? (
              <Image
                src={posterUrl}
                alt=""
                fill
                priority={current === 0}
                fetchPriority={current === 0 ? 'high' : 'auto'}
                sizes="100vw"
                className={cn(
                  'object-cover transition-opacity duration-500',
                  videoReady ? 'opacity-0' : 'opacity-100'
                )}
              />
            ) : null}
            <video
              ref={videoRef}
              key={`video-${videoUrl}`}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                videoReady ? 'opacity-100' : 'opacity-0'
              )}
              src={isHlsSource ? undefined : videoUrl}
              autoPlay
              muted
              loop
              playsInline
              crossOrigin="anonymous"
              preload="auto"
              poster={posterUrl}
            />
          </>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${slide._id}-${current}`}
              className="absolute inset-0"
              initial={hasTransitioned ? { opacity: 0, scale: 1.03 } : false}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            >
              {stillImageUrl ? (
                <Image
                  src={stillImageUrl}
                  alt=""
                  fill
                  priority={current === 0}
                  fetchPriority={current === 0 ? 'high' : 'auto'}
                  sizes="100vw"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-primary" />
              )}
            </motion.div>
          </AnimatePresence>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/20" />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/35 via-transparent to-black/20 lg:block" />
      </div>

      <div
        className={cn(
          'relative z-10 flex h-full flex-col justify-end px-4 pb-12 pt-20',
          'sm:px-6 sm:pb-14',
          'lg:items-center lg:justify-center lg:px-8 lg:pb-20 lg:pt-24',
          hasMultiple && 'pb-14 sm:pb-16'
        )}
      >
        <div
          className={cn(
            'mx-auto flex w-full max-w-[820px] flex-col items-stretch gap-4',
            'lg:flex-row lg:items-center lg:justify-center lg:gap-9',
            cardLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'
          )}
        >
          {/* Copy first on mobile */}
          <div
            className={cn(
              'order-1 min-w-0 text-center text-white',
              'lg:order-none lg:max-w-[22rem] lg:shrink-0 lg:text-left xl:max-w-[24rem]',
              !showCards && 'mx-auto max-w-xl'
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`copy-${slide._id}-${current}`}
                initial={hasTransitioned ? { opacity: 0, y: 12 } : false}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              >
                <h1 className="font-navigation text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.025em] text-balance sm:text-[2.4rem] lg:text-[3.05rem] xl:text-[3.25rem]">
                  {slide.title}
                </h1>
                {slide.description ? (
                  <p className="mx-auto mt-2.5 max-w-sm line-clamp-2 font-paragraph text-[13px] leading-relaxed text-white/85 sm:mt-3.5 sm:line-clamp-none sm:text-[15px] lg:mx-0 lg:max-w-[22rem]">
                    {slide.description}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() => router.push(cta.url)}
                  className="mt-4 inline-flex h-9 items-center rounded-full bg-card px-6 font-button text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground shadow-[0_8px_28px_rgba(0,0,0,0.28)] transition-all duration-300 hover:bg-card/92 active:scale-[0.98] sm:mt-6 sm:h-10 sm:px-7"
                >
                  {cta.label}
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {showCards ? (
            <div className="order-2 w-full lg:order-none lg:w-auto lg:shrink-0">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`cards-${slide._id}-${current}`}
                  initial={hasTransitioned ? { opacity: 0, y: 12 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex w-full flex-col gap-2 lg:w-auto lg:gap-3"
                >
                  {products.map((product, index) => (
                    <ProductCard
                      key={`${product.productId || product.productName}-${index}`}
                      product={product}
                      variant="mobile"
                      className={cn(
                        'w-full lg:w-[300px]',
                        // Keep mobile hero compact: hide 3rd card on small screens
                        index >= 2 && 'hidden lg:flex'
                      )}
                    />
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      {hasMultiple ? (
        <>
          <button
            type="button"
            onClick={prev}
            className="absolute left-1 top-1/2 z-20 hidden -translate-y-1/2 p-2 text-white/90 transition-opacity hover:opacity-70 sm:left-3 sm:block lg:left-4"
            aria-label={t('home.heroCarousel.heroCarousel.previousSlide')}
          >
            <ChevronLeft className="h-7 w-7 stroke-[1.15] lg:h-8 lg:w-8" />
          </button>
          <button
            type="button"
            onClick={next}
            className="absolute right-1 top-1/2 z-20 hidden -translate-y-1/2 p-2 text-white/90 transition-opacity hover:opacity-70 sm:right-3 sm:block lg:right-4"
            aria-label={t('home.heroCarousel.heroCarousel.nextSlide')}
          >
            <ChevronRight className="h-7 w-7 stroke-[1.15] lg:h-8 lg:w-8" />
          </button>

          <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 sm:bottom-5 sm:gap-2.5">
            {slides.map((item, index) => {
              const active = index === current;
              return (
                <button
                  key={item._id}
                  type="button"
                  aria-label={t('common.goToSlide', { index: index + 1 })}
                  aria-current={active}
                  onClick={() => goTo(index)}
                  className={cn(
                    'rounded-full border border-white/85 transition-all duration-300',
                    active
                      ? 'h-2 w-2 scale-110 bg-card sm:h-2.5 sm:w-2.5'
                      : 'h-1.5 w-1.5 bg-transparent hover:bg-card/35 sm:h-2 sm:w-2'
                  )}
                />
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
