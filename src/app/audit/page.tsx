'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { useAuth } from '@/context/AuthContext';
import { getAuditLogs } from '@/lib/audit';
import { AuditLog } from '@/types';
import { formatDateTime } from '@/lib/utils';
import {
  Shield,
  RefreshCw,
  Eye,
  AlertTriangle,
  Info,
  X,
  Activity,
  LogIn,
  ChevronRight,
  Fingerprint,
  Clock,
  Monitor,
  Globe,
  Tag,
  Layers,
  Zap,
} from 'lucide-react';

/* ─── tiny design tokens ─────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Syne:wght@400;600;700;800&display=swap');

  .audit-root {
    --red:      #FF4444;
    --red-dim:  rgba(255,68,68,.12);
    --amber:    #F59E0B;
    --amber-dim:rgba(245,158,11,.12);
    --blue:     #60A5FA;
    --blue-dim: rgba(96,165,250,.10);
    --green:    #34D399;
    --green-dim:rgba(52,211,153,.10);
    --purple:   #A78BFA;
    --surface:  #0D0F14;
    --surface2: #12151C;
    --surface3: #181C25;
    --surface4: #1E2330;
    --border:   rgba(255,255,255,.06);
    --border2:  rgba(255,255,255,.10);
    --text:     #E8EAF0;
    --text2:    #9BA3B8;
    --text3:    #545D72;
    font-family: 'Syne', sans-serif;
    background: var(--surface);
    color: var(--text);
    min-height: 100vh;
    padding: 0;
  }

  /* ── header ── */
  .audit-header {
    padding: 28px 32px 0;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
  }
  .audit-title-block { display: flex; align-items: center; gap: 14px; }
  .audit-icon-wrap {
    width: 46px; height: 46px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(96,165,250,.2), rgba(167,139,250,.15));
    border: 1px solid rgba(96,165,250,.25);
    display: flex; align-items: center; justify-content: center;
    position: relative;
  }
  .audit-icon-wrap::after {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: 15px;
    background: linear-gradient(135deg, rgba(96,165,250,.4), transparent 60%);
    z-index: -1;
  }
  .audit-title { font-size: 22px; font-weight: 800; letter-spacing: -.4px; margin: 0; }
  .audit-subtitle { font-size: 13px; color: var(--text3); margin: 3px 0 0; letter-spacing: .2px; }

  /* ── controls ── */
  .audit-controls { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  .ctrl-select {
    background: var(--surface3);
    border: 1px solid var(--border2);
    color: var(--text);
    border-radius: 10px;
    padding: 8px 12px;
    font-size: 12px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    transition: border-color .2s, background .2s;
    appearance: none;
    -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239BA3B8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    padding-right: 30px;
    min-width: 130px;
  }
  .ctrl-select:hover { border-color: var(--border2); background-color: var(--surface4); }
  .ctrl-select option { background: #12151C; }

  .ctrl-btn {
    display: flex; align-items: center; gap: 6px;
    background: var(--surface3);
    border: 1px solid var(--border2);
    color: var(--text2);
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 12px;
    font-family: 'Syne', sans-serif;
    font-weight: 600;
    cursor: pointer;
    transition: all .2s;
    white-space: nowrap;
  }
  .ctrl-btn:hover { background: var(--surface4); color: var(--text); border-color: var(--border2); }
  .ctrl-btn.spinning svg { animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── stats row ── */
  .stat-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    padding: 24px 32px 0;
  }
  .stat-card {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 18px 20px;
    position: relative;
    overflow: hidden;
    transition: border-color .25s, transform .2s;
    animation: fadeSlideUp .4s ease both;
  }
  .stat-card:hover { border-color: var(--border2); transform: translateY(-1px); }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-color, rgba(255,255,255,.08)), transparent);
  }
  .stat-card-icon {
    width: 28px; height: 28px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 12px;
    background: var(--accent-bg, var(--surface3));
    color: var(--accent-color, var(--text3));
  }
  .stat-label { font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 6px; }
  .stat-value { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 600; line-height: 1; }

  @keyframes fadeSlideUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── table container ── */
  .table-wrap {
    margin: 20px 32px 32px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 20px;
    overflow: hidden;
    animation: fadeSlideUp .5s ease .1s both;
  }

  /* ── table ── */
  .audit-table { width: 100%; border-collapse: collapse; }
  .audit-table thead tr {
    background: var(--surface3);
    border-bottom: 1px solid var(--border);
  }
  .audit-table thead th {
    padding: 12px 16px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--text3);
    text-align: left;
    white-space: nowrap;
  }
  .audit-table tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background .15s;
    animation: rowIn .35s ease both;
  }
  .audit-table tbody tr:last-child { border-bottom: none; }
  .audit-table tbody tr:hover { background: rgba(255,255,255,.025); }
  @keyframes rowIn {
    from { opacity: 0; transform: translateX(-6px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  .audit-table td {
    padding: 13px 16px;
    vertical-align: middle;
  }

  /* ── timestamp ── */
  .ts-mono {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--text3);
    white-space: nowrap;
    line-height: 1.6;
  }
  .ts-date { display: block; color: var(--text2); font-size: 10.5px; }
  .ts-time { display: block; font-size: 12px; color: var(--text); }

  /* ── user cell ── */
  .user-cell { display: flex; align-items: center; gap: 10px; }
  .user-avatar {
    width: 30px; height: 30px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--surface4), var(--surface3));
    border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    font-size: 11px;
    font-weight: 700;
    color: var(--text2);
    flex-shrink: 0;
    letter-spacing: -.5px;
  }
  .user-name { font-size: 12px; font-weight: 600; color: var(--text); }
  .user-email { font-size: 10.5px; color: var(--text3); margin-top: 1px; }

  /* ── module badge ── */
  .module-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px;
    border-radius: 6px;
    font-size: 10.5px;
    font-weight: 700;
    background: var(--surface4);
    color: var(--text2);
    border: 1px solid var(--border);
    letter-spacing: .3px;
  }

  /* ── action badge ── */
  .action-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px;
    border-radius: 7px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: .5px;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .action-badge.green  { background: var(--green-dim);  color: var(--green);  border-color: rgba(52,211,153,.2); }
  .action-badge.red    { background: var(--red-dim);    color: var(--red);    border-color: rgba(255,68,68,.2); }
  .action-badge.blue   { background: var(--blue-dim);   color: var(--blue);   border-color: rgba(96,165,250,.2); }
  .action-badge.amber  { background: var(--amber-dim);  color: var(--amber);  border-color: rgba(245,158,11,.2); }
  .action-badge.default{ background: var(--surface4);   color: var(--text2);  border-color: var(--border); }

  /* ── severity pill ── */
  .sev-pill {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .8px;
    border: 1px solid transparent;
  }
  .sev-dot {
    width: 5px; height: 5px; border-radius: 50%;
    animation: pulse-dot 2s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; } 50% { opacity: .4; }
  }
  .sev-pill.info     { background: var(--blue-dim);  color: var(--blue);  border-color: rgba(96,165,250,.18); }
  .sev-pill.info .sev-dot    { background: var(--blue); }
  .sev-pill.warning  { background: var(--amber-dim); color: var(--amber); border-color: rgba(245,158,11,.18); }
  .sev-pill.warning .sev-dot { background: var(--amber); animation-duration: 1.2s; }
  .sev-pill.critical { background: var(--red-dim);   color: var(--red);   border-color: rgba(255,68,68,.18); }
  .sev-pill.critical .sev-dot{ background: var(--red); animation-duration: .7s; }

  /* ── description ── */
  .desc-text { font-size: 12px; color: var(--text2); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  /* ── ip cell ── */
  .ip-mono { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text3); }

  /* ── eye btn ── */
  .eye-btn {
    width: 30px; height: 30px;
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    color: var(--text3);
    cursor: pointer;
    transition: all .2s;
  }
  .eye-btn:hover { background: var(--surface4); border-color: var(--border2); color: var(--blue); }

  /* ── empty ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 80px 32px;
    color: var(--text3);
    gap: 14px;
  }
  .empty-icon {
    width: 56px; height: 56px; border-radius: 16px;
    background: var(--surface3); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-title { font-size: 15px; font-weight: 700; color: var(--text2); margin: 0; }
  .empty-sub { font-size: 13px; color: var(--text3); margin: 0; }

  /* ── spinner ── */
  .spinner-wrap {
    display: flex; align-items: center; justify-content: center;
    padding: 80px;
  }
  .spinner {
    width: 32px; height: 32px;
    border: 2px solid var(--border2);
    border-top-color: var(--blue);
    border-radius: 50%;
    animation: spin .8s linear infinite;
  }

  /* ── modal overlay ── */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(0,0,0,.75);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: fadeIn .2s ease;
  }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

  .modal-box {
    background: var(--surface2);
    border: 1px solid var(--border2);
    border-radius: 24px;
    width: 100%; max-width: 640px;
    max-height: 80vh;
    overflow-y: auto;
    animation: modalIn .25s ease;
    position: relative;
  }
  @keyframes modalIn {
    from { opacity: 0; transform: scale(.96) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    padding: 22px 24px 18px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0;
    background: var(--surface2);
    border-radius: 24px 24px 0 0;
    z-index: 1;
  }
  .modal-title-row { display: flex; align-items: center; gap: 10px; }
  .modal-icon {
    width: 32px; height: 32px; border-radius: 9px;
    background: var(--blue-dim);
    border: 1px solid rgba(96,165,250,.2);
    display: flex; align-items: center; justify-content: center;
    color: var(--blue);
  }
  .modal-title { font-size: 15px; font-weight: 700; margin: 0; }
  .modal-close {
    width: 30px; height: 30px; border-radius: 8px;
    background: transparent; border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--text3); cursor: pointer;
    transition: all .2s;
  }
  .modal-close:hover { background: var(--surface4); color: var(--text); border-color: var(--border2); }

  .modal-body { padding: 22px 24px; display: flex; flex-direction: column; gap: 20px; }

  .modal-meta-grid {
    display: grid; grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .meta-item {
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .meta-item.full { grid-column: 1 / -1; }
  .meta-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .8px; color: var(--text3); margin-bottom: 6px;
    display: flex; align-items: center; gap: 5px;
  }
  .meta-value { font-size: 13px; color: var(--text); font-weight: 500; }
  .meta-value.mono { font-family: 'JetBrains Mono', monospace; font-size: 12px; }

  /* ── changes table ── */
  .changes-section { display: flex; flex-direction: column; gap: 10px; }
  .changes-title {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: .8px; color: var(--text3);
    display: flex; align-items: center; gap: 6px;
  }
  .changes-table-wrap {
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
  }
  .changes-table { width: 100%; border-collapse: collapse; }
  .changes-table thead tr { background: var(--surface3); border-bottom: 1px solid var(--border); }
  .changes-table thead th {
    padding: 9px 14px; font-size: 10px; font-weight: 700;
    text-transform: uppercase; letter-spacing: .8px;
    text-align: left;
  }
  .changes-table thead th:nth-child(2) { color: var(--red); }
  .changes-table thead th:nth-child(3) { color: var(--green); }
  .changes-table thead th:nth-child(1) { color: var(--text3); }
  .changes-table tbody tr { border-top: 1px solid var(--border); }
  .changes-table td {
    padding: 9px 14px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    max-width: 160px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .changes-table td:nth-child(1) { color: var(--purple); }
  .changes-table td:nth-child(2) { color: var(--red); }
  .changes-table td:nth-child(3) { color: var(--green); }

  /* ── ua block ── */
  .ua-block {
    background: var(--surface3);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px 14px;
  }
  .ua-text {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10.5px; color: var(--text2);
    word-break: break-all; line-height: 1.6;
  }

  /* ── line highlight hack ── */
  .audit-table tbody tr:nth-child(1) { animation-delay: 0ms; }
  .audit-table tbody tr:nth-child(2) { animation-delay: 30ms; }
  .audit-table tbody tr:nth-child(3) { animation-delay: 60ms; }
  .audit-table tbody tr:nth-child(4) { animation-delay: 90ms; }
  .audit-table tbody tr:nth-child(5) { animation-delay: 120ms; }
  .audit-table tbody tr:nth-child(6) { animation-delay: 150ms; }
  .audit-table tbody tr:nth-child(7) { animation-delay: 180ms; }
  .audit-table tbody tr:nth-child(8) { animation-delay: 210ms; }
  .audit-table tbody tr:nth-child(9) { animation-delay: 240ms; }
  .audit-table tbody tr:nth-child(10){ animation-delay: 270ms; }

  /* ── scrollbar ── */
  .modal-box::-webkit-scrollbar { width: 5px; }
  .modal-box::-webkit-scrollbar-track { background: transparent; }
  .modal-box::-webkit-scrollbar-thumb { background: var(--surface4); border-radius: 4px; }

  /* ── stat card delays ── */
  .stat-card:nth-child(1) { animation-delay: 0ms; }
  .stat-card:nth-child(2) { animation-delay: 60ms; }
  .stat-card:nth-child(3) { animation-delay: 120ms; }
  .stat-card:nth-child(4) { animation-delay: 180ms; }

  /* ── glow line at top of page ── */
  .glow-bar {
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, var(--blue) 30%, var(--purple) 70%, transparent 100%);
    opacity: .4;
    margin-bottom: 0;
  }
`;

/* ─── helpers ─────────────────────────────────────────────── */
function getActionVariant(action: string): string {
  if (['login', 'create'].includes(action)) return 'green';
  if (['void', 'delete', 'login_failed'].includes(action)) return 'red';
  if (action === 'post') return 'blue';
  if (['update', 'settings_change', 'password_change'].includes(action)) return 'amber';
  return 'default';
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

function formatDateSplit(ts: string) {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return { date, time };
}

const MODULES = ['', 'Auth', 'Journal', 'Accounts', 'Invoices', 'Payments', 'Contacts', 'Users', 'Settings'];
const ACTIONS = ['', 'login', 'logout', 'create', 'update', 'delete', 'post', 'void', 'export', 'settings_change', 'password_change', 'login_failed'];

/* ─── main component ──────────────────────────────────────── */
export default function AuditPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewLog, setViewLog] = useState<AuditLog | null>(null);
  const [filter, setFilter] = useState({ module: '', action: '' });

  const load = useCallback(async (showSpinner = false) => {
    if (!user) return;
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    const { logs: data } = await getAuditLogs(user.companyId, {
      module: filter.module || undefined,
      action: filter.action || undefined,
    });
    setLogs(data);
    setLoading(false);
    setRefreshing(false);
  }, [user, filter]);

  useEffect(() => { load(true); }, [load]);

  /* close modal on ESC */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') setViewLog(null); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const stats = [
    {
      label: 'Total Events',
      value: logs.length,
      color: 'var(--blue)',
      icon: <Activity size={14} />,
      accentBg: 'rgba(96,165,250,.12)',
      accentColor: 'rgba(96,165,250,.8)',
      topLine: 'rgba(96,165,250,.2)',
    },
    {
      label: 'Login Events',
      value: logs.filter((l) => l.action === 'login').length,
      color: 'var(--green)',
      icon: <LogIn size={14} />,
      accentBg: 'rgba(52,211,153,.12)',
      accentColor: 'rgba(52,211,153,.8)',
      topLine: 'rgba(52,211,153,.2)',
    },
    {
      label: 'Warnings',
      value: logs.filter((l) => l.severity === 'warning').length,
      color: 'var(--amber)',
      icon: <AlertTriangle size={14} />,
      accentBg: 'rgba(245,158,11,.12)',
      accentColor: 'rgba(245,158,11,.8)',
      topLine: 'rgba(245,158,11,.2)',
    },
    {
      label: 'Critical',
      value: logs.filter((l) => l.severity === 'critical').length,
      color: 'var(--red)',
      icon: <AlertTriangle size={14} />,
      accentBg: 'rgba(255,68,68,.12)',
      accentColor: 'rgba(255,68,68,.8)',
      topLine: 'rgba(255,68,68,.2)',
    },
  ];

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="audit-root">
        {/* glow bar */}
        <div className="glow-bar" />

        {/* Header */}
        <div className="audit-header">
          <div className="audit-title-block">
            <div className="audit-icon-wrap">
              <Shield size={20} color="rgba(96,165,250,.9)" />
            </div>
            <div>
              <h1 className="audit-title">Audit Log</h1>
              <p className="audit-subtitle">Complete security &amp; activity trail — every action is recorded</p>
            </div>
          </div>

          <div className="audit-controls">
            <select
              className="ctrl-select"
              value={filter.module}
              onChange={(e) => setFilter((f) => ({ ...f, module: e.target.value }))}
            >
              {MODULES.map((m) => <option key={m} value={m}>{m || 'All Modules'}</option>)}
            </select>
            <select
              className="ctrl-select"
              value={filter.action}
              onChange={(e) => setFilter((f) => ({ ...f, action: e.target.value }))}
            >
              {ACTIONS.map((a) => <option key={a} value={a}>{a || 'All Actions'}</option>)}
            </select>
            <button
              className={`ctrl-btn${refreshing ? ' spinning' : ''}`}
              onClick={() => load(false)}
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stat-grid">
          {stats.map((s) => (
            <div
              key={s.label}
              className="stat-card"
              style={{ '--accent-bg': s.accentBg, '--accent-color': s.accentColor } as React.CSSProperties}
            >
              <div
                className="stat-card-icon"
                style={{ background: s.accentBg, color: s.accentColor }}
              >
                {s.icon}
              </div>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="table-wrap">
          {loading ? (
            <div className="spinner-wrap"><div className="spinner" /></div>
          ) : logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Shield size={22} color="var(--text3)" /></div>
              <p className="empty-title">No audit logs found</p>
              <p className="empty-sub">Activity will appear here as users interact with the system.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="audit-table">
                <thead>
                  <tr>
                    <th><span style={{ display:'flex', alignItems:'center', gap:5 }}><Clock size={11}/> Timestamp</span></th>
                    <th><span style={{ display:'flex', alignItems:'center', gap:5 }}><Fingerprint size={11}/> User</span></th>
                    <th><span style={{ display:'flex', alignItems:'center', gap:5 }}><Layers size={11}/> Module</span></th>
                    <th><span style={{ display:'flex', alignItems:'center', gap:5 }}><Zap size={11}/> Action</span></th>
                    <th>Description</th>
                    <th><span style={{ display:'flex', alignItems:'center', gap:5 }}><Globe size={11}/> IP Address</span></th>
                    <th><span style={{ display:'flex', alignItems:'center', gap:5 }}><Activity size={11}/> Severity</span></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const { date, time } = formatDateSplit(log.timestamp);
                    return (
                      <tr key={log.id}>
                        {/* timestamp */}
                        <td>
                          <div className="ts-mono">
                            <span className="ts-date">{date}</span>
                            <span className="ts-time">{time}</span>
                          </div>
                        </td>

                        {/* user */}
                        <td>
                          <div className="user-cell">
                            <div className="user-avatar">{initials(log.userName)}</div>
                            <div>
                              <div className="user-name">{log.userName}</div>
                              <div className="user-email">{log.userEmail}</div>
                            </div>
                          </div>
                        </td>

                        {/* module */}
                        <td>
                          <span className="module-badge">
                            <Tag size={9} />
                            {log.module}
                          </span>
                        </td>

                        {/* action */}
                        <td>
                          <span className={`action-badge ${getActionVariant(log.action)}`}>
                            {log.action.replace('_', ' ')}
                          </span>
                        </td>

                        {/* description */}
                        <td>
                          <p className="desc-text" title={log.description}>{log.description}</p>
                        </td>

                        {/* ip */}
                        <td>
                          <span className="ip-mono">{log.ipAddress ?? '—'}</span>
                        </td>

                        {/* severity */}
                        <td>
                          <span className={`sev-pill ${log.severity}`}>
                            <span className="sev-dot" />
                            {log.severity}
                          </span>
                        </td>

                        {/* details */}
                        <td>
                          {(log.changes?.length ?? 0) > 0 && (
                            <button className="eye-btn" onClick={() => setViewLog(log)} title="View changes">
                              <Eye size={13} />
                            </button>
                          )}
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

      {/* ── Modal ─────────────────────────────────── */}
      {viewLog && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewLog(null); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title-row">
                <div className="modal-icon"><Eye size={15} /></div>
                <h2 className="modal-title">Change Details</h2>
              </div>
              <button className="modal-close" onClick={() => setViewLog(null)}>
                <X size={13} />
              </button>
            </div>

            <div className="modal-body">
              {/* meta grid */}
              <div className="modal-meta-grid">
                <div className="meta-item">
                  <div className="meta-label"><Clock size={10} /> Timestamp</div>
                  <div className="meta-value mono">{formatDateTime(viewLog.timestamp)}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label"><Fingerprint size={10} /> User</div>
                  <div className="meta-value">{viewLog.userName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{viewLog.userEmail}</div>
                </div>
                <div className="meta-item">
                  <div className="meta-label"><Zap size={10} /> Action</div>
                  <span className={`action-badge ${getActionVariant(viewLog.action)}`} style={{ marginTop: 4, display:'inline-flex' }}>
                    {viewLog.action}
                  </span>
                </div>
                <div className="meta-item">
                  <div className="meta-label"><Tag size={10} /> Entity</div>
                  <div className="meta-value mono">{viewLog.entityType}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>{viewLog.entityId}</div>
                </div>
                <div className="meta-item full">
                  <div className="meta-label"><ChevronRight size={10} /> Description</div>
                  <div className="meta-value">{viewLog.description}</div>
                </div>
              </div>

              {/* changes table */}
              {viewLog.changes && viewLog.changes.length > 0 && (
                <div className="changes-section">
                  <div className="changes-title">
                    <Activity size={10} />
                    Field Changes ({viewLog.changes.length})
                  </div>
                  <div className="changes-table-wrap">
                    <table className="changes-table">
                      <thead>
                        <tr>
                          <th>Field</th>
                          <th>Old Value</th>
                          <th>New Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewLog.changes.map((change, i) => (
                          <tr key={i}>
                            <td>{change.field}</td>
                            <td title={JSON.stringify(change.oldValue)}>
                              {change.oldValue === null || change.oldValue === undefined
                                ? '—'
                                : JSON.stringify(change.oldValue)}
                            </td>
                            <td title={JSON.stringify(change.newValue)}>
                              {change.newValue === null || change.newValue === undefined
                                ? '—'
                                : JSON.stringify(change.newValue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* user agent */}
              {viewLog.userAgent && (
                <div className="ua-block">
                  <div className="meta-label" style={{ marginBottom: 8 }}>
                    <Monitor size={10} /> User Agent
                  </div>
                  <p className="ua-text">{viewLog.userAgent}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AuthGuard>
  );
}