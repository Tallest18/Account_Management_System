'use client';
import { useEffect, useState, useRef } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { subscribeToContacts, createContact, updateContact } from '@/lib/db';
import { Contact } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { Plus, Users, Edit2, Search, X, ChevronUp, ChevronDown, Mail, Phone, MapPin, Hash, TrendingUp, TrendingDown, CheckCircle2, XCircle, Loader2, UserPlus } from 'lucide-react';

/* ─── tiny helpers ─── */
function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

/* Avatar colours updated to indigo/violet family */
const AVATAR_COLORS = [
  ['#1e1f5f', '#4f46e5'],   // indigo
  ['#2a1a3d', '#7c3aed'],   // violet
  ['#1a1a3d', '#818cf8'],   // indigo-light
  ['#1e1040', '#a78bfa'],   // purple
  ['#0f1840', '#6366f1'],   // indigo-mid
  ['#1a1530', '#c4b5fd'],   // lavender
];

function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/* ─── Avatar ─── */
function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const [bg, fg] = avatarColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${bg}, ${fg})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.34,
        fontWeight: 600,
        color: '#fff',
        letterSpacing: '0.02em',
        flexShrink: 0,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {initials(name)}
    </div>
  );
}

/* ─── Badge ─── */
function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 10px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        background: active ? 'rgba(61,186,126,0.12)' : 'rgba(150,150,160,0.12)',
        color: active ? '#3dba7e' : '#888',
        border: `1px solid ${active ? 'rgba(61,186,126,0.25)' : 'rgba(150,150,160,0.2)'}`,
      }}
    >
      {active ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

/* ─── Stat Card ─── */
function StatCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
        minWidth: 0,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: `${color}18`,
          border: `1px solid ${color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'DM Sans', sans-serif" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Input ─── */
function Field({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}>
        {label}
      </label>
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid ${focused ? 'rgba(99,102,241,0.6)' : 'rgba(255,255,255,0.1)'}`,
          borderRadius: 10,
          padding: '10px 14px',
          fontSize: 14,
          color: '#fff',
          outline: 'none',
          width: '100%',
          transition: 'border-color 0.2s',
          boxSizing: 'border-box',
          fontFamily: "'DM Sans', sans-serif",
        }}
      />
    </div>
  );
}

/* ─── Modal ─── */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    if (open) document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'linear-gradient(160deg, #0c0c18 0%, #090914 100%)',
          border: '1px solid rgba(99,102,241,0.15)',
          borderRadius: 20,
          width: '100%',
          maxWidth: 500,
          boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.08)',
          animation: 'slideUp 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: '#fff', fontFamily: "'DM Sans', sans-serif" }}>{title}</h2>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.07)', border: 'none', borderRadius: 8, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', transition: 'all 0.15s' }}
            onMouseEnter={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.12)'); (e.currentTarget.style.color = '#fff'); }}
            onMouseLeave={(e) => { (e.currentTarget.style.background = 'rgba(255,255,255,0.07)'); (e.currentTarget.style.color = 'rgba(255,255,255,0.5)'); }}
          >
            <X size={15} />
          </button>
        </div>
        {/* Body */}
        <div style={{ padding: '24px 28px' }}>{children}</div>
      </div>
    </div>
  );
}

/* ─── Sort helper ─── */
type SortKey = 'name' | 'balance';
type SortDir = 'asc' | 'desc';

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function ContactsPage({ type }: { type: 'customer' | 'vendor' }) {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', taxId: '' });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // ── Fix: useEffect must always be called — guard moved inside the effect ──
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToContacts(user.companyId, (data) => {
      setContacts(data.filter((c) => c.type === type || c.type === 'both'));
      setLoading(false);
    });
    return unsub;
  }, [user, type]);

  // Early return AFTER all hooks have been declared
  if (!user) return null;

  const actor = { uid: user.uid, email: user.email, name: user.displayName };

  const openEdit = (c: Contact) => {
    setEditContact(c);
    setForm({ name: c.name, email: c.email ?? '', phone: c.phone ?? '', address: c.address ?? '', taxId: c.taxId ?? '' });
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editContact) {
        await updateContact(editContact.id, form, actor, user.companyId);
      } else {
        await createContact({ ...form, companyId: user.companyId, type, isActive: true, createdBy: user.uid }, actor);
      }
      setShowForm(false);
      setEditContact(null);
      setForm({ name: '', email: '', phone: '', address: '', taxId: '' });
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  };

  const filtered = contacts
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'balance') return mul * (a.balance - b.balance);
      return mul * a.name.localeCompare(b.name);
    });

  const isCustomer = type === 'customer';
  const title = isCustomer ? 'Customers' : 'Vendors';

  const totalBalance = contacts.reduce((s, c) => s + (c.balance ?? 0), 0);
  const activeCount = contacts.filter((c) => c.isActive).length;

  return (
    <AuthGuard>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(0.97) } to { opacity: 1; transform: translateY(0) scale(1) } }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-8px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: 0.4 } }

        .contacts-page * { box-sizing: border-box; }
        .contacts-page { font-family: 'DM Sans', sans-serif; }

        .row-animate { animation: rowIn 0.3s ease both; }

        .sort-btn { background: none; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; color: rgba(255,255,255,0.5); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 0; font-family: 'DM Sans', sans-serif; transition: color 0.15s; }
        .sort-btn:hover { color: rgba(255,255,255,0.85); }
        .sort-btn.active { color: rgba(255,255,255,0.9); }

        .action-btn { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(255,255,255,0.35); transition: all 0.15s; }
        .action-btn:hover { background: rgba(99,102,241,0.15); border-color: rgba(99,102,241,0.3); color: #818cf8; transform: scale(1.05); }

        .primary-btn { border: none; border-radius: 12px; padding: 10px 20px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .primary-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(99,102,241,0.3); }
        .primary-btn:active:not(:disabled) { transform: translateY(0); }
        .primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .ghost-btn { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 500; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.15s; }
        .ghost-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

        .search-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 14px 10px 40px; font-size: 14px; color: #fff; outline: none; width: 260px; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
        .search-input:focus { border-color: rgba(99,102,241,0.5); background: rgba(99,102,241,0.05); width: 300px; }
        .search-input::placeholder { color: rgba(255,255,255,0.25); }

        .mono { font-family: 'DM Mono', monospace; }
      `}</style>

      <div
        className="contacts-page"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(145deg, #07070f 0%, #0a0a18 50%, #07070f 100%)',
          padding: '40px 48px',
          position: 'relative',
        }}
      >
        {/* Background orbs */}
        <div
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity: 0.04,
            backgroundImage: `radial-gradient(circle at 20% 20%, #4f46e5 0%, transparent 50%), radial-gradient(circle at 80% 80%, #7c3aed 0%, transparent 50%)`,
          }}
        />

        {/* ── Header ── */}
        <div style={{ marginBottom: 40, position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(99,102,241,0.12)',
                    border: '1px solid rgba(99,102,241,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
                  }}
                >
                  <Users size={18} />
                </div>
                <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: '-0.03em' }}>
                  {title}
                </h1>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.35)', marginLeft: 48 }}>
                {contacts.length} {title.toLowerCase()} · {activeCount} active
              </p>
            </div>

            {/* Search + Add */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', pointerEvents: 'none' }} />
                <input
                  ref={searchRef}
                  className="search-input"
                  placeholder={`Search ${title.toLowerCase()}…`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', padding: 2 }}
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <button
                className="primary-btn"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', boxShadow: '0 0 20px rgba(99,102,241,0.3)' }}
                onClick={() => { setEditContact(null); setForm({ name: '', email: '', phone: '', address: '', taxId: '' }); setShowForm(true); }}
              >
                <Plus size={16} />
                New {isCustomer ? 'Customer' : 'Vendor'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <StatCard
            label="Total Contacts"
            value={contacts.length.toString()}
            sub={`${activeCount} active`}
            icon={<Users size={18} />}
            color="#6366f1"
          />
          <StatCard
            label="Total Balance"
            value={formatCurrency(Math.abs(totalBalance))}
            sub={totalBalance >= 0 ? 'Net positive' : 'Net negative'}
            icon={totalBalance >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
            color={totalBalance >= 0 ? '#10b981' : '#ef4444'}
          />
          <StatCard
            label="Active Rate"
            value={contacts.length ? `${Math.round((activeCount / contacts.length) * 100)}%` : '—'}
            sub={`${contacts.length - activeCount} inactive`}
            icon={<CheckCircle2 size={18} />}
            color="#a78bfa"
          />
        </div>

        {/* ── Table Card ── */}
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid rgba(99,102,241,0.1)',
            borderRadius: 20,
            overflow: 'hidden',
            backdropFilter: 'blur(8px)',
          }}
        >
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
              <div style={{ width: 36, height: 36, border: `3px solid rgba(99,102,241,0.12)`, borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14, margin: 0 }}>Loading {title.toLowerCase()}…</p>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 20 }}>
              <div
                style={{
                  width: 72, height: 72, borderRadius: 20,
                  background: 'rgba(99,102,241,0.08)',
                  border: '1px solid rgba(99,102,241,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8',
                }}
              >
                <UserPlus size={30} />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: '#fff', fontWeight: 600, fontSize: 16, margin: '0 0 6px' }}>
                  {search ? `No results for "${search}"` : `No ${title.toLowerCase()} yet`}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: 0 }}>
                  {search ? 'Try a different search term' : `Add your first ${type} to start tracking transactions.`}
                </p>
              </div>
              {!search && (
                <button
                  className="primary-btn"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }}
                  onClick={() => setShowForm(true)}
                >
                  <Plus size={15} /> Add {isCustomer ? 'Customer' : 'Vendor'}
                </button>
              )}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {/* Table Head */}
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                  {[
                    { label: 'Name', key: 'name' as SortKey, width: '28%' },
                    { label: 'Email', width: '20%' },
                    { label: 'Phone', width: '14%' },
                    { label: 'Tax ID', width: '12%' },
                    { label: 'Balance', key: 'balance' as SortKey, width: '12%', right: true },
                    { label: 'Status', width: '9%' },
                    { label: '', width: '5%' },
                  ].map((col, i) => (
                    <th
                      key={i}
                      style={{
                        padding: '14px 20px',
                        textAlign: col.right ? 'right' : 'left',
                        width: col.width,
                      }}
                    >
                      {col.key ? (
                        <button className={`sort-btn ${sortKey === col.key ? 'active' : ''}`} onClick={() => toggleSort(col.key!)}>
                          {col.label}
                          {sortKey === col.key ? (
                            sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                          ) : (
                            <ChevronDown size={12} style={{ opacity: 0.3 }} />
                          )}
                        </button>
                      ) : col.label ? (
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                          {col.label}
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filtered.map((c, idx) => (
                  <tr
                    key={c.id}
                    className="row-animate"
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                      background: hoveredRow === c.id ? 'rgba(99,102,241,0.04)' : 'transparent',
                      transition: 'background 0.15s',
                      animationDelay: `${idx * 0.04}s`,
                    }}
                    onMouseEnter={() => setHoveredRow(c.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                  >
                    {/* Name + Avatar */}
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Avatar name={c.name} size={34} />
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 1 }}>{c.name}</div>
                          {c.address && (
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <MapPin size={9} /> {c.address}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Email */}
                    <td style={{ padding: '14px 20px' }}>
                      {c.email ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                          <Mail size={12} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.2)' }} />
                          <a href={`mailto:${c.email}`} style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'none', transition: 'color 0.15s' }}
                            onMouseEnter={(e) => ((e.currentTarget.style.color = '#818cf8'))}
                            onMouseLeave={(e) => ((e.currentTarget.style.color = 'rgba(255,255,255,0.5)'))}
                          >
                            {c.email}
                          </a>
                        </div>
                      ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>—</span>}
                    </td>

                    {/* Phone */}
                    <td style={{ padding: '14px 20px' }}>
                      {c.phone ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.45)', fontSize: 13 }}>
                          <Phone size={12} style={{ flexShrink: 0, color: 'rgba(255,255,255,0.2)' }} />
                          {c.phone}
                        </div>
                      ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>—</span>}
                    </td>

                    {/* Tax ID */}
                    <td style={{ padding: '14px 20px' }}>
                      {c.taxId ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                          <Hash size={11} style={{ color: 'rgba(255,255,255,0.2)' }} />
                          <span className="mono">{c.taxId}</span>
                        </div>
                      ) : <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 13 }}>—</span>}
                    </td>

                    {/* Balance */}
                    <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                      <span
                        className="mono"
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: c.balance >= 0 ? '#10b981' : '#ef4444',
                          background: c.balance >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                          padding: '3px 10px',
                          borderRadius: 8,
                        }}
                      >
                        {c.balance >= 0 ? '+' : ''}{formatCurrency(c.balance)}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 20px' }}>
                      <StatusBadge active={c.isActive} />
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '14px 20px' }}>
                      <button className="action-btn" onClick={() => openEdit(c)} title="Edit contact">
                        <Edit2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Result count */}
        {!loading && filtered.length > 0 && (
          <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
            Showing {filtered.length} of {contacts.length} {title.toLowerCase()}
          </p>
        )}
      </div>

      {/* ── Modal ── */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditContact(null); }}
        title={editContact ? `Edit ${isCustomer ? 'Customer' : 'Vendor'}` : `New ${isCustomer ? 'Customer' : 'Vendor'}`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Field label="Name *" placeholder="Full name or company name" value={form.name} onChange={set('name')} />
          <Field label="Email" type="email" placeholder="contact@example.com" value={form.email} onChange={set('email')} />
          <Field label="Phone" placeholder="+1 (555) 000-0000" value={form.phone} onChange={set('phone')} />
          <Field label="Address" placeholder="Street, City, Country" value={form.address} onChange={set('address')} />
          <Field label="Tax ID / VAT" placeholder="Tax identification number" value={form.taxId} onChange={set('taxId')} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
            <button className="ghost-btn" onClick={() => { setShowForm(false); setEditContact(null); }}>
              Cancel
            </button>
            <button
              className="primary-btn"
              style={{
                background: form.name ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : 'rgba(255,255,255,0.1)',
                color: form.name ? '#fff' : 'rgba(255,255,255,0.3)',
                cursor: form.name && !saving ? 'pointer' : 'not-allowed',
                boxShadow: form.name ? '0 0 20px rgba(99,102,241,0.25)' : 'none',
              }}
              disabled={!form.name || saving}
              onClick={handleSave}
            >
              {saving ? (
                <>
                  <Loader2 size={15} style={{ animation: 'spin 0.8s linear infinite' }} />
                  Saving…
                </>
              ) : editContact ? (
                <>
                  <CheckCircle2 size={15} /> Update
                </>
              ) : (
                <>
                  <Plus size={15} /> Create
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </AuthGuard>
  );
}