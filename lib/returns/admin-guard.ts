import 'server-only';

import { auth } from '@/lib/auth';
import { getClientIP } from '@/lib/audit';
import type { ReturnActor } from '@/lib/returns/service';

/**
 * Roles allowed to act on a return.
 *
 * `manager` and `staff` are included: refusing a refund is day-to-day support
 * work, and the previous `role !== 'admin'` check meant the people actually
 * handling returns could not, while the neighbouring order routes already
 * admitted them.
 */
const RETURN_ADMIN_ROLES = ['admin', 'manager', 'staff', 'super-admin'];

export type AdminGuardResult =
  | { ok: true; actor: ReturnActor }
  | { ok: false; status: number; error: string };

/** One auth check for every admin returns endpoint, with the actor for the audit log. */
export async function requireReturnsAdmin(
  request: Request,
): Promise<AdminGuardResult> {
  const session = await auth();

  if (!session?.user) {
    return { ok: false, status: 401, error: 'Authentication required' };
  }
  if (!RETURN_ADMIN_ROLES.includes(String(session.user.role))) {
    return { ok: false, status: 403, error: 'Admin access required' };
  }

  return {
    ok: true,
    actor: {
      userId: String(session.user.id),
      role: 'admin',
      ipAddress: getClientIP(request),
    },
  };
}
