"use client";

import { AnswerBlock } from '@/components/seo/AnswerBlock';
import {
  getSectionRenderer,
  type SectionRenderContext,
} from "@/components/home/section-registry";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import {
  EMPTY_HOMEPAGE_DATA,
  type HomepageData,
} from "@/lib/home/homepage-types";
import type { ResolvedCuratedSection } from "@/lib/curated-sections/client-types";
import {
  isCuratedSlotKey,
  isShowcaseSlotKey,
  mergeHomepageSections,
  resolveSectionHeader,
  type HomepageSectionConfig,
} from "@/lib/landing/homepage-sections";
import { useEffect, useMemo, useState } from "react";

interface HomeClientProps {
  /**
   * Slot configuration, resolved on the server so the first paint already has the
   * correct order and visibility. Omitted only in non-SSR usages, where the
   * client falls back to `/api/homepage-sections` and then to shipped defaults.
   */
  sections?: HomepageSectionConfig[];
  /**
   * Every section's content, also resolved on the server. Sections receive their
   * slice as an `initial*` prop and paint it on the first render — no skeleton,
   * no post-hydration fetch. A section whose slice is `null` (because the page
   * was rendered without server data) falls back to fetching for itself.
   */
  data?: HomepageData;
  /**
   * The server-resolved 40–60 word answer block, rendered after the hero. It is
   * what an answer engine lifts when asked what this store is, so it has to be
   * in the server HTML rather than appearing after hydration.
   */
  answer?: string;
}

export default function HomeClient({
  sections,
  data = EMPTY_HOMEPAGE_DATA,
  answer,
}: HomeClientProps = {}) {
  const [clientSections, setClientSections] = useState<
    HomepageSectionConfig[] | null
  >(null);

  // Only needed when the server did not supply the configuration — a non-SSR
  // mount, or a render that fell back to shipped defaults.
  useEffect(() => {
    if (sections?.length) return;
    let cancelled = false;

    const loadSections = async () => {
      try {
        const response = await fetch("/api/homepage-sections");
        if (!response.ok) return;
        const payload = await response.json();
        if (!cancelled && Array.isArray(payload.sections)) {
          setClientSections(payload.sections);
        }
      } catch {
        if (!cancelled) setClientSections(null);
      }
    };

    loadSections();
    return () => {
      cancelled = true;
    };
  }, [sections]);

  /** Server config wins; then a client fetch; then shipped defaults. */
  const orderedSections = useMemo(() => {
    const source = sections?.length ? sections : clientSections;
    return mergeHomepageSections(source).filter((section) => section.isEnabled);
  }, [sections, clientSections]);

  /**
   * The two dynamic slot families are the only data a section cannot fetch for
   * itself: a showcase or curated slot knows its document id but not which
   * request would return it, so the list has to be resolved once for the page.
   * Server-side on the homepage; here only when the page was rendered without
   * server data.
   */
  const needsShowcaseFetch =
    data.showcaseSections === null &&
    orderedSections.some((section) => isShowcaseSlotKey(section.key));
  const needsCuratedFetch =
    data.curatedSections === null &&
    orderedSections.some((section) => isCuratedSlotKey(section.key));

  const [fetchedShowcase, setFetchedShowcase] = useState<unknown[] | null>(null);
  const [fetchedCurated, setFetchedCurated] = useState<
    ResolvedCuratedSection[] | null
  >(null);

  useEffect(() => {
    if (!needsShowcaseFetch && !needsCuratedFetch) return;
    const controller = new AbortController();

    const load = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) return [];
      const payload = await response.json();
      return payload.sections || [];
    };

    if (needsShowcaseFetch) {
      load('/api/product-showcase')
        .then(setFetchedShowcase)
        .catch(() => setFetchedShowcase([]));
    }
    if (needsCuratedFetch) {
      load('/api/curated-sections')
        .then(setFetchedCurated)
        .catch(() => setFetchedCurated([]));
    }

    return () => controller.abort();
  }, [needsShowcaseFetch, needsCuratedFetch]);

  const renderContext = useMemo<SectionRenderContext>(
    () => ({
      data: {
        ...data,
        showcaseSections: data.showcaseSections ?? fetchedShowcase,
        curatedSections: data.curatedSections ?? fetchedCurated,
      },
    }),
    [data, fetchedShowcase, fetchedCurated],
  );

  return (
    <div className="min-h-screen bg-card">
      <Header />

      {/*
        `divide-y` is deliberately absent: the bands separate by rhythm, not by
        rules. Spacing comes from each section's own `HomeSection` wrapper, which
        reads the single scale in `lib/home/section-spacing`.
      */}
      <main className="mb-0">
        {orderedSections.map((section, index) => {
          const renderer = getSectionRenderer(section.key);
          if (!renderer) return null;

          const header = resolveSectionHeader(section);
          const content = renderer(
            {
              eyebrow: header.eyebrow,
              title: header.title,
              subtitle: header.subtitle,
              settings: section.settings,
            },
            renderContext,
            index,
          );

          if (!content) return null;

          return (
            <div key={section.key}>
              {content}
              {/*
                The extractable answer, directly after the hero — the earliest
                point on this page where a paragraph of prose reads naturally.
                Server-rendered and at rest: a Framer `initial={{ opacity: 0 }}`
                is honoured during SSR and would ship it invisible.
              */}
              {index === 0 && answer ? (
                <section className="border-y border-border bg-card py-8 md:py-10">
                  <div className="luxury-container">
                    <AnswerBlock>{answer}</AnswerBlock>
                  </div>
                </section>
              ) : null}
            </div>
          );
        })}
      </main>

      <Footer />
      <MobileBottomNav />
    </div>
  );
}
