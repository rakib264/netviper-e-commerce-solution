import { redirect } from 'next/navigation';

/**
 * Deep link to one order.
 *
 * Order details live in a dialog on `/admin/orders`, not on a page of their
 * own, so this route existed only as a 404 that every "New order placed"
 * notification led to. Rather than duplicate the whole detail panel, it
 * redirects to the list with the order selected — the list reads `?orderId=`
 * and opens the dialog on it.
 *
 * Kept as a real route rather than fixing only the notification href, because
 * notifications already stored in customers' and admins' inboxes still point
 * here and have to keep working.
 */
export default async function AdminOrderDeepLinkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/orders?orderId=${encodeURIComponent(id)}`);
}
