import 'server-only';

import { unstable_cache } from 'next/cache';

import { CACHE_TAGS } from '@/lib/cache/tags';
import { toPlainJson } from '@/lib/home/serialize';
import ReturnPolicySettings from '@/lib/models/ReturnPolicySettings';
import connectDB from '@/lib/mongodb';
import {
  DEFAULT_RETURN_POLICY,
  type ReturnPolicyContent,
  type ReturnPolicySection,
} from '@/lib/returns/policy-content';

/**
 * The returns policy as customers see it.
 *
 * Merged over the shipped defaults rather than read raw, so a store that has
 * never opened the admin screen still has a complete policy, and an admin who
 * edits one field does not blank the rest.
 */
function mergePolicy(stored: Record<string, any> | null): ReturnPolicyContent {
  if (!stored) return DEFAULT_RETURN_POLICY;

  const sections: ReturnPolicySection[] =
    Array.isArray(stored.sections) && stored.sections.length > 0
      ? stored.sections
          .map((section: any, index: number) => ({
            key: String(section.key || `section-${index}`),
            title: {
              en: String(section.title?.en || ''),
              bn: String(section.title?.bn || ''),
              de: String(section.title?.de || ''),
            },
            body: {
              en: String(section.body?.en || ''),
              bn: String(section.body?.bn || ''),
              de: String(section.body?.de || ''),
            },
            order: Number.isFinite(section.order) ? Number(section.order) : index,
          }))
          // A section with no text in any locale is an empty card; drop it.
          .filter(
            (section: ReturnPolicySection) =>
              Object.values(section.title).some(Boolean) ||
              Object.values(section.body).some(Boolean),
          )
          .sort((a: ReturnPolicySection, b: ReturnPolicySection) => a.order - b.order)
      : DEFAULT_RETURN_POLICY.sections;

  return {
    returnWindowDays:
      Number(stored.returnWindowDays) > 0
        ? Number(stored.returnWindowDays)
        : DEFAULT_RETURN_POLICY.returnWindowDays,
    exchangeWindowDays:
      Number(stored.exchangeWindowDays) > 0
        ? Number(stored.exchangeWindowDays)
        : DEFAULT_RETURN_POLICY.exchangeWindowDays,
    freeReturnShipping:
      typeof stored.freeReturnShipping === 'boolean'
        ? stored.freeReturnShipping
        : DEFAULT_RETURN_POLICY.freeReturnShipping,
    sections,
  };
}

async function readPolicy(): Promise<ReturnPolicyContent> {
  await connectDB();
  const stored = await ReturnPolicySettings.findOne().lean<Record<string, any> | null>();
  return toPlainJson(mergePolicy(stored));
}

/** Uncached — for the admin screen, which must see what it just saved. */
export async function getFreshReturnPolicy(): Promise<ReturnPolicyContent> {
  return readPolicy();
}

/** Cached and tag-invalidated, for the storefront. */
export const getCachedReturnPolicy = unstable_cache(
  async () => readPolicy(),
  ['return-policy-v1'],
  { tags: [CACHE_TAGS.returnPolicy], revalidate: 300 },
);

/** Whitelist and normalise an admin payload before it reaches the model. */
export function buildReturnPolicyPayload(input: unknown): Partial<ReturnPolicyContent> {
  const body = (input || {}) as Record<string, any>;
  const payload: Partial<ReturnPolicyContent> = {};

  const window = Number(body.returnWindowDays);
  if (Number.isFinite(window) && window > 0) {
    payload.returnWindowDays = Math.min(365, Math.round(window));
  }
  const exchangeWindow = Number(body.exchangeWindowDays);
  if (Number.isFinite(exchangeWindow) && exchangeWindow > 0) {
    payload.exchangeWindowDays = Math.min(365, Math.round(exchangeWindow));
  }
  if (typeof body.freeReturnShipping === 'boolean') {
    payload.freeReturnShipping = body.freeReturnShipping;
  }

  if (Array.isArray(body.sections)) {
    payload.sections = body.sections
      .slice(0, 20)
      .map((section: any, index: number) => ({
        key: String(section?.key || `section-${index}`).trim().slice(0, 60),
        title: {
          en: String(section?.title?.en || '').trim().slice(0, 200),
          bn: String(section?.title?.bn || '').trim().slice(0, 200),
          de: String(section?.title?.de || '').trim().slice(0, 200),
        },
        body: {
          en: String(section?.body?.en || '').trim().slice(0, 2000),
          bn: String(section?.body?.bn || '').trim().slice(0, 2000),
          de: String(section?.body?.de || '').trim().slice(0, 2000),
        },
        order: index,
      }));
  }

  return payload;
}
