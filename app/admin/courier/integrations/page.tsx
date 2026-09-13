import { redirect } from 'next/navigation';

/** Retired: carrier credentials are the Settings tab of `/admin/courier`. */
export default function CourierIntegrationsRedirect() {
  redirect('/admin/courier?tab=settings');
}
