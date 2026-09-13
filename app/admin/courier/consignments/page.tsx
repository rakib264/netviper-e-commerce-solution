import { redirect } from 'next/navigation';

/** Retired: the dispatch desk is the default tab of `/admin/courier`. */
export default function CourierConsignmentsRedirect() {
  redirect('/admin/courier?tab=consignments');
}
