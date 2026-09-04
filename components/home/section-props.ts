import {
  settingsBoolean,
  settingsNumber,
  settingsString,
  type HomepageSectionSettings,
} from '@/lib/landing/homepage-sections';

/**
 * Props every configurable homepage section accepts.
 *
 * `HomeClient` passes the admin-configured heading copy and the section's
 * `settings` object straight through, so a section can read new options without
 * any change to the plumbing. All fields are optional: a section rendered outside
 * the homepage (or before config loads) falls back to its own defaults.
 */
export interface HomepageSectionProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  settings?: HomepageSectionSettings;
  className?: string;
}

/**
 * Typed reads out of an untyped `settings` bag.
 *
 * Re-exported from `lib/landing/homepage-sections` so components and the server
 * data layer coerce settings identically — the data layer reads the same
 * `limit` values to size its queries.
 */
export const settingNumber = settingsNumber;
export const settingString = settingsString;
export const settingBoolean = settingsBoolean;
