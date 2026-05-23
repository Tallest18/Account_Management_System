'use client';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { getAccounts } from '@/lib/db';
import { Account } from '@/types';
import { formatCurrency, sumBy } from '@/lib/utils';
import {
  Download, RefreshCw, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight,
  Activity, Cpu, Package, DollarSign,
  ChevronDown, Info,
} from 'lucide-react';

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
interface CashSection {
  label: string;
  items: { name: string; amount: number; indent?: boolean }[];
  total: number;
  color: string;
  icon: React.ReactNode;
  description: string;
}

/* ─────────────────────────────────────────
   BAR — declared at module scope so it is
   never re-created during render, satisfying
   react-hooks/static-components.
   maxAbs and scale are passed as plain props
   instead of closing over the parent's locals.
───────────────────────────────────────── */
function Bar({
  value, color, label, maxAbs,
}: {
  value: number; color: string; label: string; maxAbs: number;
}) {
  const pct = Math.round((Math.abs(value) / Math.max(maxAbs, 1)) * 100);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
        {label}
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', height: 120, justifyContent: 'flex-end', position: 'relative' }}>
        {value !== 0 && (
          <div style={{
            width: '60%', height: `${pct}%`,
            background: value >= 0 ? color : `${color}80`,
            borderRadius: value >= 0 ? '6px 6px 0 0' : '0 0 6px 6px',
            border: `1px solid ${color}50`,
            position: 'relative',
            minHeight: 4,
            transition: 'height 1s cubic-bezier(0.34,1.2,0.64,1)',
          }}>
            <div style={{
              position: 'absolute',
              top: value >= 0 ? -22 : 'auto',
              bottom: value < 0 ? -22 : 'auto',
              left: '50%', transform: 'translateX(-50%)',
              fontSize: 11, fontWeight: 600,
              color: value >= 0 ? color : '#e24b4a',
              whiteSpace: 'nowrap',
              fontFamily: "'DM Mono', monospace",
            }}>
              {value >= 0 ? '+' : ''}{formatCurrency(value)}
            </div>
          </div>
        )}
        {value === 0 && (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Mono',monospace" }}>—</div>
        )}
      </div>
      <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.08)' }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   WATERFALL BAR
   openingBalance removed from props — it was
   flagged as unused (@typescript-eslint/no-unused-vars).
───────────────────────────────────────── */
function WaterfallBar({
  operating, investing, financing, netChange,
}: {
  operating: number; investing: number; financing: number; netChange: number;
}) {
  const maxAbs = Math.max(
    Math.abs(operating), Math.abs(investing),
    Math.abs(financing), Math.abs(netChange),
    1,
  );

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', padding: '32px 24px 16px' }}>
      <Bar value={operating} color="#3dba7e" label="Operating" maxAbs={maxAbs} />
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 8px', color: 'rgba(255,255,255,0.15)', fontSize: 18 }}>+</div>
      <Bar value={investing} color="#4a90d9" label="Investing" maxAbs={maxAbs} />
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 8px', color: 'rgba(255,255,255,0.15)', fontSize: 18 }}>+</div>
      <Bar value={financing} color="#c3a26e" label="Financing" maxAbs={maxAbs} />
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '0 0 8px', color: 'rgba(255,255,255,0.15)', fontSize: 18 }}>=</div>
      <Bar value={netChange} color={netChange >= 0 ? '#3dba7e' : '#e24b4a'} label="Net Change" maxAbs={maxAbs} />
    </div>
  );
}

/* ─────────────────────────────────────────
   COLLAPSIBLE SECTION
───────────────────────────────────────── */
function CashFlowSection({ section, currency, idx }: { section: CashSection; currency: string; idx: number }) {
  const [open, setOpen] = useState(true);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);

  return (
    <div
      className="cf-panel"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 18,
        overflow: 'hidden',
        animationDelay: `${0.1 + idx * 0.08}s`,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 14, padding: '18px 22px',
          borderBottom: open ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'background 0.15s',
          fontFamily: "'Outfit', sans-serif",
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: `${section.color}18`, border: `1px solid ${section.color}28`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: section.color, flexShrink: 0,
        }}>
          {section.icon}
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{section.label}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{section.description}</div>
        </div>
        <div style={{ textAlign: 'right', marginRight: 12 }}>
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 17, fontWeight: 700,
            color: section.total >= 0 ? section.color : '#e24b4a',
          }}>
            {section.total >= 0 ? '+' : ''}{formatCurrency(section.total, currency)}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>
            {section.items.length} line item{section.items.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
          <ChevronDown size={16} />
        </div>
      </button>

      {open && (
        <div>
          {section.items.length === 0 ? (
            <div style={{ padding: '16px 22px', fontSize: 13, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No activity this period</div>
          ) : (
            section.items.map((item, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredItem(i)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: `10px ${item.indent ? '22px 10px 42px' : '22px 10px 22px'}`,
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  background: hoveredItem === i ? 'rgba(255,255,255,0.02)' : 'transparent',
                  transition: 'background 0.12s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 2, height: 20, borderRadius: 4, flexShrink: 0,
                    background: item.amount >= 0 ? section.color : '#e24b4a',
                    opacity: hoveredItem === i ? 1 : 0.3,
                    transition: 'opacity 0.15s',
                  }} />
                  <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.65)', paddingLeft: item.indent ? 12 : 0 }}>
                    {item.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {item.amount >= 0
                    ? <ArrowUpRight size={12} style={{ color: section.color, opacity: 0.7 }} />
                    : <ArrowDownRight size={12} style={{ color: '#e24b4a', opacity: 0.7 }} />
                  }
                  <span style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 13.5, fontWeight: 500,
                    color: item.amount >= 0 ? 'rgba(255,255,255,0.8)' : '#e24b4a',
                  }}>
                    {item.amount >= 0 ? '+' : ''}{formatCurrency(item.amount, currency)}
                  </span>
                </div>
              </div>
            ))
          )}

          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 22px',
            background: `${section.color}08`,
            borderTop: `1px solid ${section.color}18`,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.55)' }}>
              Net {section.label}
            </span>
            <span style={{
              fontFamily: "'DM Mono', monospace", fontSize: 15, fontWeight: 700,
              color: section.total >= 0 ? section.color : '#e24b4a',
              background: `${section.total >= 0 ? section.color : '#e24b4a'}12`,
              padding: '4px 12px', borderRadius: 8,
              border: `1px solid ${section.total >= 0 ? section.color : '#e24b4a'}22`,
            }}>
              {section.total >= 0 ? '+' : ''}{formatCurrency(section.total, currency)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   KPI CARD
───────────────────────────────────────── */
function KPICard({ label, value, currency, color, icon, sub }: {
  label: string; value: number; currency: string; color: string;
  icon: React.ReactNode; sub?: string;
}) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 12,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -24, right: -24, width: 80, height: 80, borderRadius: '50%', background: color, opacity: 0.07, filter: 'blur(28px)', pointerEvents: 'none' }} />
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: value >= 0 ? color : '#e24b4a', letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>
          {value >= 0 ? '+' : ''}{formatCurrency(value, currency)}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════ */
export default function CashFlowPage() {
  const { user, company } = useAuth();

  // Single atomic state object — same pattern as the P&L page.
  // Zero synchronous setState in any effect body.
  const [{ accounts, loading }, setData] = useState<{
    accounts: Account[];
    loading: boolean;
  }>({ accounts: [], loading: true });

  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const cur = company?.currency ?? 'USD';
  const today = new Date();
  const periodLabel = period === 'month'
    ? today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : period === 'quarter'
    ? `Q${Math.ceil((today.getMonth() + 1) / 3)} ${today.getFullYear()}`
    : `FY ${today.getFullYear()}`;

  const companyId = user?.companyId;

  // No synchronous setState in the effect body.
  // The only setState is setData() inside .then() — async boundary, permitted.
  useEffect(() => {
    if (!companyId) return;
    getAccounts(companyId).then((accts) => {
      setData({ accounts: accts, loading: false });
    });
  }, [companyId]);

  // Manual refresh — lives outside useEffect entirely.
  function handleRefresh() {
    if (!companyId) return;
    setRefreshing(true);
    getAccounts(companyId).then((accts) => {
      setData({ accounts: accts, loading: false });
      setRefreshing(false);
    });
  }

  /* ── Derive cash flow from chart of accounts balances ── */
  const revenue  = accounts.filter((a) => a.type === 'revenue');
  const expenses = accounts.filter((a) => a.type === 'expense');
  const assets   = accounts.filter((a) => a.type === 'asset');
  const liab     = accounts.filter((a) => a.type === 'liability');
  const equity   = accounts.filter((a) => a.type === 'equity');

  // Operating
  const netIncome   = sumBy(revenue, 'balance') - sumBy(expenses, 'balance');

  // Cast a.category to string to avoid TS2367 — AccountCategory union may not
  // include these working-capital strings, but the runtime check is intentional.
  const ar = assets.filter(
    (a) => (a.category as string) === 'accounts_receivable' || a.name?.toLowerCase().includes('receivable'),
  );
  const ap = liab.filter(
    (a) => (a.category as string) === 'accounts_payable' || a.name?.toLowerCase().includes('payable'),
  );
  const depAccounts  = assets.filter((a) =>
    a.name?.toLowerCase().includes('depreciation') || a.name?.toLowerCase().includes('amortiz'),
  );
  const depreciation = Math.abs(sumBy(depAccounts, 'balance'));
  const arChange     = -sumBy(ar, 'balance');
  const apChange     = sumBy(ap, 'balance');

  const operatingItems = [
    { name: 'Net Income / (Loss)', amount: netIncome },
    ...(depreciation ? [{ name: 'Add: Depreciation & Amortization', amount: depreciation, indent: true }] : []),
    ...(arChange !== 0 ? [{ name: 'Change in Accounts Receivable', amount: arChange, indent: true }] : []),
    ...(apChange !== 0 ? [{ name: 'Change in Accounts Payable',    amount: apChange, indent: true }] : []),
    ...expenses
      .filter((a) =>
        (a.category as string) === 'payroll' ||
        a.name?.toLowerCase().includes('payroll') ||
        a.name?.toLowerCase().includes('salary'),
      )
      .map((a) => ({ name: `Accrued: ${a.name}`, amount: -a.balance, indent: true })),
  ];
  const totalOperating = operatingItems.reduce((s, i) => s + i.amount, 0);

  // Investing
  const fixedAssetAccts = assets.filter((a) =>
    (a.category as string) === 'fixed_asset' ||
    a.name?.toLowerCase().includes('equipment') ||
    a.name?.toLowerCase().includes('property') ||
    a.name?.toLowerCase().includes('vehicle'),
  );
  const investingItems = fixedAssetAccts.map((a) => ({ name: `Purchase: ${a.name}`, amount: -Math.abs(a.balance) }));
  const totalInvesting  = investingItems.reduce((s, i) => s + i.amount, 0);

  // Financing
  const loans    = liab.filter((a) =>
    (a.category as string) === 'long_term_liability' ||
    a.name?.toLowerCase().includes('loan') ||
    a.name?.toLowerCase().includes('mortgage') ||
    a.name?.toLowerCase().includes('note'),
  );
  const equityIn = equity.filter((a) => a.balance > 0);
  const divs     = equity.filter((a) =>
    a.name?.toLowerCase().includes('dividend') || a.name?.toLowerCase().includes('distribution'),
  );

  const financingItems = [
    ...loans.map((a)    => ({ name: `Proceeds: ${a.name}`,       amount:  a.balance })),
    ...equityIn.map((a) => ({ name: `Capital: ${a.name}`,        amount:  a.balance })),
    ...divs.map((a)     => ({ name: `Dividends Paid: ${a.name}`, amount: -Math.abs(a.balance) })),
  ];
  const totalFinancing = financingItems.reduce((s, i) => s + i.amount, 0);

  const netCashChange = totalOperating + totalInvesting + totalFinancing;
  const cashAccounts  = assets.filter((a) =>
    (a.category as string) === 'current_asset' &&
    (a.name?.toLowerCase().includes('cash') || a.name?.toLowerCase().includes('bank')),
  );
  const closingCash = sumBy(cashAccounts, 'balance');
  const openingCash = Math.max(0, closingCash - netCashChange);

  const sections: CashSection[] = [
    {
      label: 'Operating Activities',
      items: operatingItems,
      total: totalOperating,
      color: '#3dba7e',
      icon: <Activity size={17} />,
      description: 'Core business income and working capital',
    },
    {
      label: 'Investing Activities',
      items: investingItems,
      total: totalInvesting,
      color: '#4a90d9',
      icon: <Package size={17} />,
      description: 'Capital expenditures and asset purchases',
    },
    {
      label: 'Financing Activities',
      items: financingItems,
      total: totalFinancing,
      color: '#c3a26e',
      icon: <Cpu size={17} />,
      description: 'Debt, equity, and dividend transactions',
    },
  ];

  return (
    <AuthGuard>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin   { to { transform:rotate(360deg) } }
        .cf-page * { box-sizing:border-box; }
        .cf-page   { font-family:'Outfit',sans-serif; }
        .cf-panel  { animation: fadeUp 0.5s ease both; }
        .spin-icon { animation: spin 0.9s linear infinite; }
        .period-btn {
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 9px; padding: 7px 14px;
          font-size: 12px; font-weight: 600; letter-spacing:0.04em;
          color: rgba(255,255,255,0.45); cursor:pointer;
          font-family:'Outfit',sans-serif; transition: all 0.15s;
        }
        .period-btn.active {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.18);
          color: #fff;
        }
        .period-btn:hover { color: rgba(255,255,255,0.8); }
      `}</style>

      <div
        className="cf-page"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(155deg, #090f18 0%, #0c1420 50%, #080d14 100%)',
          padding: '40px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ambient glows */}
        <div style={{ position:'absolute', top:-80, right:-100, width:400, height:400, borderRadius:'50%', background:'#4a90d9', opacity:0.04, filter:'blur(100px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-80, width:350, height:350, borderRadius:'50%', background:'#3dba7e', opacity:0.04, filter:'blur(90px)', pointerEvents:'none' }} />

        {/* ── Header ── */}
        <div className="cf-panel" style={{ animationDelay:'0s', marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'rgba(74,144,217,0.12)', border:'1px solid rgba(74,144,217,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#4a90d9' }}>
                  <DollarSign size={18} />
                </div>
                <h1 style={{ margin:0, fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.03em', fontFamily:"'Outfit',sans-serif" }}>
                  Cash Flow Statement
                </h1>
              </div>
              <p style={{ margin:'0 0 0 50px', fontSize:13.5, color:'rgba(255,255,255,0.35)' }}>
                {company?.name ?? 'Company'} — <span style={{ color:'rgba(255,255,255,0.6)' }}>{periodLabel}</span>
              </p>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ display:'flex', gap:4, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:12, padding:4 }}>
                {(['month','quarter','year'] as const).map((p) => (
                  <button key={p} className={`period-btn ${period === p ? 'active' : ''}`} onClick={() => setPeriod(p)}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRefresh}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'9px 16px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'Outfit',sans-serif", transition:'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>

              <button
                style={{ background:'linear-gradient(135deg, #4a90d9, #2e74c0)', border:'none', borderRadius:12, padding:'9px 18px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'Outfit',sans-serif", transition:'all 0.2s' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(74,144,217,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
              >
                <Download size={14} />
                Export
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 0', gap:18 }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.06)', borderTopColor:'#4a90d9', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, margin:0 }}>Computing cash flows…</p>
          </div>
        ) : (
          <>
            {/* ── KPI bar ── */}
            <div className="cf-panel" style={{ animationDelay:'0.06s', display:'flex', gap:14, marginBottom:28, flexWrap:'wrap' }}>
              <KPICard label="Operating Cash Flow" value={totalOperating} currency={cur} color="#3dba7e" icon={<Activity size={17} />} sub="Core business" />
              <KPICard label="Investing Cash Flow" value={totalInvesting} currency={cur} color="#4a90d9" icon={<Package size={17} />} sub="CapEx & assets" />
              <KPICard label="Financing Cash Flow" value={totalFinancing} currency={cur} color="#c3a26e" icon={<Cpu size={17} />} sub="Debt & equity" />
              <KPICard
                label="Net Change in Cash"
                value={netCashChange}
                currency={cur}
                color={netCashChange >= 0 ? '#3dba7e' : '#e24b4a'}
                icon={netCashChange >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />}
                sub={netCashChange >= 0 ? 'Cash position improving' : 'Cash position declining'}
              />
            </div>

            {/* ── Waterfall chart ── */}
            <div
              className="cf-panel"
              style={{
                animationDelay:'0.12s', marginBottom:28,
                background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:18, overflow:'hidden',
              }}
            >
              <div style={{ padding:'16px 22px 0', borderBottom:'1px solid rgba(255,255,255,0.05)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)' }}>Cash Flow Breakdown</span>
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', gap:5 }}><Info size={11} /> Indirect method</span>
              </div>
              <WaterfallBar
                operating={totalOperating}
                investing={totalInvesting}
                financing={totalFinancing}
                netChange={netCashChange}
              />
            </div>

            {/* ── Sections ── */}
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              {sections.map((s, i) => (
                <CashFlowSection key={i} section={s} currency={cur} idx={i} />
              ))}
            </div>

            {/* ── Cash Position Reconciliation ── */}
            <div
              className="cf-panel"
              style={{
                animationDelay:'0.38s', marginTop:24,
                background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:18, overflow:'hidden',
              }}
            >
              <div style={{ padding:'14px 22px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:12, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)' }}>
                Cash Position Reconciliation
              </div>

              {[
                { label: 'Opening Cash Balance',                     value: openingCash,    color: 'rgba(255,255,255,0.6)' },
                { label: 'Net Cash from Operating Activities',       value: totalOperating, color: '#3dba7e' },
                { label: 'Net Cash from Investing Activities',       value: totalInvesting, color: '#4a90d9' },
                { label: 'Net Cash from Financing Activities',       value: totalFinancing, color: '#c3a26e' },
              ].map((row, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 22px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize:13.5, color:'rgba(255,255,255,0.55)' }}>{row.label}</span>
                  <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:500, color: row.value < 0 ? '#e24b4a' : row.color }}>
                    {row.value >= 0 && i > 0 ? '+' : ''}{formatCurrency(row.value, cur)}
                  </span>
                </div>
              ))}

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'18px 22px', background:'rgba(255,255,255,0.03)', borderTop:'1px solid rgba(255,255,255,0.1)' }}>
                <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Closing Cash Balance</span>
                <span style={{
                  fontFamily:"'DM Mono',monospace", fontSize:18, fontWeight:700,
                  color: closingCash >= 0 ? '#3dba7e' : '#e24b4a',
                  background: `${closingCash >= 0 ? '#3dba7e' : '#e24b4a'}12`,
                  padding:'5px 14px', borderRadius:10,
                  border:`1px solid ${closingCash >= 0 ? '#3dba7e' : '#e24b4a'}25`,
                }}>
                  {formatCurrency(closingCash, cur)}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}