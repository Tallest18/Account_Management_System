'use client';
import { useEffect, useState } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { getAccounts } from '@/lib/db';
import { Account } from '@/types';
import { formatCurrency, sumBy } from '@/lib/utils';
import {
  Download, RefreshCw, TrendingUp, TrendingDown,
  Scale, CheckCircle2, AlertTriangle,
  Building2, Layers, PiggyBank, CreditCard, BarChart3
} from 'lucide-react';

/* ─── helpers ─── */
function pct(part: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round(Math.abs(part / total) * 100));
}

/* ─── Stat card ─── */
function KPI({ label, value, icon, color, sub }: { label: string; value: string; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'rgba(255,255,255,0.028)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 18,
      padding: '22px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: color, opacity: 0.06, filter: 'blur(30px)', pointerEvents: 'none' }} />
      <div style={{ width: 38, height: 38, borderRadius: 11, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 5 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', fontFamily: "'Outfit', sans-serif" }}>{value}</div>
        {sub && <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  );
}

/* ─── Section row ─── */
function AccountRow({ a, currency, total, color }: { a: Account; currency: string; total: number; color: string }) {
  const [hovered, setHovered] = useState(false);
  const w = pct(a.balance, total);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center',
        padding: '11px 22px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'background 0.15s',
        gap: 12,
      }}
    >
      <div style={{ width: 3, height: 28, borderRadius: 4, background: color, opacity: hovered ? 1 : 0.25, transition: 'opacity 0.15s', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{a.code}</span>
          <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</span>
        </div>
        <div style={{ height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 4, marginTop: 5, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${w}%`, background: color, opacity: 0.45, borderRadius: 4, transition: 'width 1s ease' }} />
        </div>
      </div>
      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13.5, fontWeight: 500, color: '#fff', flexShrink: 0 }}>
        {formatCurrency(a.balance, currency)}
      </span>
    </div>
  );
}

/* ─── Section block ─── */
function Section({
  icon, title, accounts, subtotal, subtotalLabel, color, currency, grandTotal
}: {
  icon: React.ReactNode; title: string; accounts: Account[];
  subtotal: number; subtotalLabel: string; color: string;
  currency: string; grandTotal: number;
}) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 22px',
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span style={{ color, opacity: 0.7 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{title}</span>
        <span style={{
          marginLeft: 'auto', fontSize: 11, fontWeight: 600,
          background: `${color}18`, color, padding: '2px 8px', borderRadius: 6,
          fontFamily: "'DM Mono', monospace",
        }}>
          {accounts.length} account{accounts.length !== 1 ? 's' : ''}
        </span>
      </div>

      {accounts.length === 0 ? (
        <div style={{ padding: '12px 22px', fontSize: 12, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic' }}>No accounts</div>
      ) : (
        accounts.map((a) => <AccountRow key={a.id} a={a} currency={currency} total={grandTotal} color={color} />)
      )}

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 22px',
        borderTop: `1px solid ${color}20`,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: `${color}08`,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)' }}>{subtotalLabel}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 14, fontWeight: 700, color }}>
          {formatCurrency(subtotal, currency)}
        </span>
      </div>
    </div>
  );
}

/* ─── Grand total row ─── */
function GrandTotal({ label, value, currency, balanced }: { label: string; value: number; currency: string; balanced?: boolean }) {
  const color = balanced === undefined ? '#c3a26e' : balanced ? '#3dba7e' : '#e24b4a';
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '18px 22px',
      background: 'rgba(255,255,255,0.04)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.01em' }}>{label}</span>
      <span style={{
        fontFamily: "'DM Mono', monospace", fontSize: 18, fontWeight: 700, color,
        background: `${color}15`, padding: '5px 14px', borderRadius: 10,
        border: `1px solid ${color}25`,
      }}>
        {formatCurrency(value, currency)}
      </span>
    </div>
  );
}

/* ═══════════════════════════════════════ MAIN ═══════════════════════════════════════ */
export default function BalanceSheetPage() {
  const { user, company } = useAuth();

  // Atomic state — zero synchronous setState in any effect body.
  const [{ accounts, loading }, setData] = useState<{
    accounts: Account[];
    loading: boolean;
  }>({ accounts: [], loading: true });

  const [refreshing, setRefreshing] = useState(false);

  const cur = company?.currency ?? 'USD';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const companyId = user?.companyId;

  // No synchronous setState in the effect body.
  // setData() only runs inside .then() — async boundary, permitted.
  useEffect(() => {
    if (!companyId) return;
    getAccounts(companyId).then((data) => {
      setData({ accounts: data, loading: false });
    });
  }, [companyId]);

  // Manual refresh — outside useEffect entirely.
  function handleRefresh() {
    if (!companyId) return;
    setRefreshing(true);
    getAccounts(companyId).then((data) => {
      setData({ accounts: data, loading: false });
      setRefreshing(false);
    });
  }

  /* compute */
  const assetAccounts   = accounts.filter((a) => a.type === 'asset');
  const liabAccounts    = accounts.filter((a) => a.type === 'liability');
  const equityAccounts  = accounts.filter((a) => a.type === 'equity');
  const revenue         = sumBy(accounts.filter((a) => a.type === 'revenue'), 'balance');
  const expenses        = sumBy(accounts.filter((a) => a.type === 'expense'), 'balance');
  const retainedEarnings = revenue - expenses;

  const currentAssets   = assetAccounts.filter((a) => a.category === 'current_asset');
  const fixedAssets     = assetAccounts.filter((a) => a.category === 'fixed_asset');
  const currentLiab     = liabAccounts.filter((a) => a.category === 'current_liability');
  const ltLiab          = liabAccounts.filter((a) => a.category === 'long_term_liability');

  const totalCurrentAssets  = sumBy(currentAssets, 'balance');
  const totalFixedAssets    = sumBy(fixedAssets, 'balance');
  const totalAssets         = sumBy(assetAccounts, 'balance');
  const totalCurrentLiab    = sumBy(currentLiab, 'balance');
  const totalLtLiab         = sumBy(ltLiab, 'balance');
  const totalLiabilities    = sumBy(liabAccounts, 'balance');
  const totalEquityBase     = sumBy(equityAccounts, 'balance');
  const totalEquity         = totalEquityBase + retainedEarnings;
  const totalLiabEquity     = totalLiabilities + totalEquity;
  const isBalanced          = Math.abs(totalAssets - totalLiabEquity) < 0.01;
  const diff                = Math.abs(totalAssets - totalLiabEquity);

  const debtRatio = totalAssets ? totalLiabilities / totalAssets : 0;

  return (
    <AuthGuard>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        @keyframes fadeUp { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes shimmer { 0%,100%{opacity:.5} 50%{opacity:1} }
        .bs-page * { box-sizing:border-box; }
        .bs-page { font-family:'Outfit',sans-serif; }
        .panel { animation: fadeUp 0.5s ease both; }
        .spin  { animation: spin 0.9s linear infinite; }
      `}</style>

      <div
        className="bs-page"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(150deg, #07100f 0%, #0a1218 55%, #0b0e18 100%)',
          padding: '40px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* ambient glows */}
        <div style={{ position:'absolute', top:-120, left:-120, width:400, height:400, borderRadius:'50%', background:'#3dba7e', opacity:0.04, filter:'blur(100px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-60, right:-80, width:350, height:350, borderRadius:'50%', background:'#c3a26e', opacity:0.04, filter:'blur(90px)', pointerEvents:'none' }} />

        {/* ── Header ── */}
        <div className="panel" style={{ animationDelay:'0s', marginBottom:36 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:20 }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6 }}>
                <div style={{ width:38, height:38, borderRadius:11, background:'rgba(195,162,110,0.12)', border:'1px solid rgba(195,162,110,0.25)', display:'flex', alignItems:'center', justifyContent:'center', color:'#c3a26e' }}>
                  <Scale size={18} />
                </div>
                <h1 style={{ margin:0, fontSize:28, fontWeight:700, color:'#fff', letterSpacing:'-0.03em', fontFamily:"'Outfit',sans-serif" }}>
                  Balance Sheet
                </h1>
              </div>
              <p style={{ margin:'0 0 0 50px', fontSize:13.5, color:'rgba(255,255,255,0.35)' }}>
                {company?.name ?? 'Company'} — As of <span style={{ color:'rgba(255,255,255,0.6)' }}>{today}</span>
              </p>
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button
                onClick={handleRefresh}
                style={{
                  background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                  borderRadius:12, padding:'9px 18px', fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.7)',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'Outfit',sans-serif",
                  transition:'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.1)'; e.currentTarget.style.color='#fff'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background='rgba(255,255,255,0.06)'; e.currentTarget.style.color='rgba(255,255,255,0.7)'; }}
              >
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <button
                style={{
                  background:'linear-gradient(135deg, #c3a26e, #a8845a)',
                  border:'none', borderRadius:12, padding:'9px 18px',
                  fontSize:13, fontWeight:600, color:'#fff',
                  cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontFamily:"'Outfit',sans-serif",
                  transition:'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform='translateY(-1px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(195,162,110,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow=''; }}
              >
                <Download size={14} />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'100px 0', gap:18 }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(255,255,255,0.06)', borderTopColor:'#c3a26e', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
            <p style={{ color:'rgba(255,255,255,0.3)', fontSize:14, margin:0 }}>Loading accounts…</p>
          </div>
        ) : (
          <>
            {/* ── KPI row ── */}
            <div className="panel" style={{ animationDelay:'0.08s', display:'flex', gap:14, marginBottom:32, flexWrap:'wrap' }}>
              <KPI label="Total Assets"      value={formatCurrency(totalAssets, cur)}      icon={<BarChart3 size={18} />} color="#3dba7e" sub="All owned resources" />
              <KPI label="Total Liabilities" value={formatCurrency(totalLiabilities, cur)} icon={<CreditCard size={18} />} color="#e24b4a" sub="All obligations" />
              <KPI label="Total Equity"      value={formatCurrency(totalEquity, cur)}      icon={<PiggyBank size={18} />} color="#c3a26e" sub={`Retained: ${formatCurrency(retainedEarnings, cur)}`} />
              <KPI
                label="Debt Ratio"
                value={`${(debtRatio * 100).toFixed(1)}%`}
                icon={<Layers size={18} />}
                color={debtRatio > 0.6 ? '#e24b4a' : debtRatio > 0.4 ? '#f5a623' : '#3dba7e'}
                sub={debtRatio > 0.6 ? 'High leverage' : debtRatio > 0.4 ? 'Moderate' : 'Healthy'}
              />
            </div>

            {/* ── Balance alert ── */}
            {!isBalanced && (
              <div className="panel" style={{ animationDelay:'0.12s', marginBottom:24, padding:'14px 20px', borderRadius:14, background:'rgba(226,75,74,0.08)', border:'1px solid rgba(226,75,74,0.2)', display:'flex', alignItems:'center', gap:12 }}>
                <AlertTriangle size={17} style={{ color:'#e24b4a', flexShrink:0 }} />
                <span style={{ fontSize:13.5, color:'#e24b4a', fontWeight:500 }}>
                  Balance sheet is out of balance by <strong style={{ fontFamily:"'DM Mono',monospace" }}>{formatCurrency(diff, cur)}</strong>. Check for missing entries.
                </span>
              </div>
            )}
            {isBalanced && totalAssets > 0 && (
              <div className="panel" style={{ animationDelay:'0.12s', marginBottom:24, padding:'12px 20px', borderRadius:14, background:'rgba(61,186,126,0.07)', border:'1px solid rgba(61,186,126,0.18)', display:'flex', alignItems:'center', gap:12 }}>
                <CheckCircle2 size={16} style={{ color:'#3dba7e', flexShrink:0 }} />
                <span style={{ fontSize:13.5, color:'#3dba7e', fontWeight:500 }}>Balance sheet is balanced</span>
              </div>
            )}

            {/* ── Two-column grid ── */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 }}>

              {/* ════ ASSETS ════ */}
              <div className="panel" style={{ animationDelay:'0.16s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <TrendingUp size={15} style={{ color:'#3dba7e' }} />
                  <h2 style={{ margin:0, fontSize:12, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)' }}>Assets</h2>
                </div>

                <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, overflow:'hidden' }}>
                  <Section
                    icon={<Building2 size={13} />}
                    title="Current Assets"
                    accounts={currentAssets}
                    subtotal={totalCurrentAssets}
                    subtotalLabel="Total Current Assets"
                    color="#3dba7e"
                    currency={cur}
                    grandTotal={totalAssets}
                  />
                  <Section
                    icon={<Layers size={13} />}
                    title="Fixed Assets"
                    accounts={fixedAssets}
                    subtotal={totalFixedAssets}
                    subtotalLabel="Total Fixed Assets"
                    color="#4a90d9"
                    currency={cur}
                    grandTotal={totalAssets}
                  />

                  <div style={{ padding:'14px 22px 6px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:6 }}>
                      <span>Current</span><span>Fixed</span>
                    </div>
                    <div style={{ display:'flex', height:5, borderRadius:4, overflow:'hidden', gap:2 }}>
                      <div style={{ flex: totalCurrentAssets || 1, background:'#3dba7e', opacity:0.5, borderRadius:4, transition:'flex 1s ease' }} />
                      <div style={{ flex: totalFixedAssets || 0, background:'#4a90d9', opacity:0.5, borderRadius:4, transition:'flex 1s ease' }} />
                    </div>
                  </div>

                  <GrandTotal label="Total Assets" value={totalAssets} currency={cur} />
                </div>
              </div>

              {/* ════ LIABILITIES + EQUITY ════ */}
              <div className="panel" style={{ animationDelay:'0.22s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <TrendingDown size={15} style={{ color:'#e24b4a' }} />
                  <h2 style={{ margin:0, fontSize:12, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)' }}>Liabilities & Equity</h2>
                </div>

                <div style={{ background:'rgba(255,255,255,0.025)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:18, overflow:'hidden' }}>
                  <Section
                    icon={<CreditCard size={13} />}
                    title="Current Liabilities"
                    accounts={currentLiab}
                    subtotal={totalCurrentLiab}
                    subtotalLabel="Total Current Liabilities"
                    color="#e24b4a"
                    currency={cur}
                    grandTotal={totalLiabEquity}
                  />
                  <Section
                    icon={<Building2 size={13} />}
                    title="Long-term Liabilities"
                    accounts={ltLiab}
                    subtotal={totalLtLiab}
                    subtotalLabel="Total Long-term Liabilities"
                    color="#f5a623"
                    currency={cur}
                    grandTotal={totalLiabEquity}
                  />

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 22px', background:'rgba(226,75,74,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.55)' }}>Total Liabilities</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:'#e24b4a' }}>{formatCurrency(totalLiabilities, cur)}</span>
                  </div>

                  <Section
                    icon={<PiggyBank size={13} />}
                    title="Equity"
                    accounts={equityAccounts}
                    subtotal={totalEquityBase}
                    subtotalLabel="Paid-in Capital"
                    color="#c3a26e"
                    currency={cur}
                    grandTotal={totalLiabEquity}
                  />

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 22px 11px 38px', borderBottom:'1px solid rgba(255,255,255,0.04)', background: retainedEarnings >= 0 ? 'rgba(61,186,126,0.04)' : 'rgba(226,75,74,0.04)' }}>
                    <span style={{ fontSize:13, color:'rgba(255,255,255,0.45)' }}>Retained Earnings (Current)</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:13, fontWeight:600, color: retainedEarnings >= 0 ? '#3dba7e' : '#e24b4a' }}>
                      {retainedEarnings >= 0 ? '+' : ''}{formatCurrency(retainedEarnings, cur)}
                    </span>
                  </div>

                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 22px', background:'rgba(195,162,110,0.05)', borderBottom:'1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,0.55)' }}>Total Equity</span>
                    <span style={{ fontFamily:"'DM Mono',monospace", fontSize:14, fontWeight:700, color:'#c3a26e' }}>{formatCurrency(totalEquity, cur)}</span>
                  </div>

                  <div style={{ padding:'14px 22px 6px', borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'rgba(255,255,255,0.25)', marginBottom:6 }}>
                      <span>Liabilities</span><span>Equity</span>
                    </div>
                    <div style={{ display:'flex', height:5, borderRadius:4, overflow:'hidden', gap:2 }}>
                      <div style={{ flex: totalLiabilities || 0, background:'#e24b4a', opacity:0.5, borderRadius:4, transition:'flex 1s ease' }} />
                      <div style={{ flex: totalEquity || 1, background:'#c3a26e', opacity:0.5, borderRadius:4, transition:'flex 1s ease' }} />
                    </div>
                  </div>

                  <GrandTotal label="Total Liabilities & Equity" value={totalLiabEquity} currency={cur} balanced={isBalanced} />
                </div>
              </div>
            </div>

            {/* ── Reconciliation ── */}
            {totalAssets > 0 && (
              <div className="panel" style={{ animationDelay:'0.3s', marginTop:24, padding:'18px 24px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <Scale size={16} style={{ color:'rgba(255,255,255,0.3)' }} />
                  <span style={{ fontSize:13, color:'rgba(255,255,255,0.4)' }}>Accounting equation: Assets = Liabilities + Equity</span>
                </div>
                <div style={{ display:'flex', gap:24, fontFamily:"'DM Mono',monospace", fontSize:13 }}>
                  <span style={{ color:'#3dba7e' }}>Assets <strong>{formatCurrency(totalAssets, cur)}</strong></span>
                  <span style={{ color:'rgba(255,255,255,0.2)' }}>=</span>
                  <span style={{ color: isBalanced ? '#c3a26e' : '#e24b4a' }}>L+E <strong>{formatCurrency(totalLiabEquity, cur)}</strong></span>
                  {isBalanced
                    ? <span style={{ color:'#3dba7e', display:'flex', alignItems:'center', gap:4 }}><CheckCircle2 size={13} /> Balanced</span>
                    : <span style={{ color:'#e24b4a', display:'flex', alignItems:'center', gap:4 }}><AlertTriangle size={13} /> Δ {formatCurrency(diff, cur)}</span>
                  }
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}