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
import { Plus, BookOpen, Send, Ban, Edit, Eye, Trash2, CheckCircle2, AlertTriangle, TrendingUp, FileText, Hash } from 'lucide-react';

/* ─── status config ─────────────────────────────────── */

const STATUS_CONFIG: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  posted: { label: 'Posted',  dot: '#10b981', bg: 'rgba(16,185,129,0.08)', text: '#10b981' },
  draft:  { label: 'Draft',   dot: '#6b7280', bg: 'rgba(107,114,128,0.08)', text: '#9ca3af' },
  voided: { label: 'Voided',  dot: '#ef4444', bg: 'rgba(239,68,68,0.08)', text: '#ef4444' },
};

const TYPE_COLORS: Record<string, string> = {
  general: '#6366f1', invoice: '#f59e0b', payment: '#10b981',
  receipt: '#06b6d4', adjustment: '#8b5cf6', opening: '#ec4899',
};

/* ─── line form type ────────────────────────────────── */

interface LineForm { id: string; accountId: string; description: string; debit: string; credit: string; }
function newLine(): LineForm { return { id: generateId(), accountId: '', description: '', debit: '', credit: '' }; }

/* ─── status badge ──────────────────────────────────── */

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '3px 8px', borderRadius: '20px',
      background: cfg.bg, border: `1px solid ${cfg.dot}25`,
      fontSize: '11px', fontWeight: 600, color: cfg.text,
      letterSpacing: '0.04em',
    }}>
      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: cfg.dot, flexShrink: 0,
        boxShadow: status === 'posted' ? `0 0 6px ${cfg.dot}` : 'none' }} />
      {cfg.label}
    </span>
  );
}

/* ─── type badge ────────────────────────────────────── */

function TypePill({ type }: { type: string }) {
  const color = TYPE_COLORS[type] ?? '#6b7280';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '2px 7px', borderRadius: '4px',
      background: `${color}12`, border: `1px solid ${color}30`,
      fontSize: '10px', fontWeight: 600, color, letterSpacing: '0.06em',
      textTransform: 'uppercase',
    }}>
      {type}
    </span>
  );
}

/* ─── balance indicator ─────────────────────────────── */

function BalanceBar({ debit, credit }: { debit: number; credit: number }) {
  const diff = Math.abs(debit - credit);
  const balanced = diff < 0.01 && debit > 0;
  const pct = debit > 0 ? Math.min((Math.min(debit, credit) / Math.max(debit, credit)) * 100, 100) : 0;

  return (
    <div style={{
      padding: '12px 16px',
      borderRadius: '12px',
      border: `1px solid ${balanced ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}`,
      background: balanced ? 'rgba(16,185,129,0.05)' : 'rgba(245,158,11,0.05)',
      display: 'flex', flexDirection: 'column', gap: '8px',
      transition: 'all 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {balanced
            ? <CheckCircle2 style={{ width: '14px', height: '14px', color: '#10b981' }} />
            : <AlertTriangle style={{ width: '14px', height: '14px', color: '#f59e0b' }} />
          }
          <span style={{ fontSize: '11px', fontWeight: 600, color: balanced ? '#10b981' : '#f59e0b', letterSpacing: '0.05em' }}>
            {balanced ? 'BALANCED' : 'UNBALANCED'}
          </span>
        </div>
        {!balanced && debit > 0 && (
          <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#f59e0b' }}>
            Δ {formatCurrency(diff)}
          </span>
        )}
      </div>
      <div style={{ height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          borderRadius: '2px',
          background: balanced ? '#10b981' : '#f59e0b',
          boxShadow: balanced ? '0 0 8px #10b981' : 'none',
          transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1), background 0.3s',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#10b981' }}>DR {formatCurrency(debit)}</span>
        <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#ef4444' }}>CR {formatCurrency(credit)}</span>
      </div>
    </div>
  );
}

/* ─── icon button ───────────────────────────────────── */

function IconBtn({
  onClick, title, children, hoverColor = '#f9fafb',
}: { onClick: () => void; title: string; children: React.ReactNode; hoverColor?: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick} title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '6px', borderRadius: '8px', border: 'none', cursor: 'pointer',
        background: hovered ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: hovered ? hoverColor : '#4b5563',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}
    >
      {children}
    </button>
  );
}

/* ─── stat strip ─────────────────────────────────────── */

function StatStrip({ entries }: { entries: JournalEntry[] }) {
  const posted  = entries.filter((e) => e.status === 'posted').length;
  const drafts  = entries.filter((e) => e.status === 'draft').length;
  const voided  = entries.filter((e) => e.status === 'voided').length;
  const totalDR = entries.filter((e) => e.status === 'posted').reduce((s, e) => s + e.totalDebit, 0);

  const stats = [
    { label: 'Total Entries', value: entries.length, icon: <Hash style={{ width: '13px', height: '13px' }} />, color: '#6366f1' },
    { label: 'Posted',  value: posted,  icon: <CheckCircle2 style={{ width: '13px', height: '13px' }} />, color: '#10b981' },
    { label: 'Drafts',  value: drafts,  icon: <FileText style={{ width: '13px', height: '13px' }} />,     color: '#f59e0b' },
    { label: 'Voided',  value: voided,  icon: <Ban style={{ width: '13px', height: '13px' }} />,          color: '#ef4444' },
    { label: 'Posted Volume', value: formatCurrency(totalDR), icon: <TrendingUp style={{ width: '13px', height: '13px' }} />, color: '#06b6d4', isCurrency: true },
  ];

  return (
    <div style={{
      display: 'flex', gap: '1px',
      borderRadius: '16px', overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.06)',
      marginBottom: '20px',
      background: 'rgba(255,255,255,0.02)',
    }}>
      {stats.map((s, i) => (
        <div key={s.label} style={{
          flex: 1, padding: '14px 16px',
          borderRight: i < stats.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          display: 'flex', flexDirection: 'column', gap: '6px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: s.color }}>
            {s.icon}
            <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563' }}>
              {s.label}
            </span>
          </div>
          <span style={{
            fontSize: s.isCurrency ? '14px' : '20px',
            fontWeight: 700, fontFamily: 'monospace',
            color: '#e5e7eb', letterSpacing: '-0.02em',
          }}>
            {s.value}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── main page ─────────────────────────────────────── */

export default function JournalPage() {
  const { user } = useAuth();
  const [entries, setEntries]     = useState<JournalEntry[]>([]);
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [viewEntry, setViewEntry] = useState<JournalEntry | null>(null);
  const [editEntry, setEditEntry] = useState<JournalEntry | null>(null);
  const [voidTarget, setVoidTarget] = useState<JournalEntry | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [postTarget, setPostTarget] = useState<JournalEntry | null>(null);
  const [saving, setSaving]       = useState(false);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  const [date, setDate]             = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [reference, setReference]   = useState('');
  const [type, setType]             = useState<JournalEntry['type']>('general');
  const [lines, setLines]           = useState<LineForm[]>([newLine(), newLine()]);

  if (!user) return null;
  const actor = { uid: user.uid, email: user.email, name: user.displayName };

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

  const totalDebit  = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01 && totalDebit > 0;

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
      id: l.id, accountId: l.accountId, description: l.description,
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
            id: l.id, accountId: l.accountId,
            accountCode: acct?.code ?? '', accountName: acct?.name ?? '',
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
    try { await postJournalEntry(postTarget.id, actor, user!.companyId); setPostTarget(null); }
    finally { setSaving(false); }
  };

  const handleVoid = async () => {
    if (!voidTarget || !voidReason.trim()) return;
    setSaving(true);
    try { await voidJournalEntry(voidTarget.id, voidReason, actor, user!.companyId); setVoidTarget(null); setVoidReason(''); }
    finally { setSaving(false); }
  };

  const accountOptions = [
    { value: '', label: '— Select account —' },
    ...accounts.map((a) => ({ value: a.id, label: `${a.code} — ${a.name}` })),
  ];

  /* ─────────────────────────── render ─── */
  return (
    <AuthGuard>
      <div style={{ padding: '28px', position: 'relative', minHeight: '100vh' }}>

        {/* ambient background */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'radial-gradient(ellipse 80% 50% at 10% 0%, rgba(16,185,129,0.04) 0%, transparent 60%)',
          pointerEvents: 'none', zIndex: 0,
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* ── header ── */}
          <div style={{
            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            marginBottom: '24px',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '8px',
                  background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))',
                  border: '1px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BookOpen style={{ width: '14px', height: '14px', color: '#10b981' }} />
                </div>
                <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.03em' }}>
                  Journal Entries
                </h1>
              </div>
              <p style={{ fontSize: '12px', color: '#374151', paddingLeft: '38px' }}>
                Double-entry bookkeeping ledger
              </p>
            </div>

            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '9px 16px', borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: '1px solid rgba(16,185,129,0.3)',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', letterSpacing: '-0.01em',
                boxShadow: '0 4px 20px rgba(16,185,129,0.25)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 28px rgba(16,185,129,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.25)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Plus style={{ width: '15px', height: '15px' }} />
              New Entry
            </button>
          </div>

          {/* ── stat strip ── */}
          {!loading && entries.length > 0 && <StatStrip entries={entries} />}

          {/* ── table card ── */}
          <div style={{
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
          }}>
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px' }}>
                <div style={{ position: 'relative', width: '40px', height: '40px' }}>
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(16,185,129,0.15)' }} />
                  <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#10b981', animation: 'spin 0.8s linear infinite' }} />
                </div>
              </div>
            ) : entries.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '12px' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '16px',
                  background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <BookOpen style={{ width: '24px', height: '24px', color: '#10b981' }} />
                </div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#e5e7eb' }}>No journal entries yet</p>
                <p style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', maxWidth: '260px' }}>
                  Create your first journal entry to start recording transactions.
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  style={{
                    marginTop: '4px', padding: '8px 16px', borderRadius: '10px',
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    color: '#10b981', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                  }}
                >
                  Create Entry
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      {['Entry #', 'Date', 'Description', 'Reference', 'Type', 'Debit', 'Credit', 'Status', ''].map((h) => (
                        <th key={h} style={{
                          padding: '11px 16px',
                          textAlign: h === 'Debit' || h === 'Credit' ? 'right' : 'left',
                          fontSize: '10px', fontWeight: 600,
                          letterSpacing: '0.1em', textTransform: 'uppercase',
                          color: '#374151',
                          background: 'rgba(255,255,255,0.01)',
                          whiteSpace: 'nowrap',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => {
                      const isHovered = hoveredRow === entry.id;
                      return (
                        <tr
                          key={entry.id}
                          onMouseEnter={() => setHoveredRow(entry.id)}
                          onMouseLeave={() => setHoveredRow(null)}
                          style={{
                            borderBottom: idx < entries.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                            background: isHovered ? 'rgba(255,255,255,0.025)' : 'transparent',
                            transition: 'background 0.15s',
                          }}
                        >
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: '12px', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {entry.entryNumber}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '11px', color: '#6b7280', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                            {formatDate(entry.date)}
                          </td>
                          <td style={{ padding: '12px 16px', maxWidth: '220px' }}>
                            <p style={{ fontSize: '12px', color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                              {entry.description}
                            </p>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '11px', color: '#4b5563', fontFamily: 'monospace' }}>
                            {entry.reference ?? <span style={{ color: '#1f2937' }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <TypePill type={entry.type} />
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: '#10b981', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {formatCurrency(entry.totalDebit)}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: '#f87171', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {formatCurrency(entry.totalCredit)}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <StatusPill status={entry.status} />
                          </td>
                          <td style={{ padding: '12px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                              <IconBtn onClick={() => setViewEntry(entry)} title="View">
                                <Eye style={{ width: '14px', height: '14px' }} />
                              </IconBtn>
                              {entry.status === 'draft' && (
                                <>
                                  <IconBtn onClick={() => openEdit(entry)} title="Edit" hoverColor="#6366f1">
                                    <Edit style={{ width: '14px', height: '14px' }} />
                                  </IconBtn>
                                  <IconBtn onClick={() => setPostTarget(entry)} title="Post" hoverColor="#10b981">
                                    <Send style={{ width: '14px', height: '14px' }} />
                                  </IconBtn>
                                </>
                              )}
                              {entry.status === 'posted' && (
                                <IconBtn onClick={() => setVoidTarget(entry)} title="Void" hoverColor="#ef4444">
                                  <Ban style={{ width: '14px', height: '14px' }} />
                                </IconBtn>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New / Edit Entry Modal ── */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); resetForm(); }}
        title={editEntry ? `Edit ${editEntry.entryNumber}` : 'New Journal Entry'}
        size="xl"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* meta row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Date</label>
              <input
                type="date" value={date}
                onChange={(e) => setDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as JournalEntry['type'])} style={inputStyle}>
                {[
                  ['general', 'General'], ['invoice', 'Invoice'], ['payment', 'Payment'],
                  ['receipt', 'Receipt'], ['adjustment', 'Adjustment'], ['opening', 'Opening Balance'],
                ].map(([v, l]) => <option key={v} value={v} style={{ background: '#0d1117' }}>{l}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Reference</label>
              <input
                placeholder="Invoice #, check #..."
                value={reference} onChange={(e) => setReference(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>Description *</label>
            <input
              placeholder="Brief description of this transaction"
              value={description} onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, width: '100%' }}
            />
          </div>

          {/* lines table */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563' }}>
                Journal Lines
              </span>
              <button
                onClick={() => setLines([...lines, newLine()])}
                style={{
                  fontSize: '11px', color: '#10b981', background: 'none', border: 'none',
                  cursor: 'pointer', padding: '3px 8px', borderRadius: '6px',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(16,185,129,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                + Add line
              </button>
            </div>

            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Account', 'Memo', 'Debit', 'Credit', ''].map((h, i) => (
                      <th key={h} style={{
                        padding: '9px 12px', textAlign: i >= 2 && i < 4 ? 'right' : 'left',
                        fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#374151',
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={line.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '6px 8px', width: '38%' }}>
                        <select
                          value={line.accountId}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, accountId: e.target.value } : l))}
                          style={{ ...lineInputStyle, width: '100%' }}
                        >
                          {accountOptions.map((o) => (
                            <option key={o.value} value={o.value} style={{ background: '#0d1117' }}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <input
                          placeholder="Line memo"
                          value={line.description}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, description: e.target.value } : l))}
                          style={{ ...lineInputStyle, width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', width: '130px' }}>
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={line.debit}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, debit: e.target.value, credit: e.target.value ? '' : l.credit } : l))}
                          style={{ ...lineInputStyle, textAlign: 'right', fontFamily: 'monospace', color: '#10b981', width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', width: '130px' }}>
                        <input
                          type="number" step="0.01" min="0" placeholder="0.00"
                          value={line.credit}
                          onChange={(e) => setLines(lines.map((l, j) => j === i ? { ...l, credit: e.target.value, debit: e.target.value ? '' : l.debit } : l))}
                          style={{ ...lineInputStyle, textAlign: 'right', fontFamily: 'monospace', color: '#f87171', width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: '6px 8px', width: '36px' }}>
                        {lines.length > 2 && (
                          <button
                            onClick={() => setLines(lines.filter((_, j) => j !== i))}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#4b5563', padding: '4px', borderRadius: '6px', transition: 'color 0.15s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#4b5563'; }}
                          >
                            <Trash2 style={{ width: '13px', height: '13px' }} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* balance bar */}
          <BalanceBar debit={totalDebit} credit={totalCredit} />

          {/* actions */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '4px' }}>
            <button
              onClick={() => { setShowForm(false); resetForm(); }}
              style={{ ...btnStyle, background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              Cancel
            </button>
            {!editEntry && (
              <button
                disabled={!isBalanced || saving}
                onClick={() => handleSave('draft')}
                style={{ ...btnStyle, background: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)', opacity: isBalanced ? 1 : 0.4 }}
              >
                Save Draft
              </button>
            )}
            <button
              disabled={!isBalanced || saving}
              onClick={() => handleSave('posted')}
              style={{
                ...btnStyle,
                background: isBalanced ? 'linear-gradient(135deg, #10b981, #059669)' : 'rgba(16,185,129,0.2)',
                color: '#fff', border: '1px solid rgba(16,185,129,0.3)',
                opacity: isBalanced ? 1 : 0.4,
                boxShadow: isBalanced ? '0 4px 16px rgba(16,185,129,0.25)' : 'none',
              }}
            >
              {saving ? '…' : editEntry ? 'Update Entry' : 'Post Entry'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── View Entry Modal ── */}
      <Modal open={!!viewEntry} onClose={() => setViewEntry(null)} title={`Entry ${viewEntry?.entryNumber}`} size="lg">
        {viewEntry && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* meta grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px',
              padding: '16px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {[
                { label: 'Date',        value: formatDate(viewEntry.date) },
                { label: 'Status',      value: <StatusPill status={viewEntry.status} /> },
                { label: 'Type',        value: <TypePill type={viewEntry.type} /> },
                { label: 'Reference',   value: viewEntry.reference ?? '—' },
                { label: 'Description', value: viewEntry.description, span: true },
                ...(viewEntry.voidReason ? [{ label: 'Void Reason', value: viewEntry.voidReason, span: true, danger: true }] : []),
              ].map((item: any) => (
                <div key={item.label} style={{ gridColumn: item.span ? 'span 2' : 'span 1' }}>
                  <p style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', marginBottom: '4px' }}>
                    {item.label}
                  </p>
                  <div style={{ fontSize: '13px', color: item.danger ? '#f87171' : '#d1d5db' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* lines table */}
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    {['Account', 'Description', 'Debit', 'Credit'].map((h) => (
                      <th key={h} style={{
                        padding: '9px 14px', textAlign: h === 'Debit' || h === 'Credit' ? 'right' : 'left',
                        fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {viewEntry.lines.map((l, idx) => (
                    <tr key={l.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: '10px', color: '#4b5563', fontFamily: 'monospace', marginRight: '6px' }}>{l.accountCode}</span>
                        <span style={{ fontSize: '12px', color: '#e5e7eb' }}>{l.accountName}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '11px', color: '#6b7280' }}>{l.description || '—'}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: l.debit > 0 ? '#10b981' : '#1f2937', fontWeight: l.debit > 0 ? 600 : 400 }}>
                        {l.debit > 0 ? formatCurrency(l.debit) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '12px', color: l.credit > 0 ? '#f87171' : '#1f2937', fontWeight: l.credit > 0 ? 600 : 400 }}>
                        {l.credit > 0 ? formatCurrency(l.credit) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
                    <td colSpan={2} style={{ padding: '10px 14px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563' }}>Total</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{formatCurrency(viewEntry.totalDebit)}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: 'monospace', fontSize: '13px', fontWeight: 700, color: '#f87171' }}>{formatCurrency(viewEntry.totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Post Confirm ── */}
      <ConfirmDialog
        open={!!postTarget} onClose={() => setPostTarget(null)} onConfirm={handlePost}
        loading={saving} variant="primary"
        title="Post Journal Entry"
        message={`Are you sure you want to post ${postTarget?.entryNumber}? This will update account balances.`}
        confirmLabel="Post Entry"
      />

      {/* ── Void Modal ── */}
      <Modal open={!!voidTarget} onClose={() => { setVoidTarget(null); setVoidReason(''); }} title="Void Journal Entry" size="sm">
        <div style={{
          padding: '14px', borderRadius: '12px', marginBottom: '16px',
          background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.15)',
        }}>
          <p style={{ fontSize: '12px', color: '#fca5a5', lineHeight: 1.6 }}>
            You are about to void <strong style={{ color: '#f87171' }}>{voidTarget?.entryNumber}</strong>.
            This will reverse all account balance changes and cannot be undone.
          </p>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4b5563', marginBottom: '6px' }}>
            Reason for voiding *
          </label>
          <textarea
            placeholder="Explain why this entry is being voided..."
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            rows={3}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.08)',
              background: 'rgba(255,255,255,0.03)',
              color: '#e5e7eb', fontSize: '13px',
              resize: 'vertical', outline: 'none',
              fontFamily: 'inherit', lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            onClick={() => { setVoidTarget(null); setVoidReason(''); }}
            style={{ ...btnStyle, background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            Cancel
          </button>
          <button
            disabled={!voidReason.trim() || saving}
            onClick={handleVoid}
            style={{
              ...btnStyle,
              background: voidReason.trim() ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.05)',
              color: '#f87171', border: '1px solid rgba(239,68,68,0.25)',
              opacity: voidReason.trim() ? 1 : 0.5,
            }}
          >
            {saving ? '…' : 'Void Entry'}
          </button>
        </div>
      </Modal>

      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.4); }
      `}</style>
    </AuthGuard>
  );
}

/* ─── shared styles ─────────────────────────────────── */

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  color: '#e5e7eb',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const lineInputStyle: React.CSSProperties = {
  padding: '7px 10px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'rgba(255,255,255,0.03)',
  color: '#d1d5db',
  fontSize: '12px',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.2s',
};

const btnStyle: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '-0.01em',
  transition: 'all 0.2s',
  border: 'none',
};