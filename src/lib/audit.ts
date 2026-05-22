import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { AuditLog, AuditAction, FieldChange } from '@/types';

interface LogParams {
  userId: string;
  userEmail: string;
  userName: string;
  companyId: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  entityType?: string;
  description: string;
  changes?: FieldChange[];
  severity?: 'info' | 'warning' | 'critical';
}

export async function createAuditLog(params: LogParams): Promise<void> {
  try {
    const logEntry: Omit<AuditLog, 'id'> = {
      companyId: params.companyId,
      userId: params.userId,
      userEmail: params.userEmail,
      userName: params.userName,
      action: params.action,
      module: params.module,
      entityId: params.entityId,
      entityType: params.entityType,
      description: params.description,
      changes: params.changes,
      timestamp: new Date().toISOString(),
      severity: params.severity ?? 'info',
      ipAddress: await getClientIP(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
    };

    await addDoc(collection(db, 'audit_logs'), {
      ...logEntry,
      _timestamp: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}

async function getClientIP(): Promise<string> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

export function diffObjects(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): FieldChange[] {
  const changes: FieldChange[] = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  for (const key of allKeys) {
    if (JSON.stringify(oldObj[key]) !== JSON.stringify(newObj[key])) {
      changes.push({ field: key, oldValue: oldObj[key], newValue: newObj[key] });
    }
  }
  return changes;
}

export async function getAuditLogs(
  companyId: string,
  filters: {
    userId?: string;
    module?: string;
    action?: string;
    from?: string;
    to?: string;
  },
  pageSize = 50,
  lastDoc?: DocumentSnapshot
): Promise<{ logs: AuditLog[]; lastVisible: DocumentSnapshot | null }> {
  let q = query(
    collection(db, 'audit_logs'),
    where('companyId', '==', companyId),
    orderBy('_timestamp', 'desc'),
    limit(pageSize)
  );

  if (filters.userId) {
    q = query(q, where('userId', '==', filters.userId));
  }
  if (filters.module) {
    q = query(q, where('module', '==', filters.module));
  }
  if (filters.action) {
    q = query(q, where('action', '==', filters.action));
  }
  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const snapshot = await getDocs(q);
  const logs: AuditLog[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AuditLog, 'id'>),
  }));

  const lastVisible =
    snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null;

  return { logs, lastVisible };
}
