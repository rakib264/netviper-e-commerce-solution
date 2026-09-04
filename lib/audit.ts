import AuditLog from '@/lib/models/AuditLog';
import connectDB from '@/lib/mongodb';

export interface AuditLogData {
  userId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Array<{
    field: string;
    oldValue: any;
    newValue: any;
  }>;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

export async function createAuditLog(data: AuditLogData): Promise<void> {
  try {
    await connectDB();
    
    const auditLogData: any = {
      user: data.userId,
      action: data.action,
      resource: data.resource,
      changes: data.changes || [],
      metadata: data.metadata || {},
      ipAddress: data.ipAddress
    };

    // Only add resourceId if provided
    if (data.resourceId) {
      auditLogData.resourceId = data.resourceId;
    }

    await AuditLog.create(auditLogData);
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw error to avoid breaking the main operation
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return '127.0.0.1';
}
