import { redirect } from 'next/navigation';

/**
 * Events now live as the Quick Deals tab of Marketing & Deals.
 *
 * The route is kept as a redirect rather than deleted: it is bookmarked, and it
 * is still the target of older links in the admin.
 */
export default function AdminEventsPage() {
  redirect('/admin/marketing?tab=quick-deals');
}
