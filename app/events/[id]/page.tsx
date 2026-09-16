import { CACHE_TAGS } from "@/lib/cache/tags";
import { toPlainJson } from "@/lib/home/serialize";
import Event from "@/lib/models/Event";
import connectDB from "@/lib/mongodb";
import { JsonLd } from "@/lib/seo/JsonLd";
import { buildPageGraph, getSeoContext } from "@/lib/seo/graph";
import { buildMetadata } from "@/lib/seo/metadata";
import { eventSchema } from "@/lib/seo/schema";
import mongoose from "mongoose";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import { notFound } from "next/navigation";
import EventPageClient from "./EventPageClient";

interface EventRecord {
  title: string;
  subtitle?: string;
  bannerImage?: string;
  discountText?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * One event, cached and tagged — shared by `generateMetadata` and the body,
 * which previously ran the same uncached query twice per request.
 */
const loadEvent = unstable_cache(
  async (id: string) => {
    // The id comes straight from the URL. Without this guard a malformed one
    // reaches Mongoose as a cast error — a 500 where the honest answer is 404.
    if (!mongoose.Types.ObjectId.isValid(id)) return null;

    await connectDB();
    const event = await Event.findOne({ _id: id, isActive: true })
      .select("-__v")
      .lean();

    return event ? toPlainJson(event as unknown as EventRecord) : null;
  },
  ["event-detail-v1"],
  // 60s rather than 300: an event's visibility turns on a clock, so a longer
  // window would keep showing one that has already ended.
  { tags: [CACHE_TAGS.events], revalidate: 60 },
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  const [event, { seo, t }] = await Promise.all([
    loadEvent(id).catch(() => null),
    getSeoContext(),
  ]);

  if (!event) {
    return buildMetadata({
      titleKey: "seo.events.title",
      descriptionKey: "seo.events.description",
      descriptionValues: { brand: seo.name },
      path: `/events/${id}`,
      noindex: true,
    });
  }

  return buildMetadata({
    title: event.title,
    description:
      event.subtitle ||
      event.discountText ||
      t("seo.event.descriptionFallback", { name: event.title, brand: seo.name }),
    path: `/events/${id}`,
    images: event.bannerImage
      ? [{ url: event.bannerImage, alt: event.title }]
      : undefined,
  });
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [event, context] = await Promise.all([
    loadEvent(id).catch((error) => {
      console.error("Error fetching event:", error);
      return null;
    }),
    getSeoContext(),
  ]);

  if (!event) notFound();

  const { seo, t } = context;
  const description =
    event.subtitle ||
    event.discountText ||
    t("seo.event.descriptionFallback", { name: event.title, brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: `/events/${id}`,
      name: event.title,
      description,
      primaryImage: event.bannerImage,
      breadcrumbs: [
        { name: t("seo.events.title"), path: "/events" },
        { name: event.title, path: `/events/${id}` },
      ],
      nodes: [
        eventSchema(seo, {
          canonical: seo.absolute(`/events/${id}`),
          name: event.title,
          description,
          image: event.bannerImage,
          startDate: event.startDate,
          endDate: event.endDate,
        }),
      ],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <EventPageClient params={Promise.resolve({ id })} />
    </>
  );
}
