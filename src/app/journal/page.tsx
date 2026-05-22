'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Badge, Card, Modal, Input, Select, Textarea, ConfirmDialog, EmptyState, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  subscribeToJournalEntries, createJournalEntry, postJournalEntry,
  voidJournalEntry, getAccounts, updateJournalEntry,
} from '@/lib/db';
import { JournalEntry, JournalLine, Account } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import { Plus, BookOpen, Send, Ban, Edit, Eye, Trash2 } from 'lucide-react';

const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'default'> = {
  posted: 'green', draft: 'default', voided: 'red',
};

interface LineForm { id: string; accountId: string; description: string; debit: string; credit: string; }

function newLine(): LineForm { return { id: generateId(), accountId: '', description: '', debit: '', credit: '' }; }

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [voidTarget, setVoidTarget] = useState<JournalEntry | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [postTarget, setPostTarget] = useState<JournalEntry | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [type, setType] = useState<JournalEntry['type']>('general');
  const [lines, setLines] = useState<LineForm[]>([newLine(), newLine()]);

  const actor = { uid: user!.uid, email: user!.email, name: user!.displayName };

  const load = useCallback(() => {
    if (!user) return;
    getAccounts(user.companyId).then(setAccounts);
    const unsub = subscribeToJournalEntries(user.companyId, (data) => {
      setEntries(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => { const unsub = load(); return unsub; }, [load]);

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

  const resetForm = () => {
    setDate(new Date().toISOString().slice(0, 10));
    setDescription(''); setReference('');
    setType('general');
    setLines([newLine(), newLine()]);
    setEditEntry(null);
  };

  const openEdit = (entry: JournalEntry) => {
    setEditEntry(entry);
    setDate(entry.date);
    setDescription(entry.description);
    setReference(entry.reference ?? '');
    setType(entry.type);
    setLines(entry.lines.map((l) => ({
      id: l.id, accountId: l.accountId,
      description: l.description,
      debit: l.debit ? String(l.debit) : '',
      credit: l.credit ? String(l.credit) : '',
    })));
    setShowForm(true);
  };

  const handleSave = async (status: 'draft' | 'posted') => {
    if (!isBalanced) return;
    setSaving(true);
    try {
      const builtLines: JournalLine[] = lines
        .filter((l) => l.accountId && (parseFloat(l.debit) || parseFloat(l.credit)))
        .map((l) => {
          const acct = accounts.find((a) => a.id === l.accountId);
          return {
            id: l.id,
            accountId: l.accountId,
            accountCode: acct?.code ?? '',
            accountName: acct?.name ?? '',
            description: l.description,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          };
        });

      if (editEntry) {
        await updateJournalEntry(editEntry.id, { date, description, reference, type, lines: builtLines }, actor, user!.companyId);
      } else {
        await createJournalEntry({
          companyId: user!.companyId, date, description, reference,
          type, status, lines: builtLines,
          totalDebit, totalCredit,
          createdBy: user!.uid, updatedBy: user!.uid,
        }, actor);
      }
      setShowForm(false); resetForm();
    } finally { setSaving(false); }
  };

  const handlePost = async () => {
    if (!postTarget) return;
    setSaving(true);
    try {
      await postJournalEntry(postTarget.id, actor, user!.companyId);
      setPostTarget(null);
    } finally { setSaving(false); }
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setSaving(true);
    try {
      await voidJournalEntry(voidTarget.id, voidReason, actor, user!.companyId);
      setVoidTarget(null); setVoidReason('');
    } finally { setSaving(false); }
  };

  const accountOptions = [
    { value: '', label: '— Select account —' },
    ...accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  ];

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Journal Entries"
          subtitle="Double-entry bookkeeping ledger"
          action={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => { resetForm(); setShowForm(true); }}>
              New Entry
            </Button>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <Card padding={false}>
            {entries.length === 0 ? (
              <EmptyState icon={<BookOpen className="w-10 h-10" />} title="No journal entries yet"
                description="Create your first journal entry to start recording transactions."
                action={<Button onClick={() => setShowForm(true)}>Create Entry</Button>} />
            ) : (
              <div className="overflow-x-auto">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Entry #</th><th>Date</th><th>Description</th><th>Reference</th>
                      <th>Type</th><th className="text-right">Debit</th><th className="text-right">Credit</th>
                      <th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="font-mono text-xs text-[--accent-2]">{entry.entryNumber}</td>
                        <td className="text-xs text-[--text-3]">{formatDate(entry.date)}</td>
                        <td className="max-w-[200px]"><p className="truncate text-sm">{entry.description}</p></td>
                        <td className="text-xs text-[--text-3]">{entry.reference ?? '—'}</td>
                        <td><span className="text-xs capitalize">{entry.type}</span></td>
                        <td className="text-right font-mono text-xs text-[--green]">{formatCurrency(entry.totalDebit)}</td>
                        <td className="text-right font-mono text-xs text-[--red]">{formatCurrency(entry.totalCredit)}</td>
                        <td><Badge variant={statusColor[entry.status] ?? 'default'}>{entry.status}</Badge></td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewEntry(entry)} title="View"
                              className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]">
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            {entry.status === 'draft' && (
                              <>
                                <button onClick={() => openEdit(entry)} title="Edit"
                                  className="p-1.5 rounded hover:bg-[--bg-3] text-[--text-3] hover:text-[--text]">
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setPostTarget(entry)} title="Post"
                                  className="p-1.5 rounded hover:bg-[--green-bg] text-[--text-3] hover:text-[--green]">
                                  <Send className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            {entry.status === 'posted' && (
                              <button onClick={() => setVoidTarget(entry)} title="Void"
                                className="p-1.5 rounded hover:bg-[--red-bg] text-[--text-3] hover:text-[--red]">
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
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

      {/* Entry Form Modal */}
      <Modal open={showForm} onClose={() => { setShowForm(false); resetForm(); }}
        title={editEntry ? 'Edit Journal Entry' : 'New Journal Entry'} size="xl">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-3 gap-4">
            <Input label="Date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Select label="Type" value={type} onChange={(e) => setType(e.target.value as JournalEntry['type'])}
              options={[
                { value: 'general', label: 'General' },
                { value: 'invoice', label: 'Invoice' },
                { value: 'payment', label: 'Payment' },
                { value: 'receipt', label: 'Receipt' },
                { value: 'adjustment', label: 'Adjustment' },
                { value: 'opening', label: 'Opening Balance' },
              ]} />
            <Input label="Reference" placeholder="Invoice #, check #..." value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
          <Input label="Description" placeholder="Brief description of this transaction" value={description} onChange={(e) => setDescription(e.target.value)} required />

          {/* Lines */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-[--text-2] uppercase tracking-wider">Journal Lines</p>
              <button onClick={() => setLines([...lines, newLine()])}
                className="text-xs text-[--accent-2] hover:underline">+ Add line</button>
            </div>
            <div className="border border-[--border] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-[--bg]">
                    <th className="text-left px-3 py-2 text-xs text-[--text-3] uppercase tracking-wider w-2/5">Account</th>
                    <th className="text-left px-3 py-2 text-xs text-[--text-3] uppercase tracking-wider">Description</th>
                    <th className="text-right px-3 py-2 text-xs text-[--text-3] uppercase tracking-wider w-28">Debit</th>
                    <th className="text-right px-3 py-2 text-xs text-[--text-3] uppercase tracking-wider w-28">Credit</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={line.id} className="border-t border-[--border]">
                      <td className="px-2 py-1.5">
                        <select className="input-field text-xs py-1.5" value={line.accountId}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, accountId: e.target.value } : l))}>
                          {accountOptions.map((o) => (
                            <option key={o.value} value={o.value} style={{ background: '#161b27' }}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-1.5">
                        <input className="input-field text-xs py-1.5" placeholder="Line memo"
                          value={line.description}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, description: e.target.value } : l))} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" min="0" className="input-field text-xs py-1.5 text-right font-mono"
                          placeholder="0.00" value={line.debit}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, debit: e.target.value, credit: e.target.value ? '' : l.credit } : l))} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" step="0.01" min="0" className="input-field text-xs py-1.5 text-right font-mono"
                          placeholder="0.00" value={line.credit}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, credit: e.target.value, debit: e.target.value ? '' : l.debit } : l))} />
                      </td>
                      <td className="px-2">
                        {lines.length > 2 && (
                          <button onClick={() => setLines(lines.filter((_, j) => j !== i))}
                            className="text-[--text-3] hover:text-[--red]">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-[--border-2] bg-[--bg]">
                    <td colSpan={2} className="px-3 py-2 text-xs font-bold text-[--text-2] uppercase tracking-wider">Totals</td>
                    <td className={`px-3 py-2 text-right font-mono font-bold text-sm ${isBalanced ? 'text-[--green]' : 'text-[--yellow]'}`}>
                      {formatCurrency(totalDebit)}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono font-bold text-sm ${isBalanced ? 'text-[--green]' : 'text-[--yellow]'}`}>
                      {formatCurrency(totalCredit)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {!isBalanced && totalDebit > 0 && (
              <p className="text-xs text-[--yellow] mt-1.5">
                ⚠ Entry is not balanced. Difference: {formatCurrency(Math.abs(totalDebit - totalCredit))}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</Button>
            {!editEntry && (
              <Button variant="ghost" disabled={!isBalanced} loading={saving} onClick={() => handleSave('draft')}>
                Save as Draft
              </Button>
            )}
            <Button disabled={!isBalanced} loading={saving} onClick={() => handleSave('posted')}>
              {editEntry ? 'Update Entry' : 'Post Entry'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* View Entry Modal */}
      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title={`Entry ${viewEntry?.entryNumber}`} size="lg">
        {viewEntry && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="text-[--text-3] text-xs mb-0.5">Date</p><p>{formatDate(viewEntry.date)}</p></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Status</p><Badge variant={statusColor[viewEntry.status] ?? 'default'}>{viewEntry.status}</Badge></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Description</p><p>{viewEntry.description}</p></div>
              <div><p className="text-[--text-3] text-xs mb-0.5">Reference</p><p>{viewEntry.reference ?? '—'}</p></div>
              {viewEntry.voidReason && <div className="col-span-2"><p className="text-[--text-3] text-xs mb-0.5">Void Reason</p><p className="text-[--red]">{viewEntry.voidReason}</p></div>}
            </div>
            <table className="ledger-table">
              <thead><tr><th>Account</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th></tr></thead>
              <tbody>
                {viewEntry.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="text-xs"><span className="text-[--text-3]">{l.accountCode}</span> {l.accountName}</td>
                    <td className="text-xs text-[--text-3]">{l.description}</td>
                    <td className="text-right font-mono text-xs text-[--green]">{l.debit > 0 ? formatCurrency(l.debit) : '—'}</td>
                    <td className="text-right font-mono text-xs text-[--red]">{l.credit > 0 ? formatCurrency(l.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-[--border-2]">
                  <td colSpan={2} className="font-bold text-xs text-[--text-3] uppercase px-3 py-2">Total</td>
                  <td className="text-right font-mono font-bold text-sm text-[--green] px-3 py-2">{formatCurrency(viewEntry.totalDebit)}</td>
                  <td className="text-right font-mono font-bold text-sm text-[--red] px-3 py-2">{formatCurrency(viewEntry.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>

      {/* Post Confirm */}
      <ConfirmDialog open={!!postTarget} onClose={() => setPostTarget(null)} onConfirm={handlePost}
        loading={saving} variant="primary"
        title="Post Journal Entry"
        message={`Are you sure you want to post ${postTarget?.entryNumber}? This will update account balances.`}
        confirmLabel="Post Entry" />

      {/* Void Modal */}
      <Modal open={!!voidTarget} onClose={() => { setVoidTarget(null); setVoidReason(''); }} title="Void Journal Entry" size="sm">
        <p className="text-sm text-[--text-2] mb-4">
          You are about to void <strong className="text-[--text]">{voidTarget?.entryNumber}</strong>. This will reverse all account balance changes.
        </p>
        <Textarea label="Reason for voiding *" placeholder="Explain why this entry is being voided..."
          value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={3} />
        <div className="flex gap-3 justify-end mt-5">
          <Button variant="secondary" onClick={() => { setVoidTarget(null); setVoidReason(''); }}>Cancel</Button>
          <Button variant="danger" disabled={!voidReason.trim()} loading={saving} onClick={handleVoid}>Void Entry</Button>
        </div>
      </Modal>
    </AuthGuard>
  );
}
