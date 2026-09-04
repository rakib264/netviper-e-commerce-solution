import 'server-only';

import { createAuditLog } from '@/lib/audit';
import { ReturnRequest } from '@/lib/models/ReturnRequest';
import connectDB from '@/lib/mongodb';
import {
  notifyCustomerReturnStatusChanged,
  notifyCustomerReturnSubmitted,
} from '@/lib/notifications/events';
import {
  canTransition,
  isReturnStatus,
  missingTransitionFields,
  type ReturnStatus,
} from '@/lib/returns/policy';
import type { OrderReturnContext, RequestedLine } from '@/lib/returns/eligibility';

/**
 * The one place a return request is created or moved.
 *
 * Previously four endpoints each did their own version of this — two admin
 * routes with near-identical update bodies, plus an unauthenticated `PUT` on the
 * public route — so status history, notifications and audit entries were written
 * inconsistently or not at all depending on which one a client happened to hit.
 */

const AUDIT_RESOURCE = 'ReturnRequest';

export interface ReturnActor {
  userId?: string | null;
  role: 'customer' | 'admin' | 'system';
  ipAddress?: string;
}

export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; details?: unknown };

/** `REQ-<base36 time>-<random>` — short enough to read out, unique enough not to collide. */
function generateRequestId(): string {
  return `REQ-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 8)
    .toUpperCase()}`;
}

export interface CreateReturnInput {
  context: OrderReturnContext;
  lines: RequestedLine[];
  type: 'return' | 'exchange';
  reason: string;
  details?: string;
  customerName: string;
  email: string;
  phone?: string;
  attachments?: string[];
  actor: ReturnActor;
  /** Set only by the admin override path, and always audited. */
  override?: { reason: string; waivedCodes: string[] };
}

export async function createReturnRequest(
  input: CreateReturnInput,
): Promise<ServiceResult<{ requestId: string; id: string; status: ReturnStatus }>> {
  await connectDB();

  const requestId = generateRequestId();

  // The order *number* is the join key: it is what the customer quotes, what the
  // admin list searches, and what the eligibility check counts prior requests
  // against.
  const created = await ReturnRequest.create({
    requestId,
    orderId: input.context.orderNumber,
    userId: input.actor.role === 'customer' ? input.actor.userId || undefined : input.context.customerId || undefined,
    customerName: input.customerName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || '',
    type: input.type,
    reason: input.reason.trim(),
    details: input.details?.trim() || '',
    products: input.lines.map((line) => ({
      productId: line.productId || undefined,
      productName: line.productName.trim(),
      quantity: line.quantity,
      variant: line.variant?.trim() || undefined,
      reason: line.reason.trim(),
      details: line.details?.trim() || undefined,
    })),
    attachments: input.attachments || [],
    status: 'pending',
    statusHistory: [
      {
        status: 'pending',
        message: 'Return request submitted',
        timestamp: new Date(),
        updatedBy: input.actor.userId || undefined,
        actorRole: input.actor.role,
      },
    ],
    ...(input.override
      ? {
          policyOverride: {
            by: input.actor.userId,
            at: new Date(),
            reason: input.override.reason,
            waivedCodes: input.override.waivedCodes,
          },
        }
      : {}),
  });

  await createAuditLog({
    userId: input.actor.userId || 'system',
    action: 'CREATE',
    resource: AUDIT_RESOURCE,
    resourceId: String(created._id),
    metadata: {
      requestId,
      orderNumber: input.context.orderNumber,
      type: input.type,
      lineCount: input.lines.length,
      actorRole: input.actor.role,
      // An exceptional acceptance has to be visible in the log, not only on the
      // document.
      policyOverride: input.override || null,
    },
    ipAddress: input.actor.ipAddress,
  });

  // Non-fatal: a notification failure must not lose the customer's request.
  await notifyCustomerReturnSubmitted({
    userId: input.context.customerId,
    requestId,
    orderNumber: input.context.orderNumber,
  }).catch((error) => {
    console.error('[returns] submitted notification failed:', error);
  });

  return {
    ok: true,
    data: { requestId, id: String(created._id), status: 'pending' },
  };
}

export interface UpdateReturnInput {
  /** `_id` or `requestId` — the admin list holds one, deep links carry the other. */
  identifier: string;
  status?: string;
  message?: string;
  adminNotes?: string;
  refundAmount?: number;
  refundMethod?: string;
  trackingNumber?: string;
  courierName?: string;
  actor: ReturnActor;
}

export async function updateReturnRequest(
  input: UpdateReturnInput,
): Promise<ServiceResult<Record<string, unknown>>> {
  await connectDB();

  const returnRequest = await findByIdentifier(input.identifier);
  if (!returnRequest) {
    return { ok: false, status: 404, error: 'Return request not found' };
  }

  const from = returnRequest.status as ReturnStatus;
  const wantsTransition = input.status !== undefined && input.status !== from;

  if (input.status !== undefined && !isReturnStatus(input.status)) {
    return { ok: false, status: 400, error: 'Unknown return status' };
  }

  if (wantsTransition) {
    const to = input.status as ReturnStatus;

    if (!canTransition(from, to)) {
      return {
        ok: false,
        status: 409,
        error: `Cannot move a return from "${from}" to "${to}"`,
        details: { from, to },
      };
    }

    const missing = missingTransitionFields(to, { ...input } as Record<string, unknown>);
    if (missing.length > 0) {
      return {
        ok: false,
        status: 400,
        error: `Missing required field(s) for "${to}": ${missing.join(', ')}`,
        details: { missing },
      };
    }
  }

  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const record = (field: string, next: unknown) => {
    const current = (returnRequest as Record<string, any>)[field];
    if (next === undefined || next === current) return;
    changes.push({ field, oldValue: current, newValue: next });
    (returnRequest as Record<string, any>)[field] = next;
  };

  record('adminNotes', input.adminNotes?.trim());
  record('refundAmount', input.refundAmount);
  record('refundMethod', input.refundMethod);
  record('trackingNumber', input.trackingNumber?.trim());
  record('courierName', input.courierName?.trim());

  if (wantsTransition) {
    const to = input.status as ReturnStatus;
    changes.push({ field: 'status', oldValue: from, newValue: to });
    returnRequest.status = to;

    // Always appended, with the actor — a timeline missing who acted is not an
    // audit trail.
    returnRequest.statusHistory.push({
      status: to,
      message: input.message?.trim() || `Status updated to ${to}`,
      timestamp: new Date(),
      updatedBy: input.actor.userId || undefined,
      actorRole: input.actor.role,
    });
  }

  if (changes.length === 0) {
    return { ok: true, data: serializeReturnRequest(returnRequest) };
  }

  await returnRequest.save();

  await createAuditLog({
    userId: input.actor.userId || 'system',
    action: wantsTransition ? 'STATUS_CHANGE' : 'UPDATE',
    resource: AUDIT_RESOURCE,
    resourceId: String(returnRequest._id),
    changes,
    metadata: {
      requestId: returnRequest.requestId,
      actorRole: input.actor.role,
    },
    ipAddress: input.actor.ipAddress,
  });

  if (wantsTransition) {
    await notifyCustomerReturnStatusChanged({
      userId: returnRequest.userId ? String(returnRequest.userId) : null,
      requestId: String(returnRequest.requestId),
      status: returnRequest.status,
      previousStatus: from,
    }).catch((error) => {
      console.error('[returns] status notification failed:', error);
    });
  }

  return { ok: true, data: serializeReturnRequest(returnRequest) };
}

export async function deleteReturnRequests(
  identifiers: string[],
  actor: ReturnActor,
): Promise<ServiceResult<{ deletedCount: number }>> {
  await connectDB();

  const found = await ReturnRequest.find({
    $or: [{ _id: { $in: identifiers.filter(isObjectId) } }, { requestId: { $in: identifiers } }],
  })
    .select('_id requestId')
    .lean<Array<Record<string, any>>>();

  if (found.length === 0) {
    return { ok: false, status: 404, error: 'No matching return requests' };
  }

  const ids = found.map((doc) => doc._id);
  const result = await ReturnRequest.deleteMany({ _id: { $in: ids } });

  await createAuditLog({
    userId: actor.userId || 'system',
    action: 'DELETE',
    resource: AUDIT_RESOURCE,
    resourceId: found.length === 1 ? String(found[0]._id) : 'bulk',
    metadata: {
      requestIds: found.map((doc) => doc.requestId),
      deletedCount: result.deletedCount || 0,
    },
    ipAddress: actor.ipAddress,
  });

  return { ok: true, data: { deletedCount: result.deletedCount || 0 } };
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;
const isObjectId = (value: string) => OBJECT_ID.test(value);

async function findByIdentifier(identifier: string) {
  const or: Array<Record<string, unknown>> = [{ requestId: identifier }];
  // A non-ObjectId string in an `_id` clause makes Mongoose throw a CastError,
  // so it is only included when it could actually match.
  if (isObjectId(identifier)) or.unshift({ _id: identifier });
  return ReturnRequest.findOne({ $or: or });
}

/** The shape every returns endpoint responds with. */
export function serializeReturnRequest(doc: any): Record<string, unknown> {
  return {
    _id: String(doc._id),
    requestId: doc.requestId,
    orderId: doc.orderId,
    customerName: doc.customerName,
    email: doc.email,
    phone: doc.phone || '',
    type: doc.type,
    reason: doc.reason,
    details: doc.details || '',
    products: (doc.products || []).map((line: any) => ({
      productId: line.productId ? String(line.productId) : null,
      productName: line.productName,
      quantity: line.quantity,
      variant: line.variant || null,
      reason: line.reason,
      details: line.details || '',
    })),
    attachments: doc.attachments || [],
    status: doc.status,
    statusHistory: (doc.statusHistory || []).map((entry: any) => ({
      status: entry.status,
      message: entry.message,
      timestamp: new Date(entry.timestamp).toISOString(),
      actorRole: entry.actorRole || null,
    })),
    adminNotes: doc.adminNotes || '',
    refundAmount: typeof doc.refundAmount === 'number' ? doc.refundAmount : null,
    refundMethod: doc.refundMethod || null,
    trackingNumber: doc.trackingNumber || null,
    courierName: doc.courierName || null,
    policyOverride: doc.policyOverride?.at
      ? {
          at: new Date(doc.policyOverride.at).toISOString(),
          reason: doc.policyOverride.reason || '',
          waivedCodes: doc.policyOverride.waivedCodes || [],
        }
      : null,
    createdAt: new Date(doc.createdAt).toISOString(),
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

/**
 * The customer-facing projection.
 *
 * `adminNotes` is internal deliberation and never leaves the admin surface; the
 * public tracker used to return the whole document, notes included.
 */
export function serializeReturnRequestForCustomer(
  doc: any,
): Record<string, unknown> {
  const { adminNotes: _adminNotes, policyOverride: _override, ...rest } =
    serializeReturnRequest(doc);
  return rest;
}
