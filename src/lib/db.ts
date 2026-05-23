import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  writeBatch,
  increment,
  QueryConstraint,
  DocumentSnapshot,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import { createAuditLog, diffObjects } from './audit';
import {
  Account,
  JournalEntry,
  JournalLine,
  Invoice,
  Contact,
  Payment,
  User,
  Company,
} from '@/types';
import { roundTo2 } from './utils';

// ─── Generic helpers ──────────────────────────────────────────────────────────
function docToData<T>(snap: DocumentSnapshot): T | null {
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T;
}

function snapshotToList<T>(snap: QuerySnapshot): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
}

// ─── Company ──────────────────────────────────────────────────────────────────
export async function getCompany(companyId: string): Promise<Company | null> {
  const snap = await getDoc(doc(db, 'companies', companyId));
  return docToData<Company>(snap);
}

export async function updateCompany(
  companyId: string,
  data: Partial<Company>,
  actor: { uid: string; email: string; name: string }
): Promise<void> {
  const ref = doc(db, 'companies', companyId);
  const old = (await getDoc(ref)).data() ?? {};
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'update', module: 'Settings',
    entityId: companyId, entityType: 'company',
    description: 'Company settings updated',
    changes: diffObjects(old as Record<string, unknown>, data as Record<string, unknown>),
    severity: 'info',
  });
}

// ─── Accounts ─────────────────────────────────────────────────────────────────
export async function getAccounts(companyId: string): Promise<Account[]> {
  const q = query(
    collection(db, 'accounts'),
    where('companyId', '==', companyId),
    orderBy('code')
  );
  return snapshotToList<Account>(await getDocs(q));
}

export async function createAccount(
  data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>,
  actor: { uid: string; email: string; name: string }
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, 'accounts'), {
    ...data,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId: data.companyId, action: 'create', module: 'Accounts',
    entityId: ref.id, entityType: 'account',
    description: `Account "${data.name}" (${data.code}) created`,
  });
  return ref.id;
}

export async function updateAccount(
  accountId: string,
  data: Partial<Account>,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'accounts', accountId);
  const old = (await getDoc(ref)).data() ?? {};
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'update', module: 'Accounts',
    entityId: accountId, entityType: 'account',
    description: `Account "${old.name}" updated`,
    changes: diffObjects(old as Record<string, unknown>, data as Record<string, unknown>),
  });
}

export function subscribeToAccounts(
  companyId: string,
  callback: (accounts: Account[]) => void
): () => void {
  const q = query(
    collection(db, 'accounts'),
    where('companyId', '==', companyId),
    orderBy('code')
  );
  return onSnapshot(q, (snap) => callback(snapshotToList<Account>(snap)));
}

// ─── Journal Entries ──────────────────────────────────────────────────────────
export async function getJournalEntries(
  companyId: string,
  constraints: QueryConstraint[] = []
): Promise<JournalEntry[]> {
  const q = query(
    collection(db, 'journal_entries'),
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
    ...constraints
  );
  return snapshotToList<JournalEntry>(await getDocs(q));
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const snap = await getDoc(doc(db, 'journal_entries', id));
  return docToData<JournalEntry>(snap);
}

export async function createJournalEntry(
  data: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt' | 'entryNumber'>,
  actor: { uid: string; email: string; name: string }
): Promise<string> {
  const now = new Date().toISOString();
  const countersRef = doc(db, 'counters', `${data.companyId}_je`);
  const batch = writeBatch(db);

  const counterSnap = await getDoc(countersRef);
  const seq = ((counterSnap.data()?.value ?? 0) as number) + 1;
  batch.set(countersRef, { value: seq }, { merge: true });

  const entryNumber = `JE-${String(seq).padStart(6, '0')}`;
  const totalDebit = roundTo2(data.lines.reduce((s, l) => s + l.debit, 0));
  const totalCredit = roundTo2(data.lines.reduce((s, l) => s + l.credit, 0));

  const entryRef = doc(collection(db, 'journal_entries'));
  batch.set(entryRef, {
    ...data,
    entryNumber,
    totalDebit,
    totalCredit,
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  if (data.status === 'posted') {
    await updateAccountBalances(data.lines, data.companyId, 1);
  }

  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId: data.companyId, action: 'create', module: 'Journal',
    entityId: entryRef.id, entityType: 'journal_entry',
    description: `Journal entry ${entryNumber} created — ${data.description}`,
  });

  return entryRef.id;
}

export async function postJournalEntry(
  entryId: string,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'journal_entries', entryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Entry not found');
  const entry = snap.data() as JournalEntry;
  if (entry.status !== 'draft') throw new Error('Only draft entries can be posted');

  const now = new Date().toISOString();
  await updateDoc(ref, {
    status: 'posted',
    postedAt: now,
    postedBy: actor.uid,
    updatedAt: now,
    updatedBy: actor.uid,
  });

  await updateAccountBalances(entry.lines, companyId, 1);

  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'post', module: 'Journal',
    entityId: entryId, entityType: 'journal_entry',
    description: `Journal entry ${entry.entryNumber} posted`,
    severity: 'info',
  });
}

export async function voidJournalEntry(
  entryId: string,
  reason: string,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'journal_entries', entryId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Entry not found');
  const entry = snap.data() as JournalEntry;
  if (entry.status !== 'posted') throw new Error('Only posted entries can be voided');

  const now = new Date().toISOString();
  await updateDoc(ref, {
    status: 'voided',
    voidedAt: now,
    voidedBy: actor.uid,
    voidReason: reason,
    updatedAt: now,
    updatedBy: actor.uid,
  });

  await updateAccountBalances(entry.lines, companyId, -1);

  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'void', module: 'Journal',
    entityId: entryId, entityType: 'journal_entry',
    description: `Journal entry ${entry.entryNumber} voided — ${reason}`,
    severity: 'warning',
  });
}

export async function updateJournalEntry(
  entryId: string,
  data: Partial<JournalEntry>,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'journal_entries', entryId);
  const old = (await getDoc(ref)).data() ?? {};
  if ((old as JournalEntry).status !== 'draft') {
    throw new Error('Only draft entries can be edited');
  }
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString(), updatedBy: actor.uid });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'update', module: 'Journal',
    entityId: entryId, entityType: 'journal_entry',
    description: `Journal entry ${(old as JournalEntry).entryNumber} updated`,
    changes: diffObjects(old as Record<string, unknown>, data as Record<string, unknown>),
  });
}

async function updateAccountBalances(
  lines: JournalLine[],
  companyId: string,
  multiplier: 1 | -1
): Promise<void> {
  const batch = writeBatch(db);
  for (const line of lines) {
    const accountRef = doc(db, 'accounts', line.accountId);
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) continue;
    const account = accountSnap.data() as Account;

    let balanceDelta = 0;
    if (account.type === 'asset' || account.type === 'expense') {
      balanceDelta = (line.debit - line.credit) * multiplier;
    } else {
      balanceDelta = (line.credit - line.debit) * multiplier;
    }

    batch.update(accountRef, {
      balance: increment(balanceDelta),
      updatedAt: new Date().toISOString(),
    });
  }
  await batch.commit();
}

export function subscribeToJournalEntries(
  companyId: string,
  callback: (entries: JournalEntry[]) => void,
  constraints: QueryConstraint[] = []
): () => void {
  const q = query(
    collection(db, 'journal_entries'),
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
    limit(100),
    ...constraints
  );
  return onSnapshot(q, (snap) => callback(snapshotToList<JournalEntry>(snap)));
}

// ─── Contacts ─────────────────────────────────────────────────────────────────
export async function getContacts(companyId: string): Promise<Contact[]> {
  const q = query(
    collection(db, 'contacts'),
    where('companyId', '==', companyId),
    orderBy('name')
  );
  return snapshotToList<Contact>(await getDocs(q));
}

export async function createContact(
  data: Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | 'balance'>,
  actor: { uid: string; email: string; name: string }
): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, 'contacts'), {
    ...data,
    balance: 0,
    createdAt: now,
    updatedAt: now,
  });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId: data.companyId, action: 'create', module: 'Contacts',
    entityId: ref.id, entityType: 'contact',
    description: `Contact "${data.name}" created`,
  });
  return ref.id;
}

export async function updateContact(
  contactId: string,
  data: Partial<Contact>,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'contacts', contactId);
  const old = (await getDoc(ref)).data() ?? {};
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString() });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'update', module: 'Contacts',
    entityId: contactId, entityType: 'contact',
    description: `Contact "${old.name}" updated`,
    changes: diffObjects(old as Record<string, unknown>, data as Record<string, unknown>),
  });
}

export function subscribeToContacts(
  companyId: string,
  callback: (contacts: Contact[]) => void
): () => void {
  const q = query(
    collection(db, 'contacts'),
    where('companyId', '==', companyId),
    orderBy('name')
  );
  return onSnapshot(q, (snap) => callback(snapshotToList<Contact>(snap)));
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export async function getInvoices(
  companyId: string,
  type?: 'sales' | 'purchase'
): Promise<Invoice[]> {
  const constraints: QueryConstraint[] = [
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
  ];
  if (type) constraints.push(where('type', '==', type));
  const q = query(collection(db, 'invoices'), ...constraints);
  return snapshotToList<Invoice>(await getDocs(q));
}

export async function createInvoice(
  data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'invoiceNumber'>,
  actor: { uid: string; email: string; name: string }
): Promise<string> {
  const now = new Date().toISOString();
  const prefix = data.type === 'sales' ? 'INV' : 'PUR';
  const countersRef = doc(db, 'counters', `${data.companyId}_${prefix}`);
  const counterSnap = await getDoc(countersRef);
  const seq = ((counterSnap.data()?.value ?? 0) as number) + 1;
  await setDoc(countersRef, { value: seq }, { merge: true });
  const invoiceNumber = `${prefix}-${String(seq).padStart(6, '0')}`;

  const ref = await addDoc(collection(db, 'invoices'), {
    ...data,
    invoiceNumber,
    createdAt: now,
    updatedAt: now,
  });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId: data.companyId, action: 'create', module: 'Invoices',
    entityId: ref.id, entityType: 'invoice',
    description: `${data.type === 'sales' ? 'Invoice' : 'Purchase'} ${invoiceNumber} created for ${data.contactName}`,
  });
  return ref.id;
}

export async function updateInvoice(
  invoiceId: string,
  data: Partial<Invoice>,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'invoices', invoiceId);
  const old = (await getDoc(ref)).data() ?? {};
  await updateDoc(ref, { ...data, updatedAt: new Date().toISOString(), updatedBy: actor.uid });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'update', module: 'Invoices',
    entityId: invoiceId, entityType: 'invoice',
    description: `Invoice ${(old as Invoice).invoiceNumber} updated`,
    changes: diffObjects(old as Record<string, unknown>, data as Record<string, unknown>),
  });
}

export function subscribeToInvoices(
  companyId: string,
  type: 'sales' | 'purchase' | undefined,
  callback: (invoices: Invoice[]) => void
): () => void {
  const constraints: QueryConstraint[] = [
    where('companyId', '==', companyId),
    orderBy('date', 'desc'),
  ];
  if (type) constraints.push(where('type', '==', type));
  const q = query(collection(db, 'invoices'), ...constraints);
  return onSnapshot(q, (snap) => callback(snapshotToList<Invoice>(snap)));
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export async function createPayment(
  data: Omit<Payment, 'id' | 'createdAt' | 'updatedAt' | 'paymentNumber'>,
  actor: { uid: string; email: string; name: string }
): Promise<string> {
  const now = new Date().toISOString();
  const prefix = data.type === 'received' ? 'REC' : 'PMT';
  const countersRef = doc(db, 'counters', `${data.companyId}_${prefix}`);
  const counterSnap = await getDoc(countersRef);
  const seq = ((counterSnap.data()?.value ?? 0) as number) + 1;
  await setDoc(countersRef, { value: seq }, { merge: true });
  const paymentNumber = `${prefix}-${String(seq).padStart(6, '0')}`;

  const ref = await addDoc(collection(db, 'payments'), {
    ...data,
    paymentNumber,
    createdAt: now,
    updatedAt: now,
  });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId: data.companyId, action: 'create', module: 'Payments',
    entityId: ref.id, entityType: 'payment',
    description: `Payment ${paymentNumber} of ${data.amount} ${data.type} for ${data.contactName}`,
  });
  return ref.id;
}

export async function getPayments(companyId: string): Promise<Payment[]> {
  const q = query(
    collection(db, 'payments'),
    where('companyId', '==', companyId),
    orderBy('date', 'desc')
  );
  return snapshotToList<Payment>(await getDocs(q));
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function getUser(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  return docToData<User>(snap);
}

export async function createUser(user: User): Promise<void> {
  await setDoc(doc(db, 'users', user.uid), user);
}

export async function updateUser(
  uid: string,
  data: Partial<User>,
  actor: { uid: string; email: string; name: string },
  companyId: string
): Promise<void> {
  const ref = doc(db, 'users', uid);
  const old = (await getDoc(ref)).data() ?? {};
  await updateDoc(ref, { ...data });
  await createAuditLog({
    userId: actor.uid, userEmail: actor.email, userName: actor.name,
    companyId, action: 'update', module: 'Users',
    entityId: uid, entityType: 'user',
    description: `User ${(old as User).email} updated`,
    changes: diffObjects(old as Record<string, unknown>, data as Record<string, unknown>),
    severity: data.role ? 'warning' : 'info',
  });
}

export async function getCompanyUsers(companyId: string): Promise<User[]> {
  const q = query(
    collection(db, 'users'),
    where('companyId', '==', companyId)
  );
  return snapshotToList<User>(await getDocs(q));
}

// ─── Ledger / Transactions by Account ────────────────────────────────────────
export interface Transaction {
  id: string;
  date: string;
  description: string;
  memo?: string;
  reference?: string;
  debit: number;
  credit: number;
  entryNumber: string;
  journalEntryId: string;
}

export async function getTransactionsByAccount(
  companyId: string,
  accountId: string
): Promise<Transaction[]> {
  const q = query(
    collection(db, 'journal_entries'),
    where('companyId', '==', companyId),
    where('status', '==', 'posted'),
    orderBy('date', 'asc')
  );

  const snap = await getDocs(q);
  const transactions: Transaction[] = [];

  snap.docs.forEach((d) => {
    const entry = { id: d.id, ...d.data() } as JournalEntry;
    entry.lines
      .filter((line) => line.accountId === accountId)
      .forEach((line, idx) => {
        transactions.push({
          id: `${entry.id}_${idx}`,
          date: entry.date,
          description: entry.description,
          memo: (line as JournalLine & { description?: string }).description ?? undefined,
          reference: entry.entryNumber,
          debit: line.debit ?? 0,
          credit: line.credit ?? 0,
          entryNumber: entry.entryNumber,
          journalEntryId: entry.id,
        });
      });
  });

  return transactions;
}