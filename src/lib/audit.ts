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

// Remove all undefined/null values so Firestore never rejects the document
function cleanForFirestore(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined && v !== null)
  );
}

export async function createAuditLog(params: LogParams): Promise<void> {
  try {
    // Skip if companyId or userId is missing/unknown — user not yet authenticated
    if (!params.companyId || params.companyId === 'unknown') return;
    if (!params.userId || params.userId === 'anonymous') return;

    const raw: Record<string, unknown> = {
      companyId:   params.companyId,
      userId:      params.userId,
      userEmail:   params.userEmail,
      userName:    params.userName,
      action:      params.action,
      module:      params.module,
      description: params.description,
      severity:    params.severity ?? 'info',
      timestamp:   new Date().toISOString(),
      _timestamp:  Timestamp.now(),
      userAgent:   typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      // Optional fields — only added if they have a value
      ...(params.entityId   ? { entityId:   params.entityId }   : {}),
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.changes?.length ? { changes: params.changes } : {}),
    };

    await addDoc(collection(db, 'audit_logs'), cleanForFirestore(raw));
  } catch (error) {
    // Log silently — audit failures must never crash the main app
    console.error('Failed to write audit log:', error);
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
      changes.push({ field: key, oldValue: oldObj[key] ?? null, newValue: newObj[key] ?? null });
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
  const constraints: Parameters<typeof query>[1][] = [
    where('companyId', '==', companyId),
    orderBy('_timestamp', 'desc'),
    limit(pageSize),
  ];

  if (filters.userId) constraints.push(where('userId', '==', filters.userId));
  if (filters.module) constraints.push(where('module', '==', filters.module));
  if (filters.action) constraints.push(where('action', '==', filters.action));
  if (lastDoc)        constraints.push(startAfter(lastDoc));

  const q = query(collection(db, 'audit_logs'), ...constraints);
  const snapshot = await getDocs(q);

  const logs: AuditLog[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<AuditLog, 'id'>),
  }));

  const lastVisible =
    snapshot.docs.length === pageSize
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

  return { logs, lastVisible };
}
