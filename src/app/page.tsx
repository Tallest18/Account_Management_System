'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Badge, Card, Modal, Input, Select, EmptyState, Spinner, ConfirmDialog } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { subscribeToAccounts, createAccount, updateAccount } from '@/lib/db';
import { Account, AccountType, AccountCategory } from '@/types';
import { formatCurrency, toTitleCase, groupBy } from '@/lib/utils';
import { Plus, TrendingUp, Edit, ToggleLeft, ToggleRight } from 'lucide-react';

const typeColor: Record<AccountType, 'blue' | 'green' | 'red' | 'purple' | 'yellow'> = {
  asset: 'blue', liability: 'red', equity: 'purple', revenue: 'green', expense: 'yellow',
};

const TYPE_OPTS = ['asset', 'liability', 'equity', 'revenue', 'expense'].map((v) => ({ value: v, label: toTitleCase(v) }));
const CAT_OPTS: Record<AccountType, { value: string; label: string }[]> = {
  asset: ['current_asset', 'fixed_asset', 'other_asset'].map((v) => ({ value: v, label: toTitleCase(v) })),
  liability: ['current_liability', 'long_term_liability'].map((v) => ({ value: v, label: toTitleCase(v) })),
  equity: [{ value: 'equity', label: 'Equity' }],
  revenue: ['revenue', 'other_revenue'].map((v) => ({ value: v, label: toTitleCase(v) })),
  expense: ['cogs', 'operating_expense', 'other_expense'].map((v) => ({ value: v, label: toTitleCase(v) })),
};

export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as AccountType, category: 'current_asset' as AccountCategory, description: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const actor = { uid: user!.uid, email: user!.email, name: user!.displayName };

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToAccounts(user.companyId, (data) => {
      setAccounts(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const openEdit = (acct: Account) => {
    setEditAccount(acct);
    setForm({ code: acct.code, name: acct.name, type: acct.type, category: acct.category, description: acct.description ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editAccount) {
        await updateAccount(editAccount.id, form, actor, user!.companyId);
      } else {
        await createAccount({ ...form, companyId: user!.companyId, isActive: true, createdBy: user!.uid }, actor);
      }
      setShowForm(false);
      setEditAccount(null);
      setForm({ code: '', name: '', type: 'asset', category: 'current_asset', description: '' });
    } finally { setSaving(false); }
  };

  const toggleActive = async (acct: Account) => {
    await updateAccount(acct.id, { isActive: !acct.isActive }, actor, user!.companyId);
  };

  const filtered = accounts.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) || a.code.includes(search)
  );
  const grouped = groupBy(filtered, 'type');

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Chart of Accounts"
          subtitle="Manage your company's account structure"
          action={
            <div className="flex gap-3">
              <input className="input-field w-48 text-sm py-2" placeholder="Search accounts..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button icon={<Plus className="w-4 h-4" />} onClick={() => { setEditAccount(null); setShowForm(true); }}>
                New Account
              </Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : filtered.length === 0 ? (
          <Card>
            <EmptyState icon={<TrendingUp className="w-10 h-10" />} title="No accounts found"
              description="Your chart of accounts is empty. Add accounts or check your search."
              action={<Button onClick={() => setShowForm(true)}>Add Account</Button>} />
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountType[]).map((type) => {
              const group = grouped[type];
              if (!group?.length) return null;
              const total = group.reduce((s, a) => s + a.balance, 0);
              return (
                <Card key={type}
                  title={<span className="flex items-center gap-2"><Badge variant={typeColor[type]}>{toTitleCase(type)}</Badge><span className="text-[--text-3] text-xs font-normal">({group.length} accounts)</span></span> as unknown as string}
                  action={<span className="font-mono text-sm font-bold text-[--text]">{formatCurrency(total)}</span>}
                  padding={false}>
                  <table className="ledger-table">
                    <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Description</th><th className="text-right">Balance</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                      {group.map((acct) => (
                        <tr key={acct.id} className={!acct.isActive ? 'opacity-50' : ''}>
                          <td className="font-mono text-xs text-[--accent-2]">{acct.code}</td>
                          <td className="font-medium">{acct.name}</td>
                          <td className="text-xs text-[--text-3]">{toTitleCase(acct.category)}</td>
                          <td className="text-xs text-[--text-3] max-w-[200px] truncate">{acct.description ?? '—'}</td>
                          <td className="text-right font-mono text-sm">{formatCurrency(acct.balance)}</td>
                          <td><Badge variant={acct.isActive ? 'green' : 'default'}>{acct.isActive ? 'Active' : 'Inactive'}</Badge></td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEdit(acct)} className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]"><Edit className="w-3.5 h-3.5" /></button>
                              <button onClick={() => toggleActive(acct)} className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]">
                                {acct.isActive ? <ToggleRight className="w-4 h-4 text-[--green]" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditAccount(null); }}
        title={editAccount ? 'Edit Account' : 'New Account'} size="md">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Account Code *" placeholder="e.g. 1010" value={form.code} onChange={set('code')} required />
            <Select label="Type *" value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType, category: CAT_OPTS[e.target.value as AccountType][0].value as AccountCategory }))}
              options={TYPE_OPTS} />
          </div>
          <Input label="Account Name *" placeholder="e.g. Checking Account" value={form.name} onChange={set('name')} required />
          <Select label="Category *" value={form.category} onChange={set('category')} options={CAT_OPTS[form.type]} />
          <Input label="Description" placeholder="Optional description" value={form.description} onChange={set('description')} />
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button loading={saving} disabled={!form.code || !form.name} onClick={handleSave}>
              {editAccount ? 'Update Account' : 'Create Account'}
            </Button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}
