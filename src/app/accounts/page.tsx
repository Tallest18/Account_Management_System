'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { subscribeToAccounts, createAccount, updateAccount } from '@/lib/db';
import { Account, AccountType, AccountCategory } from '@/types';
import { formatCurrency, toTitleCase, groupBy } from '@/lib/utils';
import { Plus, TrendingUp, Edit, ToggleLeft, ToggleRight, Search, X, ChevronDown, Wallet, Landmark, Scale, BarChart2, Receipt } from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */
const TYPE_OPTS = ['asset', 'liability', 'equity', 'revenue', 'expense'].map((v) => ({ value: v, label: toTitleCase(v) }));
const CAT_OPTS: Record<AccountType, { value: string; label: string }[]> = {
  asset: ['current_asset', 'fixed_asset', 'other_asset'].map((v) => ({ value: v, label: toTitleCase(v) })),
  liability: ['current_liability', 'long_term_liability'].map((v) => ({ value: v, label: toTitleCase(v) })),
  equity: [{ value: 'equity', label: 'Equity' }],
  revenue: ['revenue', 'other_revenue'].map((v) => ({ value: v, label: toTitleCase(v) })),
  expense: ['cogs', 'operating_expense', 'other_expense'].map((v) => ({ value: v, label: toTitleCase(v) })),
};

const TYPE_META: Record<AccountType, { color: string; glow: string; bg: string; icon: React.ReactNode; gradient: string }> = {
  asset:     { color: '#60a5fa', glow: 'rgba(96,165,250,0.3)',  bg: 'rgba(96,165,250,0.08)',  icon: <Wallet className="w-4 h-4" />,    gradient: 'from-blue-500/20 to-blue-900/5' },
  liability: { color: '#f87171', glow: 'rgba(248,113,113,0.3)', bg: 'rgba(248,113,113,0.08)', icon: <Scale className="w-4 h-4" />,     gradient: 'from-red-500/20 to-red-900/5' },
  equity:    { color: '#c084fc', glow: 'rgba(192,132,252,0.3)', bg: 'rgba(192,132,252,0.08)', icon: <Landmark className="w-4 h-4" />, gradient: 'from-purple-500/20 to-purple-900/5' },
  revenue:   { color: '#34d399', glow: 'rgba(52,211,153,0.3)',  bg: 'rgba(52,211,153,0.08)',  icon: <BarChart2 className="w-4 h-4" />, gradient: 'from-emerald-500/20 to-emerald-900/5' },
  expense:   { color: '#fbbf24', glow: 'rgba(251,191,36,0.3)',  bg: 'rgba(251,191,36,0.08)',  icon: <Receipt className="w-4 h-4" />,  gradient: 'from-amber-500/20 to-amber-900/5' },
};

/* ─── Subcomponents ──────────────────────────────────────────────────────── */

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-4 py-24">
      <div style={{ width: 48, height: 48, border: '2px solid rgba(212,175,55,0.15)', borderTop: '2px solid #D4AF37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Serif Display', serif", letterSpacing: '0.15em', fontSize: 12 }}>LOADING ACCOUNTS</p>
    </div>
  );
}

function StatCard({ type, accounts }: { type: AccountType; accounts: Account[] }) {
  const meta = TYPE_META[type];
  const total = accounts.reduce((s, a) => s + a.balance, 0);
  const active = accounts.filter(a => a.isActive).length;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${meta.color}22`,
      borderRadius: 16,
      padding: '20px 24px',
      position: 'relative',
      overflow: 'hidden',
      transition: 'all 0.3s ease',
      cursor: 'default',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = meta.bg;
        (e.currentTarget as HTMLElement).style.borderColor = meta.color + '44';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${meta.glow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
        (e.currentTarget as HTMLElement).style.borderColor = meta.color + '22';
        (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: meta.glow, filter: 'blur(24px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: meta.color, opacity: 0.8 }}>{meta.icon}</div>
          <span style={{ color: meta.color, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'monospace' }}>{type}</span>
        </div>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: 'monospace' }}>{active}/{accounts.length}</span>
      </div>
      <div style={{ color: '#fff', fontSize: 22, fontWeight: 700, fontFamily: "'DM Serif Display', serif", letterSpacing: '-0.02em' }}>
        {formatCurrency(total)}
      </div>
    </div>
  );
}

function AccountRow({ acct, onEdit, onToggle, index }: { acct: Account; onEdit: () => void; onToggle: () => void; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <tr
      style={{
        opacity: acct.isActive ? 1 : 0.38,
        transition: 'all 0.2s ease',
        animation: `fadeSlideIn 0.4s ease both`,
        animationDelay: `${index * 0.04}s`,
        background: hovered ? 'rgba(255,255,255,0.03)' : 'transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#D4AF37', background: 'rgba(212,175,55,0.1)', padding: '3px 8px', borderRadius: 6, letterSpacing: '0.05em' }}>
          {acct.code}
        </span>
      </td>
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontWeight: 500, color: 'rgba(255,255,255,0.88)', fontSize: 14 }}>
        {acct.name}
      </td>
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
          {toTitleCase(acct.category)}
        </span>
      </td>
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
        {acct.description || '—'}
      </td>
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, fontSize: 14, color: acct.balance >= 0 ? 'rgba(255,255,255,0.85)' : '#f87171' }}>
        {formatCurrency(acct.balance)}
      </td>
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600,
          padding: '3px 10px', borderRadius: 20, letterSpacing: '0.08em',
          background: acct.isActive ? 'rgba(52,211,153,0.12)' : 'rgba(255,255,255,0.06)',
          color: acct.isActive ? '#34d399' : 'rgba(255,255,255,0.25)',
          border: `1px solid ${acct.isActive ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.1)'}`,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', flexShrink: 0 }} />
          {acct.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td style={{ padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={onEdit} style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(212,175,55,0.12)'; (e.currentTarget as HTMLElement).style.color = '#D4AF37'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(212,175,55,0.25)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; }}>
            <Edit style={{ width: 13, height: 13 }} />
          </button>
          <button onClick={onToggle} style={{ padding: '6px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', color: acct.isActive ? '#34d399' : 'rgba(255,255,255,0.25)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
            {acct.isActive ? <ToggleRight style={{ width: 15, height: 15 }} /> : <ToggleLeft style={{ width: 15, height: 15 }} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

function AccountGroup({ type, accounts, onEdit, onToggle }: { type: AccountType; accounts: Account[]; onEdit: (a: Account) => void; onToggle: (a: Account) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const meta = TYPE_META[type];
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <div style={{
      background: 'rgba(255,255,255,0.02)',
      border: `1px solid rgba(255,255,255,0.07)`,
      borderRadius: 20,
      overflow: 'hidden',
      transition: 'box-shadow 0.3s ease',
    }}>
      {/* Group Header */}
      <div
        onClick={() => setCollapsed(c => !c)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 24px', cursor: 'pointer',
          background: `linear-gradient(135deg, ${meta.color}0a 0%, transparent 60%)`,
          borderBottom: collapsed ? 'none' : `1px solid rgba(255,255,255,0.05)`,
          transition: 'background 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${meta.color}14 0%, transparent 60%)`}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = `linear-gradient(135deg, ${meta.color}0a 0%, transparent 60%)`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: meta.color }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, fontWeight: 700, color: '#fff' }}>{toTitleCase(type)}</span>
              <span style={{ fontSize: 11, color: meta.color, background: meta.bg, padding: '2px 8px', borderRadius: 20, fontFamily: 'monospace', fontWeight: 600 }}>{accounts.length}</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2, fontFamily: 'monospace' }}>
              {accounts.filter(a => a.isActive).length} active
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, fontWeight: 700, color: '#fff' }}>{formatCurrency(total)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>total balance</div>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', transition: 'transform 0.3s', transform: collapsed ? 'rotate(-90deg)' : 'rotate(0)' }}>
            <ChevronDown style={{ width: 16, height: 16 }} />
          </div>
        </div>
      </div>

      {/* Table */}
      {!collapsed && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                {['Code', 'Name', 'Category', 'Description', 'Balance', 'Status', 'Actions'].map((h, i) => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: i === 4 ? 'right' : 'left',
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                    textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
                    fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.05)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acct, i) => (
                <AccountRow key={acct.id} acct={acct} index={i}
                  onEdit={() => onEdit(acct)} onToggle={() => onToggle(acct)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Modal ──────────────────────────────────────────────────────────────── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 50%, #0f1117 100%)',
        border: '1px solid rgba(212,175,55,0.2)',
        borderRadius: 24, padding: 32, width: '100%', maxWidth: 520,
        boxShadow: '0 40px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
        animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
      }}>
        {/* Gold top accent */}
        <div style={{ position: 'absolute', top: 0, left: 32, right: 32, height: 1, background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff', fontSize: 14, outline: 'none',
  transition: 'all 0.2s', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

/* ─── Main Page ──────────────────────────────────────────────────────────── */
export default function AccountsPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [mounted, setMounted] = useState(false);

  const [form, setForm] = useState({ code: '', name: '', type: 'asset' as AccountType, category: 'current_asset' as AccountCategory, description: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { setMounted(true); }, []);

  if (!user) return null;
  const actor = { uid: user.uid, email: user.email, name: user.displayName };

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

  const openNew = () => {
    setEditAccount(null);
    setForm({ code: '', name: '', type: 'asset', category: 'current_asset', description: '' });
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
  const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.balance, 0);

  return (
    <AuthGuard>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;500;600;700;800&display=swap');

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes headerIn {
          from { opacity: 0; transform: translateY(-16px) }
          to { opacity: 1; transform: translateY(0) }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(3deg); }
        }

        .form-input:focus { border-color: rgba(212,175,55,0.5) !important; background: rgba(212,175,55,0.04) !important; box-shadow: 0 0 0 3px rgba(212,175,55,0.1); }
        .gold-btn:hover { background: linear-gradient(135deg, #D4AF37 0%, #B8962E 100%) !important; box-shadow: 0 6px 24px rgba(212,175,55,0.35) !important; transform: translateY(-1px); }
        .gold-btn:active { transform: translateY(0) !important; }
        .search-input:focus { border-color: rgba(255,255,255,0.2) !important; background: rgba(255,255,255,0.07) !important; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0b0f 0%, #0d0f1a 40%, #080a10 100%)',
        fontFamily: "'Syne', sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}>

        {/* Ambient Orbs */}
        <div style={{ position: 'fixed', top: -100, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none', animation: 'pulse-glow 8s ease-in-out infinite' }} />
        <div style={{ position: 'fixed', bottom: -150, left: -150, width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.04) 0%, transparent 70%)', pointerEvents: 'none', animation: 'pulse-glow 10s ease-in-out infinite 2s' }} />
        <div style={{ position: 'fixed', top: '40%', left: '40%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(192,132,252,0.03) 0%, transparent 70%)', pointerEvents: 'none', animation: 'pulse-glow 12s ease-in-out infinite 4s' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '40px 40px 60px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 40, animation: 'headerIn 0.5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 3, height: 28, background: 'linear-gradient(to bottom, #D4AF37, transparent)', borderRadius: 2 }} />
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4AF37', fontFamily: 'monospace' }}>Financial Structure</p>
                </div>
                <h1 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  Chart of Accounts
                </h1>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.35)', fontSize: 14, letterSpacing: '0.01em' }}>
                  Manage your company's complete account structure
                </p>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                  <input
                    className="search-input"
                    style={{ ...inputStyle, paddingLeft: 36, width: 220 }}
                    placeholder="Search accounts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && (
                    <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', padding: 0 }}>
                      <X style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                </div>

                {/* New Account Button */}
                <button
                  className="gold-btn"
                  onClick={openNew}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '11px 20px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg, #C9A227 0%, #A07820 100%)',
                    color: '#0a0b0f', fontSize: 14, fontWeight: 700,
                    fontFamily: "'Syne', sans-serif", letterSpacing: '0.02em',
                    cursor: 'pointer', transition: 'all 0.25s ease',
                    boxShadow: '0 4px 16px rgba(212,175,55,0.2)',
                  }}>
                  <Plus style={{ width: 15, height: 15 }} />
                  New Account
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ marginTop: 28, height: 1, background: 'linear-gradient(90deg, rgba(212,175,55,0.3), rgba(255,255,255,0.05) 40%, transparent)' }} />
          </div>

          {/* ── Summary Stats ── */}
          {!loading && accounts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 32, animation: 'headerIn 0.5s ease 0.1s both', opacity: 0 }}>
              {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountType[]).map(type => {
                const grp = grouped[type];
                if (!grp?.length) return null;
                return <StatCard key={type} type={type} accounts={grp} />;
              })}
            </div>
          )}

          {/* ── Content ── */}
          {loading ? (
            <Spinner />
          ) : filtered.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '80px 20px',
              background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: 24,
            }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(212,175,55,0.08)', border: '1px solid rgba(212,175,55,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', animation: 'float 4s ease-in-out infinite' }}>
                <TrendingUp style={{ width: 28, height: 28, color: '#D4AF37', opacity: 0.7 }} />
              </div>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#fff', margin: '0 0 8px' }}>No accounts found</h3>
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, marginBottom: 24 }}>
                {search ? 'No accounts match your search.' : 'Your chart of accounts is empty.'}
              </p>
              <button className="gold-btn" onClick={openNew} style={{
                padding: '10px 24px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #C9A227 0%, #A07820 100%)',
                color: '#0a0b0f', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                fontFamily: "'Syne', sans-serif", transition: 'all 0.25s ease',
              }}>Add First Account</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, animation: 'headerIn 0.5s ease 0.15s both', opacity: 0 }}>
              {(['asset', 'liability', 'equity', 'revenue', 'expense'] as AccountType[]).map(type => {
                const grp = grouped[type];
                if (!grp?.length) return null;
                return <AccountGroup key={type} type={type} accounts={grp} onEdit={openEdit} onToggle={toggleActive} />;
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Modal ── */}
      <Modal open={showForm} onClose={() => { setShowForm(false); setEditAccount(null); }}
        title={editAccount ? 'Edit Account' : 'New Account'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormField label="Account Code *">
              <input className="form-input" style={inputStyle} placeholder="e.g. 1010" value={form.code} onChange={set('code')} />
            </FormField>
            <FormField label="Type *">
              <select className="form-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AccountType, category: CAT_OPTS[e.target.value as AccountType][0].value as AccountCategory }))}>
                {TYPE_OPTS.map(o => <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Account Name *">
            <input className="form-input" style={inputStyle} placeholder="e.g. Checking Account" value={form.name} onChange={set('name')} />
          </FormField>
          <FormField label="Category *">
            <select className="form-input" style={{ ...inputStyle, cursor: 'pointer' }} value={form.category} onChange={set('category')}>
              {CAT_OPTS[form.type].map(o => <option key={o.value} value={o.value} style={{ background: '#1a1a2e' }}>{o.label}</option>)}
            </select>
          </FormField>
          <FormField label="Description">
            <input className="form-input" style={inputStyle} placeholder="Optional description" value={form.description} onChange={set('description')} />
          </FormField>

          {/* Footer */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setShowForm(false)} style={{
              padding: '10px 20px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: 'rgba(255,255,255,0.5)', fontSize: 14,
              fontFamily: "'Syne', sans-serif", fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)'; }}>
              Cancel
            </button>
            <button
              className="gold-btn"
              disabled={!form.code || !form.name || saving}
              onClick={handleSave}
              style={{
                padding: '10px 24px', borderRadius: 12, border: 'none',
                background: (!form.code || !form.name) ? 'rgba(212,175,55,0.2)' : 'linear-gradient(135deg, #C9A227 0%, #A07820 100%)',
                color: (!form.code || !form.name) ? 'rgba(212,175,55,0.4)' : '#0a0b0f',
                fontSize: 14, fontFamily: "'Syne', sans-serif", fontWeight: 700,
                cursor: (!form.code || !form.name) ? 'not-allowed' : 'pointer',
                transition: 'all 0.25s ease', display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {saving ? (
                <>
                  <div style={{ width: 14, height: 14, border: '2px solid rgba(0,0,0,0.3)', borderTop: '2px solid #0a0b0f', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Saving…
                </>
              ) : (editAccount ? 'Update Account' : 'Create Account')}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}