'use client';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Badge, Card, Modal, Input, Select, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { subscribeToContacts, createContact, updateContact } from '@/lib/db';
import { Contact } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Users, Edit } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function ContactsPage({ type }: { type: 'customer' | 'vendor' }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', taxId: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const actor = { uid: user!.uid, email: user!.email, name: user!.displayName };

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToContacts(user.companyId, (data) => {
      setContacts(data.filter((c) => c.type === type || c.type === 'both'));
      setLoading(false);
    });
    return unsub;
  }, [user, type]);

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', taxId: c.taxId ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editContact) {
        await updateContact(editContact.id, form, actor, user!.companyId);
      } else {
        await createContact({ ...form, companyId: user!.companyId, type, isActive: true, createdBy: user!.uid }, actor);
      }
      setShowForm(false);
      setEditContact(null);
      setForm({ name: '', email: '', phone: '', address: '', taxId: '' });
    } finally { setSaving(false); }
  };

  const filtered = contacts.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase()));
  const title = type === 'customer' ? 'Customers' : 'Vendors';

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title={title}
          subtitle={`Manage your ${title.toLowerCase()}`}
          action={
            <div className="flex gap-3">
              <input className="input-field w-48 text-sm py-2" placeholder={`Search ${title.toLowerCase()}...`} value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditContact(null); setShowForm(true); }}>
                New {type === 'customer' ? 'Customer' : 'Vendor'}
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <Card padding={false}>
            {filtered.length === 0 ? (
              <EmptyState icon={<Users className="w-10 h-10" />} title={`No ${title.toLowerCase()} yet`}
                description={`Add your first ${type} to start tracking transactions.`}
                action={<Button onClick={() => setShowForm(true)}>Add {type === 'customer' ? 'Customer' : 'Vendor'}</Button>} />
            ) : (
              <table className="ledger-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Tax ID</th><th className="text-right">Balance</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td className="text-xs text-[--text-3]">{c.email ?? '—'}</td>
                      <td className="text-xs text-[--text-3]">{c.phone ?? '—'}</td>
                      <td className="font-mono text-xs text-[--text-3]">{c.taxId ?? '—'}</td>
                      <td className={`text-right font-mono text-sm ${c.balance >= 0 ? 'text-[--green]' : 'text-[--red]'}`}>{formatCurrency(c.balance)}</td>
                      <td><Badge variant={c.isActive ? 'green' : 'default'}>{c.isActive ? 'Active' : 'Inactive'}</Badge></td>
                      <td>
                        <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]">
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditContact(null); }}
        title={editContact ? `Edit ${type}` : `New ${type === 'customer' ? 'Customer' : 'Vendor'}`} size="md">
        <div className="flex flex-col gap-4">
          <Input label="Name *" placeholder="Full name or company name" value={form.name} onChange={set('name')} required />
          <Input label="Email" type="email" placeholder="contact@example.com" value={form.email} onChange={set('email')} />
          <Input label="Phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set('phone')} />
          <Input label="Address" placeholder="Street, City, Country" value={form.address} onChange={set('address')} />
          <Input label="Tax ID / VAT" placeholder="Tax identification number" value={form.taxId} onChange={set('taxId')} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saving} disabled={!form.name} onClick={handleSave}>
              {editContact ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}
