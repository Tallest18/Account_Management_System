import {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { createAuditLog } from './audit';
import { User } from '@/types';

export interface Invite {
  id: string;
  companyId: string;
  companyName: string;
  email: string;
  name: string;
  role: 'accountant' | 'viewer' | 'admin';
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  createdByName: string;
  acceptedAt?: string;
}

// Generate a secure random token
function generateToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createInvite(
  params: {
    email: string;
    name: string;
    role: Invite['role'];
    companyId: string;
    companyName: string;
  },
  actor: { uid: string; email: string; name: string }
): Promise<Invite> {
  // Check if there's already a pending invite for this email in this company
  const existing = query(
    collection(db, 'invites'),
    where('companyId', '==', params.companyId),
    where('email', '==', params.email.toLowerCase()),
    where('status', '==', 'pending')
  );
  const snap = await getDocs(existing);
  if (!snap.empty) {
    throw new Error(`A pending invite already exists for ${params.email}`);
  }

  // Check if user already exists in this company
  const usersQ = query(
    collection(db, 'users'),
    where('companyId', '==', params.companyId),
    where('email', '==', params.email.toLowerCase())
  );
  const usersSnap = await getDocs(usersQ);
  if (!usersSnap.empty) {
    throw new Error(`${params.email} is already a member of this company`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite: Omit<Invite, 'id'> = {
    companyId: params.companyId,
    companyName: params.companyName,
    email: params.email.toLowerCase(),
    name: params.name,
    role: params.role,
    token: generateToken(),
    status: 'pending',
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    createdBy: actor.uid,
    createdByName: actor.name,
  };

  const ref = await addDoc(collection(db, 'invites'), {
    ...invite,
    _timestamp: Timestamp.now(),
  });

  await createAuditLog({
    userId: actor.uid,
    userEmail: actor.email,
    userName: actor.name,
    companyId: params.companyId,
    action: 'create',
    module: 'Users',
    entityId: ref.id,
    entityType: 'invite',
    description: `Invite sent to ${params.email} as ${params.role}`,
    severity: 'info',
  });

  return { id: ref.id, ...invite };
}

export async function getInviteByToken(token: string): Promise<Invite | null> {
  const q = query(collection(db, 'invites'), where('token', '==', token));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...(d.data() as Omit<Invite, 'id'>) };
}

export async function getCompanyInvites(companyId: string): Promise<Invite[]> {
  const q = query(
    collection(db, 'invites'),
    where('companyId', '==', companyId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Invite, 'id'>) }));
}

export async function acceptInvite(
  token: string,
  password: string
): Promise<{ companyId: string; email: string; name: string; role: Invite['role'] }> {
  const invite = await getInviteByToken(token);
  if (!invite) throw new Error('Invalid invite link');
  if (invite.status !== 'pending') throw new Error('This invite has already been used');
  if (new Date() > new Date(invite.expiresAt)) {
    await updateDoc(doc(db, 'invites', invite.id), { status: 'expired' });
    throw new Error('This invite link has expired. Ask your admin to resend it.');
  }

  // Mark invite as accepted
  await updateDoc(doc(db, 'invites', invite.id), {
    status: 'accepted',
    acceptedAt: new Date().toISOString(),
  });

  return {
    companyId: invite.companyId,
    email: invite.email,
    name: invite.name,
    role: invite.role,
  };
}

export async function revokeInvite(
  inviteId: string,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  await updateDoc(doc(db, 'invites', inviteId), { status: 'expired' });
  await createAuditLog({
    userId: actor.uid,
    userEmail: actor.email,
    userName: actor.name,
    companyId,
    action: 'delete',
    module: 'Users',
    entityId: inviteId,
    entityType: 'invite',
    description: `Invite revoked`,
    severity: 'warning',
  });
}
