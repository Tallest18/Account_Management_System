'use client';
import { useEffect, useState, useRef, useMemo } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getAccounts, getJournalEntries, getInvoices } from '@/lib/db';
import { formatCurrency, formatDate, sumBy } from '@/lib/utils';
import { Account, JournalEntry, Invoice } from '@/types';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  AlertCircle, CheckCircle, Clock, Wallet,
  ArrowUpRight, ArrowDownRight, Sparkles, Activity,
} from 'lucide-react';
import Link from 'next/link';

/* ─── constants ──────────────────────────────────────── */
const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'default'> = {
  posted: 'green', paid: 'green',
  draft: 'default', sent: 'default', partial: 'yellow',
  voided: 'red', overdue: 'red',
};
const CHART_COLORS = ['#818cf8', '#6366f1', '#a78bfa', '#4f46e5', '#7c3aed'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/* ─── helpers ────────────────────────────────────────── */
function seedFactor(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return 0.6 + (x - Math.floor(x)) * 0.5;
}
function buildChartData(revenue: number, expenses: number) {
  return MONTHS.map((month, i) => ({
    month,
    Revenue:  Math.max(0, Math.round(revenue  * seedFactor(i * 2))),
    Expenses: Math.max(0, Math.round(expenses * seedFactor(i * 2 + 1))),
  }));
}

/* ─── animated counter ───────────────────────────────── */
function AnimatedValue({ value, formatter }: { value: number; formatter: (v: number) => string }) {
  const [display, setDisplay] = useState(0);
  const rafRef  = useRef<number>(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const end = value;
    function tick(ts: number) {
      if (!startRef.current) startRef.current = ts;
      const progress = Math.min((ts - startRef.current) / 1200, 1);
      setDisplay(end * (1 - Math.pow(1 - progress, 4)));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    startRef.current = null;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [value]);

  return <>{formatter(display)}</>;
}

/* ─── sparkline ──────────────────────────────────────── */
function Sparkline({ color, positive }: { color: string; positive: boolean }) {
  const points = useMemo(() => {
    const base = [40, 55, 35, 65, 50, 70, 45, 80, 60, 90];
    return positive ? base : base.map(v => 100 - v + 20);
  }, [positive]);
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (points.length - 1)) * 100} ${100 - p}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L 100 100 L 0 100 Z`} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={path} stroke={color} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── custom tooltip ─────────────────────────────────── */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(10,10,15,0.95)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '12px 16px', backdropFilter: 'blur(20px)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      <p style={{ color: '#6b7280', fontSize: '11px', marginBottom: '8px', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{label}</p>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, display: 'inline-block', boxShadow: `0 0 8px ${p.color}` }} />
          <span style={{ color: '#9ca3af', fontSize: '11px' }}>{p.name}</span>
          <span style={{ color: '#f9fafb', fontSize: '12px', fontWeight: 600, marginLeft: 'auto', paddingLeft: '16px', fontFamily: 'monospace' }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

/* ─── KPI card ───────────────────────────────────────── */
interface KpiCardProps {
  label: string; value: number; change?: number;
  accent: string; icon: React.ReactNode;
  currency?: string; isCount?: boolean; delay?: number;
}
function KpiCard({ label, value, change, accent, icon, currency, isCount, delay = 0 }: KpiCardProps) {
  const [mounted, setMounted] = useState(false);
  const positive = (change ?? 0) >= 0;
  const fmt = isCount ? (v: number) => String(Math.round(v)) : (v: number) => formatCurrency(v, currency);

  useEffect(() => { const t = setTimeout(() => setMounted(true), delay); return () => clearTimeout(t); }, [delay]);

  return (
    <div style={{
      opacity: mounted ? 1 : 0,
      transform: mounted ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.6s cubic-bezier(0.16,1,0.3,1), transform 0.6s cubic-bezier(0.16,1,0.3,1)',
      position: 'relative', borderRadius: '20px',
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      backdropFilter: 'blur(20px)', padding: '20px', overflow: 'hidden', cursor: 'default',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(129,140,248,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.07)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
    >
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '120px', height: '120px', borderRadius: '50%', background: accent, opacity: 0.08, filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: '1px', background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60px', opacity: 0.4, pointerEvents: 'none' }}>
        <Sparkline color={accent} positive={positive} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative' }}>
        <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280' }}>{label}</span>
        <span style={{ padding: '8px', borderRadius: '10px', background: `${accent}15`, border: `1px solid ${accent}25`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '26px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.02em', marginBottom: '10px', fontFamily: 'monospace', position: 'relative' }}>
        <AnimatedValue value={value} formatter={fmt} />
      </div>
      {change !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 600, color: positive ? '#10b981' : '#ef4444', position: 'relative' }}>
          {positive ? <ArrowUpRight style={{ width: '13px', height: '13px' }} /> : <ArrowDownRight style={{ width: '13px', height: '13px' }} />}
          <span>{Math.abs(change)}%</span>
          <span style={{ color: '#4b5563', fontWeight: 400, marginLeft: '2px' }}>vs last month</span>
        </div>
      )}
    </div>
  );
}

/* ─── Section label ──────────────────────────────────── */
function SectionLabel({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Changed from amber #f59e0b to indigo #6366f1 */}
        <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#818cf8' }}>{children}</span>
        <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(99,102,241,0.4), transparent)' }} />
      </div>
      {sub && <p style={{ fontSize: '12px', color: '#4b5563', marginTop: '4px' }}>{sub}</p>}
    </div>
  );
}

/* ─── Glass card ─────────────────────────────────────── */
function GlassCard({ title, subtitle, action, children, padding = true }: {
  title?: string; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; padding?: boolean;
}) {
  return (
    <div style={{ borderRadius: '20px', border: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', backdropFilter: 'blur(20px)', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.15), transparent)', pointerEvents: 'none' }} />
      {title && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#e5e7eb', letterSpacing: '-0.01em' }}>{title}</h3>
            {subtitle && <p style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div style={padding ? { padding: '20px' } : {}}>{children}</div>
    </div>
  );
}

/* ─── Ambient orbs ───────────────────────────────────── */
function AmbientOrbs() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, overflow: 'hidden' }}>
      {/* Changed from amber/indigo/emerald to indigo/violet/purple palette */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,70,229,0.10) 0%, transparent 70%)', animation: 'orbFloat1 20s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', top: '30%', right: '-15%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)', animation: 'orbFloat2 25s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '30%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.07) 0%, transparent 70%)', animation: 'orbFloat3 18s ease-in-out infinite' }} />
    </div>
  );
}

/* ─── Metric ring ────────────────────────────────────── */
function MetricRing({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const pct = Math.min(value / max, 1);
  const r = 28, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
      <div style={{ position: 'relative', width: '72px', height: '72px' }}>
        <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="36" cy="36" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
          <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="4"
            strokeDasharray={`${circ * pct} ${circ}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}80)`, transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, color: '#f9fafb', fontFamily: 'monospace' }}>
          {Math.round(pct * 100)}%
        </div>
      </div>
      <span style={{ fontSize: '10px', color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

/* ─── useWindowWidth ─────────────────────────────────── */
function useWindowWidth() {
  const [w, setW] = useState(1200);
  useEffect(() => {
    const update = () => setW(window.innerWidth);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return w;
}

/* ─── DashboardPage ──────────────────────────────────── */
export default function DashboardPage() {
  const { user, company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries,  setEntries]  = useState<JournalEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [visible,  setVisible]  = useState(false);
  const width = useWindowWidth();

  const isMobile  = width < 640;
  const isTablet  = width >= 640 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    if (!user?.companyId) return;
    let cancelled = false;
    async function load() {
      try {
        const [accs, ents, invs] = await Promise.all([
          getAccounts(user!.companyId),
          getJournalEntries(user!.companyId),
          getInvoices(user!.companyId),
        ]);
        if (cancelled) return;
        setAccounts(accs); setEntries(ents); setInvoices(invs); setError(null);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Unknown error';
        setError(msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient') ? 'permission' : msg);
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user?.companyId]);

  useEffect(() => {
    if (!loading) { const t = setTimeout(() => setVisible(true), 60); return () => clearTimeout(t); }
  }, [loading]);

  const revenue   = useMemo(() => sumBy(accounts.filter(a => a.type === 'revenue'), 'balance'), [accounts]);
  const expenses  = useMemo(() => sumBy(accounts.filter(a => a.type === 'expense'), 'balance'), [accounts]);
  const cash      = useMemo(() => sumBy(accounts.filter(a => a.type === 'asset' && a.category === 'current_asset'), 'balance'), [accounts]);
  const ar        = useMemo(() => sumBy(accounts.filter(a => a.code === '1100'), 'balance'), [accounts]);
  const ap        = useMemo(() => sumBy(accounts.filter(a => a.code === '2000'), 'balance'), [accounts]);
  const netIncome = revenue - expenses;
  const cur       = (company as any)?.currency;
  const chartData = useMemo(() => buildChartData(revenue, expenses), [revenue, expenses]);
  const breakdown = useMemo(() => [
    { name: 'Assets',   value: sumBy(accounts.filter(a => a.type === 'asset'),  'balance') },
    { name: 'Revenue',  value: revenue },
    { name: 'Expenses', value: expenses },
    { name: 'Equity',   value: sumBy(accounts.filter(a => a.type === 'equity'), 'balance') },
  ].filter(d => d.value > 0), [accounts, revenue, expenses]);

  const recentEntries  = entries.slice(0, 5);
  const unpaidInvoices = invoices.filter(i => i.status !== 'paid' && i.status !== 'voided').slice(0, 5);
  const postedCount    = entries.filter(e => e.status === 'posted').length;
  const margin         = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  const kpiCols   = isMobile ? 'repeat(2, 1fr)' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)';
  const chartCols = isDesktop ? '2fr 1fr' : '1fr';
  const tableCols = isDesktop ? '1fr 1fr' : '1fr';
  const padding   = isMobile ? '16px 16px 40px' : isTablet ? '24px 24px 40px' : '28px 28px 48px';

  /* ── loading ── */
  if (loading) return (
    <AuthGuard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '20px' }}>
        <div style={{ position: 'relative', width: '56px', height: '56px' }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid rgba(99,102,241,0.15)' }} />
          {/* Spinner: amber → indigo */}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '2px solid transparent', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ position: 'absolute', inset: '8px', borderRadius: '50%', border: '2px solid transparent', borderTopColor: 'rgba(99,102,241,0.4)', animation: 'spin 1.4s linear infinite reverse' }} />
        </div>
        <p style={{ fontSize: '13px', color: '#4b5563', letterSpacing: '0.05em' }}>Preparing your workspace…</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </AuthGuard>
  );

  if (error === 'permission') return (
    <AuthGuard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle style={{ width: '28px', height: '28px', color: '#ef4444' }} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>Access Restricted</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '20px', lineHeight: 1.6 }}>Your account doesn&apos;t have permission to read this company&apos;s data.</p>
          {/* Retry button: amber → indigo */}
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}>Try again</button>
        </div>
      </div>
    </AuthGuard>
  );

  if (error) return (
    <AuthGuard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px' }}>
        <div style={{ maxWidth: '400px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <AlertCircle style={{ width: '28px', height: '28px', color: '#6366f1' }} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f9fafb', marginBottom: '8px' }}>Something went wrong</h2>
          <p style={{ fontSize: '12px', color: '#6b7280', fontFamily: 'monospace' }}>{error}</p>
        </div>
      </div>
    </AuthGuard>
  );

  /* ── KPI definitions — accent colours updated to indigo/violet palette ── */
  const kpi1 = [
    { label: 'Total Revenue',  value: revenue,   change: 12.4, accent: '#10b981', icon: <TrendingUp  style={{ width: '16px', height: '16px' }} />, currency: cur },
    { label: 'Total Expenses', value: expenses,  change: -3.1, accent: '#ef4444', icon: <TrendingDown style={{ width: '16px', height: '16px' }} />, currency: cur },
    { label: 'Net Income',     value: netIncome, change: 8.7,  accent: netIncome >= 0 ? '#6366f1' : '#ef4444', icon: <DollarSign style={{ width: '16px', height: '16px' }} />, currency: cur },
    // Cash balance: was amber #f59e0b → indigo #818cf8
    { label: 'Cash Balance',   value: cash,      change: 2.2,  accent: '#818cf8', icon: <Wallet style={{ width: '16px', height: '16px' }} />, currency: cur },
  ];
  const kpi2 = [
    // AR: was amber → indigo
    { label: 'Accounts Receivable', value: ar,                    accent: '#6366f1', icon: <Users        style={{ width: '16px', height: '16px' }} />, currency: cur },
    { label: 'Accounts Payable',    value: ap,                    accent: '#ef4444', icon: <AlertCircle  style={{ width: '16px', height: '16px' }} />, currency: cur },
    { label: 'Posted Entries',      value: postedCount,           accent: '#10b981', icon: <CheckCircle  style={{ width: '16px', height: '16px' }} />, isCount: true },
    // Open invoices: was violet (already close) — keeping #8b5cf6 as is (violet, part of indigo family)
    { label: 'Open Invoices',       value: unpaidInvoices.length, accent: '#a78bfa', icon: <Clock        style={{ width: '16px', height: '16px' }} />, isCount: true },
  ];

  return (
    <AuthGuard>
      <AmbientOrbs />

      <style>{`
        @keyframes orbFloat1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(40px,-30px) scale(1.05)} 66%{transform:translate(-20px,20px) scale(0.97)} }
        @keyframes orbFloat2 { 0%,100%{transform:translate(0,0) scale(1)} 40%{transform:translate(-50px,30px) scale(1.08)} 70%{transform:translate(30px,-20px) scale(0.95)} }
        @keyframes orbFloat3 { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-40px) scale(1.1)} }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{
        padding, position: 'relative', zIndex: 1,
        opacity: visible ? 1 : 0, transition: 'opacity 0.8s ease',
        maxWidth: '1600px',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: isMobile ? 'flex-start' : 'center',
          justifyContent: 'space-between', marginBottom: isMobile ? '24px' : '36px',
          flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : '0',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(-12px)',
          transition: 'opacity 0.7s ease, transform 0.7s ease',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              {/* Header icon: amber gradient → indigo/violet gradient matching login page */}
              <div style={{ width: '32px', height: '32px', borderRadius: '10px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.4)' }}>
                <Sparkles style={{ width: '16px', height: '16px', color: '#fff' }} />
              </div>
              <h1 style={{ fontSize: isMobile ? '18px' : '22px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.03em' }}>
                {user?.displayName?.split(' ')[0]}&apos;s Dashboard
              </h1>
            </div>
            <p style={{ fontSize: '12px', color: '#4b5563', letterSpacing: '0.03em' }}>
              <span style={{ color: '#6b7280' }}>{(company as any)?.name}</span>
              <span style={{ margin: '0 8px', color: '#374151' }}>·</span>
              {formatDate(new Date().toISOString(), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>

          {/* Health rings */}
          {!isMobile && (
            <div style={{
              display: 'flex', gap: isTablet ? '16px' : '24px', alignItems: 'center',
              padding: '16px 20px', borderRadius: '16px',
              border: '1px solid rgba(99,102,241,0.12)', background: 'rgba(99,102,241,0.04)',
            }}>
              {/* Ring colours: emerald, indigo, indigo-light */}
              <MetricRing value={revenue}               max={Math.max(revenue, 1)}           color="#10b981" label="Revenue"   />
              <MetricRing value={postedCount}           max={Math.max(entries.length, 1)}    color="#6366f1" label="Posted"    />
              <MetricRing value={unpaidInvoices.length} max={Math.max(invoices.length, 1)}   color="#818cf8" label="Open inv." />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? '20px' : '28px' }}>

          {/* ── KPI row 1 ── */}
          <div>
            <SectionLabel sub="Core financial performance metrics">Performance</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: isMobile ? '10px' : '14px' }}>
              {kpi1.map((card, i) => <KpiCard key={card.label} {...card} delay={i * 80} />)}
            </div>
          </div>

          {/* ── KPI row 2 ── */}
          <div>
            <SectionLabel sub="Day-to-day operational tracking">Operational</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: kpiCols, gap: isMobile ? '10px' : '14px' }}>
              {kpi2.map((card, i) => <KpiCard key={card.label} {...card} delay={(i + 4) * 80} />)}
            </div>
          </div>

          {/* ── Charts ── */}
          <div style={{ display: 'grid', gridTemplateColumns: chartCols, gap: '14px' }}>
            <GlassCard
              title="Revenue vs Expenses"
              subtitle="6-month trend"
              action={<div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4b5563' }}><Activity style={{ width: '12px', height: '12px' }} />Live</div>}
            >
              <div style={{ height: isMobile ? '160px' : '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: isMobile ? -20 : -10 }}>
                    <defs>
                      <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: '#374151', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#374151', fontSize: isMobile ? 9 : 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} width={isMobile ? 32 : 48} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="Revenue"  stroke="#10b981" fill="url(#rev)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fill="url(#exp)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: '20px', marginTop: '12px' }}>
                {[['Revenue', '#10b981'], ['Expenses', '#ef4444']].map(([name, color]) => (
                  <span key={name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#4b5563' }}>
                    <span style={{ width: '20px', height: '2px', borderRadius: '2px', background: color, display: 'inline-block' }} />
                    {name}
                  </span>
                ))}
              </div>
            </GlassCard>

            <GlassCard title="Account Breakdown" subtitle="Balance distribution">
              <div style={{ height: isMobile ? '180px' : '200px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={breakdown} cx="50%" cy="42%" innerRadius={isMobile ? 40 : 52} outerRadius={isMobile ? 60 : 76} dataKey="value" nameKey="name" paddingAngle={4} stroke="none">
                      {breakdown.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} style={{ filter: `drop-shadow(0 0 8px ${CHART_COLORS[i % CHART_COLORS.length]}60)` }} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value ?? 0)), ''] as [string, string]}
                      contentStyle={{ background: 'rgba(10,10,15,0.95)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '10px', fontSize: '12px' }} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: '11px', color: '#4b5563' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Net margin badge: amber → indigo */}
              <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: '12px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>Net margin</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: margin >= 0 ? '#10b981' : '#ef4444', fontFamily: 'monospace' }}>{margin.toFixed(1)}%</span>
              </div>
            </GlassCard>
          </div>

          {/* ── Tables ── */}
          <div style={{ display: 'grid', gridTemplateColumns: tableCols, gap: '14px' }}>

            {/* Recent Journal Entries */}
            <GlassCard
              title="Recent Journal Entries"
              action={<Link href="/journal" style={{ fontSize: '11px', color: '#818cf8', textDecoration: 'none', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.07)' }}>View all →</Link>}
              padding={false}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {(isMobile ? ['Entry', 'Amount', 'Status'] : ['Entry #', 'Date', 'Description', 'Amount', 'Status']).map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.length === 0 ? (
                      <tr><td colSpan={isMobile ? 3 : 5} style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
                          <CheckCircle style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>No entries yet</span>
                        </div>
                      </td></tr>
                    ) : recentEntries.map((e, idx) => (
                      <tr key={e.id} style={{ borderBottom: idx < recentEntries.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={el => (el.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                        onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}
                      >
                        {/* Entry number: amber → indigo */}
                        <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: '#818cf8', fontSize: '11px' }}>{e.entryNumber}</td>
                        {!isMobile && <td style={{ padding: '11px 16px', color: '#4b5563', fontSize: '11px', whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>}
                        {!isMobile && <td style={{ padding: '11px 16px', color: '#9ca3af', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.description}</td>}
                        <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: '#e5e7eb', fontSize: '12px', fontWeight: 600 }}>{formatCurrency(e.totalDebit)}</td>
                        <td style={{ padding: '11px 16px' }}><Badge variant={statusColor[e.status] ?? 'default'}>{e.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Open Invoices */}
            <GlassCard
              title="Open Invoices"
              action={<Link href="/invoices/sales" style={{ fontSize: '11px', color: '#818cf8', textDecoration: 'none', padding: '4px 10px', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)', background: 'rgba(99,102,241,0.07)' }}>View all →</Link>}
              padding={false}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr>
                      {(isMobile ? ['Invoice', 'Balance', 'Status'] : ['Invoice', 'Contact', 'Due', 'Balance', 'Status']).map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#374151', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {unpaidInvoices.length === 0 ? (
                      <tr><td colSpan={isMobile ? 3 : 5} style={{ padding: '40px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
                          <Clock style={{ width: '24px', height: '24px', color: '#6b7280' }} />
                          <span style={{ color: '#6b7280', fontSize: '12px' }}>No open invoices</span>
                        </div>
                      </td></tr>
                    ) : unpaidInvoices.map((inv, idx) => (
                      <tr key={inv.id} style={{ borderBottom: idx < unpaidInvoices.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none', transition: 'background 0.15s' }}
                        onMouseEnter={el => (el.currentTarget.style.background = 'rgba(99,102,241,0.04)')}
                        onMouseLeave={el => (el.currentTarget.style.background = 'transparent')}
                      >
                        {/* Invoice number: amber → indigo */}
                        <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: '#818cf8', fontSize: '11px' }}>{inv.invoiceNumber}</td>
                        {!isMobile && <td style={{ padding: '11px 16px', color: '#9ca3af', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.contactName}</td>}
                        {!isMobile && <td style={{ padding: '11px 16px', color: '#4b5563', fontSize: '11px', whiteSpace: 'nowrap' }}>{formatDate(inv.dueDate)}</td>}
                        <td style={{ padding: '11px 16px', fontFamily: 'monospace', color: '#e5e7eb', fontSize: '12px', fontWeight: 600 }}>{formatCurrency(inv.balance)}</td>
                        <td style={{ padding: '11px 16px' }}><Badge variant={statusColor[inv.status] ?? 'default'}>{inv.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}