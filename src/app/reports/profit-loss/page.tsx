'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { getAccounts } from '@/lib/db';
import { Account } from '@/types';
import { formatCurrency, sumBy } from '@/lib/utils';
import {
  Download, RefreshCw, TrendingUp, TrendingDown,
  ArrowUpRight, ArrowDownRight, ShoppingCart,
  Zap, MoreHorizontal, ChevronDown, Target, Percent,
} from 'lucide-react';

/* ─────────────────────────────────
   MARGIN METER
───────────────────────────────── */
function MarginMeter({ value, label, color }: { value: number; label: string; color: string }) {
  const clamped = Math.max(-100, Math.min(100, value));
  const isPos = clamped >= 0;
  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'baseline' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, fontWeight: 700, color }}>{clamped.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, background: 'rgba(255,255,255,0.07)', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, height: '100%',
          left: isPos ? '50%' : `${50 + clamped / 2}%`,
          width: `${Math.abs(clamped) / 2}%`,
          background: color, borderRadius: 6,
          transition: 'width 1s cubic-bezier(0.34,1.2,0.64,1), left 1s cubic-bezier(0.34,1.2,0.64,1)',
          minWidth: clamped !== 0 ? 3 : 0,
        }} />
        <div style={{ position: 'absolute', top: 0, left: '50%', width: 1, height: '100%', background: 'rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   KPI CARD
───────────────────────────────── */
function KPI({ label, value, currency, color, icon, sub, pct }: {
  label: string; value: number; currency: string; color: string;
  icon: React.ReactNode; sub?: string; pct?: number;
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
      <div style={{ position: 'absolute', top: -28, right: -28, width: 90, height: 90, borderRadius: '50%', background: color, opacity: 0.07, filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
          {icon}
        </div>
        {pct !== undefined && (
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 600, color, background: `${color}15`, padding: '3px 9px', borderRadius: 8, border: `1px solid ${color}22` }}>
            {pct.toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: value >= 0 ? color : '#ef4444', letterSpacing: '-0.02em', fontFamily: "'Outfit',sans-serif" }}>
          {formatCurrency(value, currency)}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   ACCOUNT ROW
───────────────────────────────── */
function AccountRow({ account, currency, total, color, isExpense }: {
  account: Account; currency: string; total: number; color: string; isExpense?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const share = total > 0 ? Math.round((Math.abs(account.balance) / Math.abs(total)) * 100) : 0;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.03)',
        background: hovered ? 'rgba(99,102,241,0.04)' : 'transparent',
        transition: 'background 0.12s',
      }}
    >
      <div style={{ width: 2, height: 24, borderRadius: 4, background: color, opacity: hovered ? 1 : 0.25, flexShrink: 0, transition: 'opacity 0.15s' }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'rgba(255,255,255,0.25)', flexShrink: 0 }}>{account.code}</span>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{account.name}</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${share}%`, background: color, opacity: 0.4, borderRadius: 4, transition: 'width 1s ease' }} />
        </div>
      </div>
      {hovered && share > 0 && (
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: "'DM Mono',monospace", flexShrink: 0 }}>{share}%</span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {isExpense
          ? <ArrowDownRight size={12} style={{ color: '#ef4444', opacity: 0.7 }} />
          : <ArrowUpRight size={12} style={{ color, opacity: 0.7 }} />
        }
        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13.5, fontWeight: 500, color: isExpense ? '#ef4444' : 'rgba(255,255,255,0.8)' }}>
          {formatCurrency(account.balance, currency)}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   SECTION BLOCK
───────────────────────────────── */
function PLSection({ icon, title, description, accounts, total, subtotalLabel, color, currency, isExpense, revenueTotal }: {
  icon: React.ReactNode; title: string; description: string;
  accounts: Account[]; total: number; subtotalLabel: string;
  color: string; currency: string; isExpense?: boolean; revenueTotal?: number;
}) {
  const [open, setOpen] = useState(true);
  const pctOfRev = revenueTotal && revenueTotal > 0 ? (Math.abs(total) / revenueTotal) * 100 : null;

  return (
    <div style={{ marginBottom: 4 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', background: 'rgba(255,255,255,0.02)', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.05)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 24px',
          fontFamily: "'Outfit',sans-serif", transition: 'background 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(99,102,241,0.05)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
      >
        <span style={{ color, opacity: 0.75, flexShrink: 0 }}>{icon}</span>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{title}</span>
          {description && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', marginLeft: 10 }}>{description}</span>}
        </div>
        {pctOfRev !== null && (
          <span style={{ fontSize: 11, fontFamily: "'DM Mono',monospace", color: 'rgba(255,255,255,0.25)' }}>
            {pctOfRev.toFixed(1)}% of revenue
          </span>
        )}
        <span style={{ fontSize: 11, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', padding: '2px 8px', borderRadius: 6, fontFamily: "'DM Mono',monospace" }}>
          {accounts.length}
        </span>
        <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.25)', transition: 'transform 0.2s', transform: open ? 'rotate(0)' : 'rotate(-90deg)', flexShrink: 0 }} />
      </button>

      {open && (
        accounts.length === 0
          ? <div style={{ padding: '12px 24px', fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No accounts in this category</div>
          : accounts.map((a) => <AccountRow key={a.id} account={a} currency={currency} total={total} color={color} isExpense={isExpense} />)
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px',
        background: `${color}08`, borderTop: `1px solid ${color}15`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>{subtotalLabel}</span>
        <span style={{
          fontFamily: "'DM Mono',monospace", fontSize: 14, fontWeight: 700,
          color: isExpense ? '#ef4444' : color,
          background: `${isExpense ? '#ef4444' : color}12`,
          padding: '3px 12px', borderRadius: 8, border: `1px solid ${isExpense ? '#ef4444' : color}20`,
        }}>
          {isExpense && total > 0 ? '(' : ''}{formatCurrency(total, currency)}{isExpense && total > 0 ? ')' : ''}
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────
   DIVIDER METRIC
───────────────────────────────── */
function MetricDivider({ label, value, currency, pctOfRevenue, positive }: {
  label: string; value: number; currency: string; pctOfRevenue?: number; positive?: boolean;
}) {
  const isPos = value >= 0;
  /* neutral divider colour: amber #f5a623 → indigo #818cf8 */
  const col = isPos ? (positive === false ? '#818cf8' : '#10b981') : '#ef4444';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '16px 24px',
      background: 'rgba(255,255,255,0.035)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 4, height: 28, borderRadius: 4, background: col }} />
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{label}</div>
          {pctOfRevenue !== undefined && (
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 1, fontFamily: "'DM Mono',monospace" }}>
              {pctOfRevenue.toFixed(1)}% of revenue
            </div>
          )}
        </div>
      </div>
      <div style={{
        fontFamily: "'DM Mono',monospace", fontSize: 19, fontWeight: 700, color: col,
        background: `${col}10`, padding: '6px 16px', borderRadius: 10, border: `1px solid ${col}22`,
      }}>
        {formatCurrency(value, currency)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════
   MAIN PAGE
═══════════════════════════════ */
export default function ProfitLossPage() {
  const { user, company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const cur = company?.currency ?? 'USD';
  const today = new Date();
  const periodLabel = period === 'month'
    ? today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : period === 'quarter'
    ? `Q${Math.ceil((today.getMonth() + 1) / 3)} ${today.getFullYear()}`
    : `FY ${today.getFullYear()}`;

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    const data = await getAccounts(user.companyId);
    setAccounts(data);
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const revenueAccounts  = accounts.filter((a) => a.type === 'revenue');
  const cogsAccounts     = accounts.filter((a) => a.category === 'cogs');
  const opexAccounts     = accounts.filter((a) => a.category === 'operating_expense');
  const otherExpAccounts = accounts.filter((a) => a.category === 'other_expense');

  const totalRevenue    = sumBy(revenueAccounts, 'balance');
  const totalCOGS       = sumBy(cogsAccounts, 'balance');
  const grossProfit     = totalRevenue - totalCOGS;
  const grossMargin     = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalOpex       = sumBy(opexAccounts, 'balance');
  const operatingIncome = grossProfit - totalOpex;
  const opMargin        = totalRevenue > 0 ? (operatingIncome / totalRevenue) * 100 : 0;
  const totalOtherExp   = sumBy(otherExpAccounts, 'balance');
  const netIncome       = operatingIncome - totalOtherExp;
  const netMargin       = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

  return (
    <AuthGuard>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .pl-page * { box-sizing:border-box; }
        .pl-page   { font-family:'Outfit',sans-serif; }
        .pl-panel  { animation:fadeUp 0.5s ease both; }
        .spin-icon { animation:spin 0.9s linear infinite; }
        .period-btn {
          background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.09);
          border-radius:9px; padding:7px 14px; font-size:12px; font-weight:600;
          letter-spacing:0.04em; color:rgba(255,255,255,0.45); cursor:pointer;
          font-family:'Outfit',sans-serif; transition:all 0.15s;
        }
        /* active period: white highlight → indigo */
        .period-btn.active { background:rgba(99,102,241,0.18); border-color:rgba(99,102,241,0.35); color:#a5b4fc; }
        .period-btn:hover  { color:rgba(255,255,255,0.8); }
      `}</style>

      <div
        className="pl-page"
        style={{
          minHeight: '100vh',
          /* Page bg: purple-tinted → indigo-tinted matching login */
          background: 'linear-gradient(148deg, #07070f 0%, #0a0a18 50%, #07070f 100%)',
          padding: '40px 48px',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Ambient glows: purple/green/red → indigo/violet/blue */}
        <div style={{ position:'absolute', top:-100, right:-60, width:380, height:380, borderRadius:'50%', background:'#4f46e5', opacity:0.07, filter:'blur(100px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, left:-80, width:340, height:340, borderRadius:'50%', background:'#7c3aed', opacity:0.05, filter:'blur(90px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'40%', left:'50%', width:300, height:300, borderRadius:'50%', background:'#6366f1', opacity:0.04, filter:'blur(120px)', pointerEvents:'none' }} />

        {/* ── Header ── */}
        <div className="pl-panel" style={{ animationDelay:'0s', marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                {/* Header icon: purple #a855f7 → indigo */}
                <div style={{ width:38, height:38, borderRadius:11, background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#818cf8' }}>
                  <TrendingUp size={18} />
                </div>
                <h1 style={{ margin:0, fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.03em', fontFamily:"'Outfit',sans-serif" }}>
                  Profit & Loss
                </h1>
              </div>
              <p style={{ margin:'0 0 0 50px', fontSize:13.5, color:'rgba(255,255,255,0.35)' }}>
                {company?.name ?? 'Company'} — Period ending <span style={{ color:'rgba(255,255,255,0.6)' }}>{periodLabel}</span>
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
                onClick={() => load(true)}
                style={{ background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:12, padding:'9px 16px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'Outfit',sans-serif", transition:'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(99,102,241,0.1)'; e.currentTarget.style.color='#a5b4fc'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              {/* Export button: purple gradient → indigo/violet gradient */}
              <button
                style={{ background:'linear-gradient(135deg, #4f46e5, #7c3aed)', border:'none', borderRadius:12, padding:'9px 18px', fontSize:13, fontWeight:600, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'Outfit',sans-serif", transition:'all 0.2s', boxShadow:'0 0 20px rgba(99,102,241,0.25)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(99,102,241,0.4)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 0 20px rgba(99,102,241,0.25)'; }}
              >
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 0', gap:18 }}>
            {/* Spinner: purple → indigo */}
            <div style={{ width:40, height:40, border:'3px solid rgba(99,102,241,0.12)', borderTopColor:'#6366f1', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, margin:0 }}>Loading income statement…</p>
          </div>
        ) : (
          <>
            {/* ── KPI row ── */}
            <div className="pl-panel" style={{ animationDelay:'0.06s', display:'flex', gap:14, marginBottom:28, flexWrap:'wrap' }}>
              {/* Revenue: green kept (semantic positive) */}
              <KPI label="Total Revenue"     value={totalRevenue}    currency={cur} color="#10b981" icon={<ArrowUpRight size={17} />} sub="All income sources" />
              {/* Gross profit: blue #4a90d9 → indigo #6366f1 */}
              <KPI label="Gross Profit"      value={grossProfit}     currency={cur} color="#6366f1" icon={<Target size={17} />}      pct={grossMargin} sub="After cost of goods" />
              {/* Operating income: purple #a855f7 → violet #a78bfa */}
              <KPI label="Operating Income"  value={operatingIncome} currency={cur} color="#a78bfa" icon={<Zap size={17} />}         pct={opMargin}    sub="After operating expenses" />
              <KPI label="Net Income"        value={netIncome}       currency={cur} color={netIncome >= 0 ? '#10b981' : '#ef4444'} icon={netIncome >= 0 ? <TrendingUp size={17} /> : <TrendingDown size={17} />} pct={netMargin} sub="Bottom line" />
            </div>

            {/* ── Margin meters ── */}
            {totalRevenue > 0 && (
              <div
                className="pl-panel"
                style={{
                  animationDelay:'0.1s', marginBottom:24,
                  background:'rgba(255,255,255,0.025)', border:'1px solid rgba(99,102,241,0.1)',
                  borderRadius:18, padding:'20px 24px',
                  display:'flex', gap:32, flexWrap:'wrap',
                }}
              >
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <Percent size={14} style={{ color:'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize:12, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)' }}>Margin Analysis</span>
                </div>
                {/* Gross margin: blue #4a90d9 → indigo #6366f1 */}
                <MarginMeter value={grossMargin} label="Gross Margin"     color="#6366f1" />
                {/* Op margin: purple #a855f7 → violet #a78bfa */}
                <MarginMeter value={opMargin}    label="Operating Margin" color="#a78bfa" />
                <MarginMeter value={netMargin}   label="Net Margin"       color={netMargin >= 0 ? '#10b981' : '#ef4444'} />
              </div>
            )}

            {/* ── Main P&L Card ── */}
            <div
              className="pl-panel"
              style={{
                animationDelay:'0.14s',
                background:'rgba(255,255,255,0.025)', border:'1px solid rgba(99,102,241,0.1)',
                borderRadius:20, overflow:'hidden',
              }}
            >
              {/* Revenue — green kept */}
              <PLSection
                icon={<ArrowUpRight size={15} />}
                title="Revenue"
                description="All income streams"
                accounts={revenueAccounts}
                total={totalRevenue}
                subtotalLabel="Total Revenue"
                color="#10b981"
                currency={cur}
              />

              {/* COGS — amber kept as a distinct warning colour */}
              <PLSection
                icon={<ShoppingCart size={15} />}
                title="Cost of Goods Sold"
                description="Direct production costs"
                accounts={cogsAccounts}
                total={totalCOGS}
                subtotalLabel="Total COGS"
                color="#f59e0b"
                currency={cur}
                isExpense
                revenueTotal={totalRevenue}
              />

              {/* Gross Profit divider */}
              <MetricDivider
                label="Gross Profit"
                value={grossProfit}
                currency={cur}
                pctOfRevenue={totalRevenue > 0 ? grossMargin : undefined}
              />

              {/* OpEx — red kept (semantic cost) */}
              <PLSection
                icon={<Zap size={15} />}
                title="Operating Expenses"
                description="Day-to-day business costs"
                accounts={opexAccounts}
                total={totalOpex}
                subtotalLabel="Total Operating Expenses"
                color="#ef4444"
                currency={cur}
                isExpense
                revenueTotal={totalRevenue}
              />

              {/* Operating Income divider */}
              <MetricDivider
                label="Operating Income"
                value={operatingIncome}
                currency={cur}
                pctOfRevenue={totalRevenue > 0 ? opMargin : undefined}
              />

              {/* Other Expenses */}
              {otherExpAccounts.length > 0 && (
                <PLSection
                  icon={<MoreHorizontal size={15} />}
                  title="Other Expenses"
                  description="Non-operating costs"
                  accounts={otherExpAccounts}
                  total={totalOtherExp}
                  subtotalLabel="Total Other Expenses"
                  color="#ef4444"
                  currency={cur}
                  isExpense
                  revenueTotal={totalRevenue}
                />
              )}

              {/* Net Income — grand total */}
              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'22px 24px',
                background:'rgba(99,102,241,0.04)',
                borderTop:'2px solid rgba(99,102,241,0.18)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                  <div style={{ width:5, height:36, borderRadius:4, background: netIncome >= 0 ? '#10b981' : '#ef4444' }} />
                  <div>
                    <div style={{ fontSize:18, fontWeight:700, color:'#fff', letterSpacing:'-0.02em', fontFamily:"'Outfit',sans-serif" }}>Net Income</div>
                    {totalRevenue > 0 && (
                      <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)', fontFamily:"'DM Mono',monospace" }}>
                        {netMargin.toFixed(2)}% net margin
                      </div>
                    )}
                  </div>
                </div>
                <div style={{
                  fontFamily:"'DM Mono',monospace", fontSize:24, fontWeight:700,
                  color: netIncome >= 0 ? '#10b981' : '#ef4444',
                  background: `${netIncome >= 0 ? '#10b981' : '#ef4444'}12`,
                  padding:'8px 20px', borderRadius:14,
                  border:`1px solid ${netIncome >= 0 ? '#10b981' : '#ef4444'}28`,
                }}>
                  {formatCurrency(netIncome, cur)}
                </div>
              </div>
            </div>

            {/* ── Cost breakdown footer ── */}
            {totalRevenue > 0 && (
              <div
                className="pl-panel"
                style={{
                  animationDelay:'0.28s', marginTop:20,
                  display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14,
                }}
              >
                {[
                  /* COGS card: amber #f5a623 → keep as distinct warning colour */
                  { label: 'COGS / Revenue',   value: totalRevenue > 0 ? (totalCOGS / totalRevenue) * 100 : 0,   color: '#f59e0b', desc: 'Cost efficiency' },
                  /* OpEx card: red kept semantic */
                  { label: 'OpEx / Revenue',   value: totalRevenue > 0 ? (totalOpex / totalRevenue) * 100 : 0,   color: '#ef4444', desc: 'Operating efficiency' },
                  /* Profit retention: green/red semantic */
                  { label: 'Profit Retention', value: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,   color: netIncome >= 0 ? '#10b981' : '#ef4444', desc: 'Net margin' },
                ].map((m) => (
                  <div key={m.label} style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(99,102,241,0.08)', borderRadius:14, padding:'16px 18px' }}>
                    <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:8 }}>{m.label}</div>
                    <div style={{ fontSize:22, fontWeight:700, color:m.color, fontFamily:"'DM Mono',monospace", marginBottom:10 }}>{m.value.toFixed(1)}%</div>
                    <div style={{ height:5, background:'rgba(255,255,255,0.07)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${Math.min(100, Math.abs(m.value))}%`, background:m.color, opacity:0.6, borderRadius:4, transition:'width 1s ease' }} />
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:6 }}>{m.desc}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}