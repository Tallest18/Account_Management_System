'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { getAccounts } from '@/lib/db';
import { Account } from '@/types';
import { formatCurrency, toTitleCase, groupBy } from '@/lib/utils';
import { BarChart3, Download, RefreshCw, CheckCircle2, AlertTriangle, Wallet, Scale, Landmark, BarChart2, Receipt, TrendingUp } from 'lucide-react';

/* ─── Type Meta ─────────────────────────────────────────────────────────── */
const TYPE_META: Record<string, { color: string; bg: string; glow: string; icon: React.ReactNode; label: string }> = {
  asset:     { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)',   glow: 'rgba(96,165,250,0.15)',   icon: <Wallet    style={{ width: 13, height: 13 }} />, label: 'Assets' },
  liability: { color: '#f87171', bg: 'rgba(248,113,113,0.08)',  glow: 'rgba(248,113,113,0.15)',  icon: <Scale     style={{ width: 13, height: 13 }} />, label: 'Liabilities' },
  equity:    { color: '#c084fc', bg: 'rgba(192,132,252,0.08)',  glow: 'rgba(192,132,252,0.15)',  icon: <Landmark  style={{ width: 13, height: 13 }} />, label: 'Equity' },
  revenue:   { color: '#34d399', bg: 'rgba(52,211,153,0.08)',   glow: 'rgba(52,211,153,0.15)',   icon: <BarChart2 style={{ width: 13, height: 13 }} />, label: 'Revenue' },
  expense:   { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',   glow: 'rgba(251,191,36,0.15)',   icon: <Receipt   style={{ width: 13, height: 13 }} />, label: 'Expenses' },
};

/* ─── Summary Metric Card ───────────────────────────────────────────────── */
function MetricCard({ label, value, sub, color, icon, delay = 0 }: {
  label: string; value: string; sub?: string; color: string; icon: React.ReactNode; delay?: number;
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)',
      border: `1px solid ${color}22`,
      borderRadius: 16, padding: '20px 22px',
      position: 'relative', overflow: 'hidden',
      animation: `cardIn 0.5s ease ${delay}s both`,
      transition: 'all 0.3s ease',
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = color + '44';
        el.style.background = `rgba(255,255,255,0.04)`;
        el.style.transform = 'translateY(-2px)';
        el.style.boxShadow = `0 8px 32px ${color}22`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.borderColor = color + '22';
        el.style.background = 'rgba(255,255,255,0.025)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      <div style={{ position: 'absolute', top: -16, right: -16, width: 64, height: 64, borderRadius: '50%', background: color + '20', filter: 'blur(20px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
        <div style={{ color, opacity: 0.75 }}>{icon}</div>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>{label}</span>
      </div>
      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontFamily: 'monospace' }}>{sub}</div>}
    </div>
  );
}

/* ─── Balance Indicator ─────────────────────────────────────────────────── */
function BalanceIndicator({ isBalanced, difference }: { isBalanced: boolean; difference: number }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '14px 28px', borderRadius: 14, gap: 10,
      background: isBalanced ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)',
      border: `1px solid ${isBalanced ? 'rgba(52,211,153,0.25)' : 'rgba(248,113,113,0.25)'}`,
      animation: 'pulseIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
      boxShadow: isBalanced ? '0 0 32px rgba(52,211,153,0.1)' : '0 0 32px rgba(248,113,113,0.1)',
    }}>
      {isBalanced
        ? <CheckCircle2 style={{ width: 18, height: 18, color: '#34d399' }} />
        : <AlertTriangle style={{ width: 18, height: 18, color: '#f87171' }} />
      }
      <span style={{
        fontSize: 13, fontWeight: 700, letterSpacing: '0.04em',
        color: isBalanced ? '#34d399' : '#f87171',
        fontFamily: "'Syne', sans-serif",
      }}>
        {isBalanced
          ? 'Trial Balance is Balanced'
          : `Out of Balance — ${formatCurrency(difference)} difference`
        }
      </span>
    </div>
  );
}

/* ─── Account Row ───────────────────────────────────────────────────────── */
function AccountRow({ acct, index }: { acct: Account; index: number }) {
  const [hovered, setHovered] = useState(false);
  const isDebitNormal = acct.type === 'asset' || acct.type === 'expense';
  const debit  = isDebitNormal && acct.balance > 0  ? acct.balance  : null;
  const credit = !isDebitNormal && acct.balance > 0 ? acct.balance : null;

  return (
    <tr
      style={{
        background: hovered ? 'rgba(255,255,255,0.025)' : 'transparent',
        transition: 'background 0.15s ease',
        animation: `rowIn 0.35s ease ${index * 0.03}s both`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <td style={{ padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.035)' }}>
        <span style={{
          fontFamily: 'monospace', fontSize: 11,
          color: '#D4AF37', background: 'rgba(212,175,55,0.1)',
          padding: '3px 8px', borderRadius: 6, letterSpacing: '0.06em',
        }}>{acct.code}</span>
      </td>
      <td style={{ padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.035)', color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 500 }}>
        {acct.name}
      </td>
      <td style={{ padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.035)', fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: 'monospace' }}>
        {acct.type}
      </td>
      <td style={{ padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.035)', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: debit ? '#34d399' : 'rgba(255,255,255,0.12)' }}>
        {debit ? formatCurrency(debit) : '—'}
      </td>
      <td style={{ padding: '11px 20px', borderBottom: '1px solid rgba(255,255,255,0.035)', textAlign: 'right', fontFamily: 'monospace', fontSize: 13, fontWeight: 600, color: credit ? '#f87171' : 'rgba(255,255,255,0.12)' }}>
        {credit ? formatCurrency(credit) : '—'}
      </td>
    </tr>
  );
}

/* ─── Type Section Header ───────────────────────────────────────────────── */
function SectionHeader({ type, count }: { type: string; count: number }) {
  const meta = TYPE_META[type];
  return (
    <tr>
      <td colSpan={5} style={{ padding: '10px 20px', background: `linear-gradient(90deg, ${meta.bg} 0%, transparent 80%)`, borderBottom: `1px solid ${meta.color}18`, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: meta.color, opacity: 0.8 }}>{meta.icon}</div>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: meta.color, fontFamily: 'monospace' }}>{meta.label}</span>
          <span style={{ fontSize: 10, color: meta.color + '66', fontFamily: 'monospace' }}>({count})</span>
        </div>
      </td>
    </tr>
  );
}

/* ─── Totals Footer ─────────────────────────────────────────────────────── */
function TotalsRow({ totalDebit, totalCredit }: { totalDebit: number; totalCredit: number }) {
  const diff = Math.abs(totalDebit - totalCredit);
  return (
    <>
      <tr style={{ background: 'rgba(212,175,55,0.04)', borderTop: '2px solid rgba(212,175,55,0.25)' }}>
        <td colSpan={3} style={{ padding: '16px 20px', fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          Total
        </td>
        <td style={{ padding: '16px 20px', textAlign: 'right', fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 700, color: '#34d399' }}>
          {formatCurrency(totalDebit)}
        </td>
        <td style={{ padding: '16px 20px', textAlign: 'right', fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 700, color: '#f87171' }}>
          {formatCurrency(totalCredit)}
        </td>
      </tr>
    </>
  );
}

/* ─── Spinner ───────────────────────────────────────────────────────────── */
function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '80px 0' }}>
      <div style={{ width: 40, height: 40, border: '2px solid rgba(212,175,55,0.15)', borderTop: '2px solid #D4AF37', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace', fontSize: 11, letterSpacing: '0.2em' }}>LOADING BALANCES</p>
    </div>
  );
}

/* ─── Icon Button ───────────────────────────────────────────────────────── */
function IconBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
      borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
      background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)',
      fontSize: 12, fontWeight: 600, fontFamily: "'Syne', sans-serif",
      letterSpacing: '0.03em', cursor: 'pointer', transition: 'all 0.2s',
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'rgba(255,255,255,0.08)';
        el.style.color = '#fff';
        el.style.borderColor = 'rgba(255,255,255,0.2)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'rgba(255,255,255,0.04)';
        el.style.color = 'rgba(255,255,255,0.55)';
        el.style.borderColor = 'rgba(255,255,255,0.1)';
      }}
    >
      {icon}{label}
    </button>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function TrialBalancePage() {
  const { user, company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (!user) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    const data = await getAccounts(user.companyId);
    setAccounts(data.filter((a) => a.balance !== 0));
    isRefresh ? setRefreshing(false) : setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const grouped = groupBy(accounts, 'type');
  const totalDebit  = accounts.filter((a) => a.type === 'asset' || a.type === 'expense').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalCredit = accounts.filter((a) => a.type !== 'asset' && a.type !== 'expense').reduce((s, a) => s + Math.abs(a.balance), 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;
  const difference  = Math.abs(totalDebit - totalCredit);

  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Flatten rows for index-based animation
  let rowIndex = 0;

  return (
    <AuthGuard>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Syne:wght@400;500;600;700;800&display=swap');

        @keyframes spin       { to { transform: rotate(360deg); } }
        @keyframes fadeIn     { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cardIn     { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes rowIn      { from { opacity: 0; transform: translateX(-6px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes pulseIn    { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
        @keyframes headerIn   { from { opacity: 0; transform: translateY(-14px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes glowPulse  { 0%,100% { opacity: 0.4 } 50% { opacity: 0.75 } }
        @keyframes scanline   {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0b0f 0%, #0d0f1a 40%, #080a10 100%)',
        fontFamily: "'Syne', sans-serif",
        position: 'relative', overflowX: 'hidden',
      }}>
        {/* Ambient orbs */}
        <div style={{ position: 'fixed', top: -80,  right: -80,  width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(212,175,55,0.06) 0%, transparent 70%)', pointerEvents: 'none', animation: 'glowPulse 9s ease-in-out infinite' }} />
        <div style={{ position: 'fixed', bottom: -120, left: -80, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(52,211,153,0.04) 0%, transparent 70%)', pointerEvents: 'none', animation: 'glowPulse 11s ease-in-out infinite 2s' }} />
        <div style={{ position: 'fixed', top: '50%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(248,113,113,0.03) 0%, transparent 70%)', pointerEvents: 'none', animation: 'glowPulse 13s ease-in-out infinite 4s' }} />

        <div style={{ position: 'relative', zIndex: 1, padding: '40px 40px 80px' }}>

          {/* ── Header ── */}
          <div style={{ marginBottom: 36, animation: 'headerIn 0.5s ease both' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 3, height: 28, background: 'linear-gradient(to bottom, #D4AF37, transparent)', borderRadius: 2 }} />
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D4AF37', fontFamily: 'monospace' }}>
                    {company?.name ?? 'Company'} · Financial Reports
                  </p>
                </div>
                <h1 style={{ margin: 0, fontFamily: "'DM Serif Display', serif", fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
                  Trial Balance
                </h1>
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: '0.01em', fontFamily: 'monospace' }}>
                  As of {dateStr}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <IconBtn
                  icon={<RefreshCw style={{ width: 13, height: 13, animation: refreshing ? 'spin 0.6s linear infinite' : 'none' }} />}
                  label="Refresh"
                  onClick={() => load(true)}
                />
                <IconBtn icon={<Download style={{ width: 13, height: 13 }} />} label="Export" />
              </div>
            </div>
            <div style={{ marginTop: 28, height: 1, background: 'linear-gradient(90deg, rgba(212,175,55,0.3), rgba(255,255,255,0.05) 40%, transparent)' }} />
          </div>

          {loading ? (
            <Spinner />
          ) : (
            <>
              {/* ── Metric Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 32 }}>
                <MetricCard label="Total Debits"   value={formatCurrency(totalDebit)}   color="#34d399" icon={<TrendingUp style={{ width: 14, height: 14 }} />}  delay={0.05} sub={`${accounts.filter(a => a.type === 'asset' || a.type === 'expense').length} accounts`} />
                <MetricCard label="Total Credits"  value={formatCurrency(totalCredit)}  color="#f87171" icon={<Scale style={{ width: 14, height: 14 }} />}        delay={0.1}  sub={`${accounts.filter(a => a.type !== 'asset' && a.type !== 'expense').length} accounts`} />
                <MetricCard label="Total Accounts" value={String(accounts.length)}      color="#D4AF37" icon={<BarChart3 style={{ width: 14, height: 14 }} />}   delay={0.15} sub="with non-zero balance" />
                <MetricCard label="Difference"     value={formatCurrency(difference)}   color={isBalanced ? '#34d399' : '#f87171'} icon={<CheckCircle2 style={{ width: 14, height: 14 }} />} delay={0.2} sub={isBalanced ? 'Fully balanced' : 'Out of balance'} />
              </div>

              {/* ── Table ── */}
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 20, overflow: 'hidden',
                animation: 'cardIn 0.5s ease 0.25s both',
              }}>
                {/* Table header bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '18px 20px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.05) 0%, transparent 60%)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(212,175,55,0.1)', border: '1px solid rgba(212,175,55,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D4AF37' }}>
                      <BarChart3 style={{ width: 15, height: 15 }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: '#fff', fontWeight: 700 }}>Account Ledger</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>{accounts.length} entries · {dateStr}</div>
                    </div>
                  </div>
                  <BalanceIndicator isBalanced={isBalanced} difference={difference} />
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                        {[
                          { label: 'Code',         align: 'left'  },
                          { label: 'Account Name', align: 'left'  },
                          { label: 'Type',         align: 'left'  },
                          { label: 'Debit',        align: 'right' },
                          { label: 'Credit',       align: 'right' },
                        ].map(({ label, align }) => (
                          <th key={label} style={{
                            padding: '10px 20px', textAlign: align as 'left' | 'right',
                            fontSize: 10, fontWeight: 700, letterSpacing: '0.14em',
                            textTransform: 'uppercase', color: 'rgba(255,255,255,0.22)',
                            fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.05)',
                          }}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map((type) => {
                        const group = grouped[type] ?? [];
                        if (!group.length) return null;
                        return (
                          <>
                            <SectionHeader key={`hdr-${type}`} type={type} count={group.length} />
                            {group.map((acct) => {
                              const idx = rowIndex++;
                              return <AccountRow key={acct.id} acct={acct} index={idx} />;
                            })}
                          </>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <TotalsRow totalDebit={totalDebit} totalCredit={totalCredit} />
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}