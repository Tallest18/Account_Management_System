'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Badge, Card, Modal, Input, Select, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { createPayment, getPayments, getContacts, getAccounts } from '@/lib/db';
import { Payment, Contact, Account } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, CreditCard } from 'lucide-react';

const methodLabels: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer', check: 'Check', card: 'Card', other: 'Other',
};

export default function PaymentsPage() {
  const { user, company } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'received' as 'received' | 'made',
    contactId: '', date: new Date().toISOString().slice(0, 10),
    amount: '', method: 'bank_transfer' as Payment['method'],
    accountId: '', reference: '', notes: '',
  });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const actor = { uid: user!.uid, email: user!.email, name: user!.displayName };

  const load = useCallback(async () => {
    if (!user) return;
    const [pmts, ctcs, accs] = await Promise.all([
      getPayments(user.companyId),
      getContacts(user.companyId),
      getAccounts(user.companyId),
    ]);
    setPayments(pmts);
    setContacts(ctcs);
    setAccounts(accs.filter((a) => a.type === 'asset'));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!form.contactId || !form.amount || !form.accountId) return;
    setSaving(true);
    const contact = contacts.find((c) => c.id === form.contactId);
    const account = accounts.find((a) => a.id === form.accountId);
    try {
      await createPayment({
        companyId: user!.companyId,
        type: form.type,
        contactId: form.contactId,
        contactName: contact?.name ?? '',
        date: form.date,
        amount: parseFloat(form.amount),
        method: form.method,
        reference: form.reference,
        accountId: form.accountId,
        accountName: account?.name ?? '',
        notes: form.notes,
        createdBy: user!.uid,
      }, actor);
      setShowForm(false);
      setForm({ type: 'received', contactId: '', date: new Date().toISOString().slice(0, 10), amount: '', method: 'bank_transfer', accountId: '', reference: '', notes: '' });
      load();
    } finally { setSaving(false); }
  };

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Payments"
          subtitle="Track money received and money paid out"
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              Record Payment
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <Card padding={false}>
            {payments.length === 0 ? (
              <EmptyState icon={<CreditCard className="w-10 h-10" />} title="No payments recorded"
                description="Record your first payment to start tracking cash flow."
                action={<Button onClick={() => setShowForm(true)}>Record Payment</Button>} />
            ) : (
              <table className="ledger-table">
                <thead>
                  <tr><th>Payment #</th><th>Date</th><th>Type</th><th>Contact</th><th>Method</th><th>Account</th><th className="text-right">Amount</th></tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="font-mono text-xs text-[--accent-2]">{p.paymentNumber}</td>
                      <td className="text-xs text-[--text-3]">{formatDate(p.date)}</td>
                      <td><Badge variant={p.type === 'received' ? 'green' : 'red'}>{p.type}</Badge></td>
                      <td>{p.contactName}</td>
                      <td className="text-xs text-[--text-3]">{methodLabels[p.method]}</td>
                      <td className="text-xs text-[--text-3]">{p.accountName}</td>
                      <td className={`text-right font-mono font-bold text-sm ${p.type === 'received' ? 'text-[--green]' : 'text-[--red]'}`}>
                        {p.type === 'received' ? '+' : '-'}{formatCurrency(p.amount, company?.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Record Payment" size="md">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Select label="Payment Type" value={form.type} onChange={set('type')}
              options={[{ value: 'received', label: 'Money Received' }, { value: 'made', label: 'Money Paid Out' }]} />
            <Input label="Date" type="date" value={form.date} onChange={set('date')} />
          </div>
          <Select label={form.type === 'received' ? 'Customer *' : 'Vendor *'} value={form.contactId} onChange={set('contactId')}
            options={[{ value: '', label: '— Select contact —' }, ...contacts.map((c) => ({ value: c.id, label: c.name }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount *" type="number" min="0" step="0.01" placeholder="0.00" value={form.amount} onChange={set('amount')} />
            <Select label="Payment Method" value={form.method} onChange={set('method')}
              options={[
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'cash', label: 'Cash' },
                { value: 'check', label: 'Check' },
                { value: 'card', label: 'Card' },
                { value: 'other', label: 'Other' },
              ]} />
          </div>
          <Select label="Deposit/Payment Account *" value={form.accountId} onChange={set('accountId')}
            options={[{ value: '', label: '— Select account —' }, ...accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` }))]} />
          <Input label="Reference" placeholder="Check #, transaction ID..." value={form.reference} onChange={set('reference')} />
          <Input label="Notes" placeholder="Optional notes" value={form.notes} onChange={set('notes')} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saving} disabled={!form.contactId || !form.amount || !form.accountId} onClick={handleSave}>
              Record Payment
            </Button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}
