'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Badge, Card, Modal, Input, Select, Textarea, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { subscribeToInvoices, createInvoice, updateInvoice, getContacts, getAccounts } from '@/lib/db';
import { Invoice, InvoiceItem, Contact, Account } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import { Plus, FileText, Trash2, Eye, Edit } from 'lucide-react';

const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'default' | 'blue'> = {
  paid: 'green', partial: 'yellow', overdue: 'red', voided: 'red', sent: 'blue', draft: 'default',
};

function newItem(): InvoiceItem {
  return { id: generateId(), description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, amount: 0, accountId: '' };
}

export default function SalesInvoicesPage() {
  const { user, company } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    contactId: '', date: new Date().toISOString().slice(0, 10),
    dueDate: '', notes: '', terms: 'Net 30',
  });
  const [items, setItems] = useState<InvoiceItem[]>([newItem()]);

  const actor = { uid: user!.uid, email: user!.email, name: user!.displayName };

  useEffect(() => {
    if (!user) return;
    getContacts(user.companyId).then(setContacts);
    getAccounts(user.companyId).then(setAccounts);
    const unsub = subscribeToInvoices(user.companyId, 'sales', (data) => {
      setInvoices(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const updateItem = (id: string, key: keyof InvoiceItem, val: string | number) => {
    setItems((items) => items.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [key]: val };
      updated.amount = updated.quantity * updated.unitPrice * (1 - updated.discount / 100);
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = items.reduce((s, i) => s + i.amount * (i.taxRate / 100), 0);
  const total = subtotal + taxAmount;

  const handleSave = async (status: Invoice['status']) => {
    if (!form.contactId) return;
    setSaving(true);
    const contact = contacts.find((c) => c.id === form.contactId);
    try {
      await createInvoice({
        companyId: user!.companyId,
        type: 'sales',
        contactId: form.contactId,
        contactName: contact?.name ?? '',
        date: form.date,
        dueDate: form.dueDate,
        status,
        items,
        subtotal,
        taxAmount,
        discountAmount: 0,
        total,
        amountPaid: 0,
        balance: total,
        notes: form.notes,
        terms: form.terms,
        createdBy: user!.uid,
        updatedBy: user!.uid,
      }, actor);
      setShowForm(false);
      setForm({ contactId: '', date: new Date().toISOString().slice(0, 10), dueDate: '', notes: '', terms: 'Net 30' });
      setItems([newItem()]);
    } finally { setSaving(false); }
  };

  const revenueAccounts = accounts.filter((a) => a.type === 'revenue');

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Sales Invoices"
          subtitle="Manage customer invoices and payments"
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              New Invoice
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <Card padding={false}>
            {invoices.length === 0 ? (
              <EmptyState icon={<FileText className="w-10 h-10" />} title="No invoices yet"
                description="Create your first invoice to start tracking sales."
                action={<Button onClick={() => setShowForm(true)}>Create Invoice</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due Date</th>
                      <th className="text-right">Total</th><th className="text-right">Balance</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-mono text-xs text-[--accent-2]">{inv.invoiceNumber}</td>
                        <td>{inv.contactName}</td>
                        <td className="text-xs text-[--text-3]">{formatDate(inv.date)}</td>
                        <td className="text-xs text-[--text-3]">{formatDate(inv.dueDate)}</td>
                        <td className="text-right font-mono text-sm">{formatCurrency(inv.total, company?.currency)}</td>
                        <td className="text-right font-mono text-sm font-bold">{formatCurrency(inv.balance, company?.currency)}</td>
                        <td><Badge variant={statusColor[inv.status] ?? 'default'}>{inv.status}</Badge></td>
                        <td>
                          <button onClick={() => setViewInvoice(inv)} className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Invoice Form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="New Invoice" size="xl">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Customer *" value={form.contactId}
              onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
              options={[{ value: '', label: '— Select customer —' }, ...contacts.filter((c) => c.type !== 'vendor').map((c) => ({ value: c.id, label: c.name }))]} />
            <Input label="Invoice Date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            <Input label="Due Date" type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            <Input label="Terms" value={form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[--text-2] uppercase tracking-wider">Line Items</p>
              <button onClick={() => setItems([...items, newItem()])} className="text-xs text-[--accent-2] hover:underline">+ Add item</button>
            </div>
            <div className="border border-[--border] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-[--bg]">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs text-[--text-3] uppercase tracking-wider">Description</th>
                    <th className="text-left px-3 py-2 text-xs text-[--text-3] uppercase tracking-wider w-20">Revenue Acct</th>
                    <th className="text-right px-3 py-2 text-xs text-[--text-3] w-16">Qty</th>
                    <th className="text-right px-3 py-2 text-xs text-[--text-3] w-24">Unit Price</th>
                    <th className="text-right px-3 py-2 text-xs text-[--text-3] w-16">Tax %</th>
                    <th className="text-right px-3 py-2 text-xs text-[--text-3] w-24">Amount</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-[--border]">
                      <td className="px-2 py-1.5">
                        <input className="input-field text-xs py-1.5" placeholder="Description"
                          value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <select className="input-field text-xs py-1.5" value={item.accountId}
                          onChange={(e) => updateItem(item.id, 'accountId', e.target.value)}>
                          <option value="">—</option>
                          {revenueAccounts.map((a) => <option key={a.id} value={a.id} style={{ background: '#161b27' }}>{a.code}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="1" className="input-field text-xs py-1.5 text-right"
                          value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" step="0.01" className="input-field text-xs py-1.5 text-right font-mono"
                          value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0" max="100" className="input-field text-xs py-1.5 text-right"
                          value={item.taxRate} onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)} />
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono text-xs text-[--text]">{formatCurrency(item.amount)}</td>
                      <td className="px-2">
                        {items.length > 1 && (
                          <button onClick={() => setItems(items.filter((i) => i.id !== item.id))} className="text-[--text-3] hover:text-[--red]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-[--bg] border-t border-[--border-2]">
                  <tr><td colSpan={5} className="px-3 py-2 text-xs text-right text-[--text-3]">Subtotal</td><td className="px-3 py-2 text-right font-mono text-sm font-bold text-[--text]">{formatCurrency(subtotal)}</td><td /></tr>
                  <tr><td colSpan={5} className="px-3 py-1 text-xs text-right text-[--text-3]">Tax</td><td className="px-3 py-1 text-right font-mono text-sm text-[--text]">{formatCurrency(taxAmount)}</td><td /></tr>
                  <tr><td colSpan={5} className="px-3 py-2 text-sm text-right font-bold text-[--text]">Total</td><td className="px-3 py-2 text-right font-mono text-lg font-bold text-[--accent-2]">{formatCurrency(total)}</td><td /></tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Notes" placeholder="Thank you for your business" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="ghost" loading={saving} disabled={!form.contactId} onClick={() => handleSave('draft')}>Save Draft</Button>
            <Button loading={saving} disabled={!form.contactId || items[0].amount === 0} onClick={() => handleSave('sent')}>Create & Send</Button>
          </div>
        </div>
      </Modal>

      {/* View Invoice */}
      <Modal open={!!viewInvoice} onClose={() => setViewInvoice(null)} title={`Invoice ${viewInvoice?.invoiceNumber}`} size="lg">
        {viewInvoice && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[--text-3] text-xs mb-0.5">Customer</p><p className="font-semibold">{viewInvoice.contactName}</p></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Status</p><Badge variant={statusColor[viewInvoice.status] ?? 'default'}>{viewInvoice.status}</Badge></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Invoice Date</p><p>{formatDate(viewInvoice.date)}</p></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Due Date</p><p>{formatDate(viewInvoice.dueDate)}</p></div>
            </div>
            <table className="ledger-table">
              <thead><tr><th>Description</th><th className="text-right">Qty</th><th className="text-right">Unit Price</th><th className="text-right">Tax %</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {viewInvoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="text-right font-mono text-xs">{item.quantity}</td>
                    <td className="text-right font-mono text-xs">{formatCurrency(item.unitPrice)}</td>
                    <td className="text-right text-xs">{item.taxRate}%</td>
                    <td className="text-right font-mono text-sm">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td colSpan={4} className="text-right text-xs text-[--text-3] px-3 py-1">Subtotal</td><td className="text-right font-mono px-3 py-1">{formatCurrency(viewInvoice.subtotal)}</td></tr>
                <tr><td colSpan={4} className="text-right text-xs text-[--text-3] px-3 py-1">Tax</td><td className="text-right font-mono px-3 py-1">{formatCurrency(viewInvoice.taxAmount)}</td></tr>
                <tr className="border-t border-[--border-2]"><td colSpan={4} className="text-right font-bold px-3 py-2">Total</td><td className="text-right font-mono font-bold text-lg text-[--accent-2] px-3 py-2">{formatCurrency(viewInvoice.total)}</td></tr>
                <tr><td colSpan={4} className="text-right text-xs text-[--text-3] px-3 py-1">Amount Paid</td><td className="text-right font-mono text-[--green] px-3 py-1">{formatCurrency(viewInvoice.amountPaid)}</td></tr>
                <tr><td colSpan={4} className="text-right font-bold text-[--red] px-3 py-2">Balance Due</td><td className="text-right font-mono font-bold text-[--red] px-3 py-2">{formatCurrency(viewInvoice.balance)}</td></tr>
              </tfoot>
            </table>
            {viewInvoice.notes && <p className="text-sm text-[--text-2]"><span className="text-[--text-3] text-xs">Notes: </span>{viewInvoice.notes}</p>}
          </div>
        )}
      </Modal>
    </AuthGuard>
  );
}
