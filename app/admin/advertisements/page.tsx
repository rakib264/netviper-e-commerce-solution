import { redirect } from 'next/navigation';

/**
 * Advertisements moved into Marketing & Deals. This route stays so existing
 * bookmarks and links keep working.
 */
export default function AdvertisementsRedirectPage() {
  redirect('/admin/marketing?tab=advertisement');
}
