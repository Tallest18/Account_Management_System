'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getAccounts, getTransactionsByAccount, Transaction } from '@/lib/db';
import { Account } from '@/types';
import { formatDate } from '@/lib/utils';
import { BookOpen, Search, ChevronRight } from 'lucide-react';

/* ─── CSS ──────────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&family=Lato:wght@300;400;700&display=swap');

  .lg-root {
    --bg: #f5f2eb;
    --bg-2: #ede9e0;
    --bg-3: #e4dfd4;
    --ink: #1a1710;
    --ink-2: #4a4740;
    --ink-3: #8a8680;
    --ink-4: #b8b4ae;
    --rule: #d4cfc6;
    --accent: #1a3a5c;
    --accent-2: #2d5986;
    --accent-light: rgba(26,58,92,0.08);
    --green: #1a5c3a;
    --green-bg: rgba(26,92,58,0.07);
    --red: #7a1f1f;
    --red-bg: rgba(122,31,31,0.07);
    --gold: #8a6f2e;
    --sidebar-w: 280px;
    --radius: 4px;
    min-height: 100vh;
    background: var(--bg);
    color: var(--ink);
    font-family: 'Lato', sans-serif;
    display: flex;
    flex-direction: column;
  }

  .lg-topbar {
    background: var(--ink);
    color: var(--bg);
    padding: 0 32px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-shrink: 0;
    position: relative;
    z-index: 10;
  }
  .lg-topbar-left {
    display: flex; align-items: center; gap: 12px;
  }
  .lg-topbar-icon {
    width: 28px; height: 28px;
    border: 1px solid rgba(245,242,235,0.2);
    border-radius: 4px;
    display: flex; align-items: center; justify-content: center;
    color: var(--bg);
  }
  .lg-topbar-title {
    font-family: 'Playfair Display', serif;
    font-size: 17px; font-weight: 400;
    letter-spacing: 0.02em;
    color: var(--bg);
  }
  .lg-topbar-subtitle {
    font-size: 11px;
    color: rgba(245,242,235,0.4);
    font-family: 'IBM Plex Mono', monospace;
    letter-spacing: 0.08em;
  }
  .lg-topbar-rule {
    width: 1px; height: 20px;
    background: rgba(245,242,235,0.15);
    margin: 0 4px;
  }

  .lg-layout {
    display: flex;
    flex: 1;
    overflow: hidden;
    height: calc(100vh - 52px);
  }

  .lg-sidebar {
    width: var(--sidebar-w);
    flex-shrink: 0;
    background: var(--bg-2);
    border-right: 1px solid var(--rule);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .lg-sidebar-head {
    padding: 16px 18px 12px;
    border-bottom: 1px solid var(--rule);
  }
  .lg-sidebar-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: var(--ink-3); margin-bottom: 10px;
  }
  .lg-search {
    display: flex; align-items: center; gap: 8px;
    background: var(--bg);
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    padding: 7px 10px;
    color: var(--ink-3);
  }
  .lg-search input {
    border: none; background: transparent; outline: none;
    font-family: 'Lato', sans-serif; font-size: 12px; color: var(--ink);
    width: 100%;
  }
  .lg-search input::placeholder { color: var(--ink-4); }

  .lg-accounts-list {
    flex: 1; overflow-y: auto; padding: 8px 0;
  }
  .lg-accounts-list::-webkit-scrollbar { width: 3px; }
  .lg-accounts-list::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 2px; }

  .lg-group-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--ink-4); padding: 10px 18px 4px;
    display: flex; align-items: center; gap: 8px;
  }
  .lg-group-label::after {
    content: ''; flex: 1; height: 1px; background: var(--rule);
  }

  .lg-account-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 18px; cursor: pointer;
    transition: background 0.12s ease;
    border-left: 2px solid transparent;
  }
  .lg-account-item:hover { background: var(--bg-3); }
  .lg-account-item.active {
    background: var(--accent-light);
    border-left-color: var(--accent);
  }
  .lg-account-code {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--ink-4);
    min-width: 32px;
  }
  .lg-account-item.active .lg-account-code { color: var(--accent); }
  .lg-account-name {
    font-size: 12px; color: var(--ink-2); flex: 1;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .lg-account-item.active .lg-account-name { color: var(--ink); font-weight: 700; }
  .lg-account-chevron { color: var(--ink-4); opacity: 0; transition: opacity 0.12s; }
  .lg-account-item.active .lg-account-chevron { opacity: 1; color: var(--accent); }

  .lg-main {
    flex: 1; overflow-y: auto; display: flex; flex-direction: column;
  }
  .lg-main::-webkit-scrollbar { width: 4px; }
  .lg-main::-webkit-scrollbar-thumb { background: var(--rule); border-radius: 2px; }

  .lg-empty {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    gap: 0; padding: 60px 40px; text-align: center;
  }
  .lg-empty-grid {
    position: relative; width: 280px; height: 200px;
    margin-bottom: 36px; overflow: hidden;
  }
  .lg-empty-grid svg { position: absolute; inset: 0; }
  .lg-empty-icon-wrap {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    width: 56px; height: 56px; border-radius: 50%;
    background: var(--bg-2); border: 2px solid var(--rule);
    display: flex; align-items: center; justify-content: center;
    color: var(--ink-3);
    box-shadow: 0 4px 20px rgba(26,23,16,0.1);
  }
  .lg-empty-title {
    font-family: 'Playfair Display', serif;
    font-size: 24px; color: var(--ink); margin-bottom: 10px;
  }
  .lg-empty-desc { font-size: 13px; color: var(--ink-3); line-height: 1.6; max-width: 280px; }
  .lg-empty-hint {
    margin-top: 24px;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: 0.1em;
    color: var(--ink-4); text-transform: uppercase;
    display: flex; align-items: center; gap: 8px;
  }
  .lg-empty-hint::before, .lg-empty-hint::after { content: '—'; }

  .lg-acct-header {
    padding: 28px 36px 20px;
    border-bottom: 2px solid var(--ink);
    background: var(--bg);
    position: sticky; top: 0; z-index: 5;
    opacity: 0; animation: lgFade 0.3s ease forwards;
  }
  .lg-acct-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--ink-3); margin-bottom: 6px;
    display: flex; align-items: center; gap: 8px;
  }
  .lg-acct-eyebrow span {
    background: var(--ink); color: var(--bg);
    padding: 2px 8px; border-radius: 2px;
    font-size: 9px;
  }
  .lg-acct-name {
    font-family: 'Playfair Display', serif;
    font-size: 30px; font-weight: 400; line-height: 1;
    margin-bottom: 16px;
  }
  .lg-acct-stats {
    display: flex; gap: 32px; flex-wrap: wrap;
  }
  .lg-stat { display: flex; flex-direction: column; gap: 3px; }
  .lg-stat-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.15em; text-transform: uppercase;
    color: var(--ink-4);
  }
  .lg-stat-val {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600;
  }
  .lg-stat-val.green { color: var(--green); }
  .lg-stat-val.red { color: var(--red); }
  .lg-stat-val.neutral { color: var(--accent); }

  .lg-table-wrap {
    padding: 0 36px 48px;
    opacity: 0; animation: lgFade 0.3s ease 0.1s forwards;
  }

  .lg-col-heads {
    display: grid;
    grid-template-columns: 100px 1fr 120px 120px 140px;
    padding: 10px 0;
    border-bottom: 1px solid var(--ink);
    margin-top: 24px;
  }
  .lg-col-head {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
    color: var(--ink-3);
  }
  .lg-col-head.right { text-align: right; }

  .lg-row {
    display: grid;
    grid-template-columns: 100px 1fr 120px 120px 140px;
    padding: 12px 0;
    border-bottom: 1px solid var(--rule);
    align-items: center;
    opacity: 0; animation: lgRow 0.25s ease forwards;
    transition: background 0.1s;
  }
  .lg-row:hover { background: var(--bg-2); margin: 0 -36px; padding: 12px 36px; }

  @keyframes lgRow { to { opacity: 1; } }
  @keyframes lgFade { to { opacity: 1; } }

  .lg-row-date {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 11px; color: var(--ink-3);
  }
  .lg-row-desc { font-size: 13px; color: var(--ink); line-height: 1.3; }
  .lg-row-ref {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 10px; color: var(--ink-4); margin-top: 2px;
  }
  .lg-row-dr, .lg-row-cr {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; text-align: right;
  }
  .lg-row-dr { color: var(--red); }
  .lg-row-cr { color: var(--green); }
  .lg-row-balance {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; text-align: right; font-weight: 500;
    color: var(--ink);
  }
  .lg-row-balance.negative { color: var(--red); }

  .lg-footer-row {
    display: grid;
    grid-template-columns: 100px 1fr 120px 120px 140px;
    padding: 12px 0;
    border-top: 2px solid var(--ink);
  }
  .lg-footer-label {
    font-family: 'Playfair Display', serif; font-style: italic;
    font-size: 13px; color: var(--ink-2);
    grid-column: span 2;
  }
  .lg-footer-val {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 12px; font-weight: 500; text-align: right;
  }
  .lg-footer-val.green { color: var(--green); }
  .lg-footer-val.red { color: var(--red); }

  .lg-spinner-wrap { flex: 1; display: flex; align-items: center; justify-content: center; }
  .lg-spinner {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--rule);
    border-top-color: var(--accent);
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .lg-h-line { stroke: var(--rule); stroke-width: 0.5; }
  .lg-v-line { stroke: var(--rule); stroke-width: 0.5; }
  .lg-dot { fill: var(--rule); }

  @media (max-width: 768px) {
    .lg-sidebar { width: 220px; }
    .lg-col-heads, .lg-row, .lg-footer-row {
      grid-template-columns: 80px 1fr 100px 100px;
    }
    .lg-row-balance, .lg-col-head:last-child, .lg-footer-val:last-child { display: none; }
    .lg-acct-header { padding: 20px 20px 16px; }
    .lg-table-wrap { padding: 0 20px 40px; }
    .lg-col-heads { margin-top: 16px; }
  }
`;

/* ─── Constants ───────────────────────────────────────────── */
const ACCOUNT_TYPES = ['asset', 'liability', 'equity', 'revenue', 'expense'];
const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets', liability: 'Liabilities', equity: 'Equity',
  revenue: 'Revenue', expense: 'Expenses',
};

/* ─── Helpers ─────────────────────────────────────────────── */
function calcRunningBalance(transactions: Transaction[]) {
  let balance = 0;
  return transactions.map(t => {
    balance += (t.debit ?? 0) - (t.credit ?? 0);
    return { ...t, runningBalance: balance };
  });
}

function fmtAmt(n?: number) {
  if (!n || n === 0) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── Empty state illustration ────────────────────────────── */
function GridIllustration() {
  const rows = 6, cols = 5;
  const w = 280, h = 200;
  const cw = w / cols, rh = h / rows;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      {Array.from({ length: rows + 1 }).map((_, i) => (
        <line key={`h${i}`} x1={0} y1={i * rh} x2={w} y2={i * rh} className="lg-h-line" />
      ))}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <line key={`v${i}`} x1={i * cw} y1={0} x2={i * cw} y2={h} className="lg-v-line" />
      ))}
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => {
          const hide = r === 2 && c >= 1 && c <= 3;
          const rand = ((r * 7 + c * 13) % 5);
          const wFrac = [0.4, 0.65, 0.8, 0.55, 0.7][rand];
          return !hide ? (
            <rect key={`${r}-${c}`}
              x={c * cw + 8} y={r * rh + rh / 2 - 3}
              width={(cw - 16) * wFrac} height={6}
              rx={2} className="lg-dot" opacity={0.5}
            />
          ) : null;
        })
      )}
    </svg>
  );
}

/* ─── Page ─────────────────────────────────────────────────── */
export default function LedgerPage() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<(Transaction & { runningBalance: number })[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loadingAccts, setLoadingAccts] = useState(true);
  const [loadingTxns, setLoadingTxns] = useState(false);
  const [search, setSearch] = useState('');

  const selectedAccount = accounts.find(a => a.id === selectedId);

  const load = useCallback(async () => {
    if (!user) return;
    const accs = await getAccounts(user.companyId);
    setAccounts(accs);
    setLoadingAccts(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const selectAccount = useCallback(async (id: string) => {
    setSelectedId(id);
    setLoadingTxns(true);
    setTransactions([]);
    if (!user) return;
    try {
      const txns = await getTransactionsByAccount(user.companyId, id);
      setTransactions(calcRunningBalance(txns));
    } finally {
      setLoadingTxns(false);
    }
  }, [user]);

  const filtered = accounts.filter(a =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    String(a.code).includes(search)
  );

  const grouped = ACCOUNT_TYPES.map(type => ({
    type,
    items: filtered.filter(a => a.type === type),
  })).filter(g => g.items.length > 0);

  const totalDebit  = transactions.reduce((s, t) => s + (t.debit  ?? 0), 0);
  const totalCredit = transactions.reduce((s, t) => s + (t.credit ?? 0), 0);
  const netBalance  = totalDebit - totalCredit;

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="lg-root">

        {/* Top bar */}
        <div className="lg-topbar">
          <div className="lg-topbar-left">
            <div className="lg-topbar-icon"><BookOpen size={14} /></div>
            <div className="lg-topbar-title">General Ledger</div>
            <div className="lg-topbar-rule" />
            <div className="lg-topbar-subtitle">All transactions by account</div>
          </div>
          {selectedAccount && (
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: 'rgba(245,242,235,0.5)', letterSpacing: '0.05em' }}>
              {transactions.length} entries
            </div>
          )}
        </div>

        {/* Layout */}
        <div className="lg-layout">

          {/* Sidebar */}
          <div className="lg-sidebar">
            <div className="lg-sidebar-head">
              <div className="lg-sidebar-label">Chart of Accounts</div>
              <div className="lg-search">
                <Search size={12} />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search accounts…"
                />
              </div>
            </div>
            <div className="lg-accounts-list">
              {loadingAccts ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px' }}>
                  <div className="lg-spinner" />
                </div>
              ) : (
                grouped.map(({ type, items }) => (
                  <div key={type}>
                    <div className="lg-group-label">{TYPE_LABELS[type]}</div>
                    {items.map(a => (
                      <div
                        key={a.id}
                        className={`lg-account-item ${selectedId === a.id ? 'active' : ''}`}
                        onClick={() => selectAccount(a.id)}
                      >
                        <span className="lg-account-code">{a.code}</span>
                        <span className="lg-account-name">{a.name}</span>
                        <ChevronRight size={12} className="lg-account-chevron" />
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Main panel */}
          <div className="lg-main">
            {!selectedId ? (
              <div className="lg-empty">
                <div className="lg-empty-grid">
                  <GridIllustration />
                  <div className="lg-empty-icon-wrap">
                    <BookOpen size={22} />
                  </div>
                </div>
                <div className="lg-empty-title">General Ledger</div>
                <p className="lg-empty-desc">
                  Select an account from the sidebar to view its complete transaction history and running balance.
                </p>
                <div className="lg-empty-hint">Choose an account to begin</div>
              </div>

            ) : loadingTxns ? (
              <div className="lg-spinner-wrap"><div className="lg-spinner" /></div>

            ) : (
              <>
                {/* Account header */}
                <div className="lg-acct-header" key={selectedId}>
                  <div className="lg-acct-eyebrow">
                    <span>{selectedAccount?.code}</span>
                    {selectedAccount?.type}
                  </div>
                  <div className="lg-acct-name">{selectedAccount?.name}</div>
                  <div className="lg-acct-stats">
                    <div className="lg-stat">
                      <div className="lg-stat-label">Total Debits</div>
                      <div className="lg-stat-val red">{fmtAmt(totalDebit)}</div>
                    </div>
                    <div className="lg-stat">
                      <div className="lg-stat-label">Total Credits</div>
                      <div className="lg-stat-val green">{fmtAmt(totalCredit)}</div>
                    </div>
                    <div className="lg-stat">
                      <div className="lg-stat-label">Net Balance</div>
                      <div className={`lg-stat-val ${netBalance === 0 ? 'neutral' : netBalance > 0 ? 'red' : 'green'}`}>
                        {netBalance === 0 ? '—' : fmtAmt(Math.abs(netBalance))}
                        {netBalance !== 0 && (
                          <span style={{ fontSize: 11, marginLeft: 4, verticalAlign: 'middle', opacity: 0.7 }}>
                            {netBalance > 0 ? 'Dr' : 'Cr'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="lg-stat">
                      <div className="lg-stat-label">Entries</div>
                      <div className="lg-stat-val neutral">{transactions.length}</div>
                    </div>
                  </div>
                </div>

                {/* Transactions table */}
                <div className="lg-table-wrap" key={`table-${selectedId}`}>
                  {transactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-3)' }}>
                      <div style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, marginBottom: 8 }}>
                        No transactions recorded
                      </div>
                      <div style={{ fontSize: 12, fontFamily: "'IBM Plex Mono', monospace" }}>
                        This account has no posted entries yet
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="lg-col-heads">
                        <div className="lg-col-head">Date</div>
                        <div className="lg-col-head">Description</div>
                        <div className="lg-col-head right">Debit</div>
                        <div className="lg-col-head right">Credit</div>
                        <div className="lg-col-head right">Balance</div>
                      </div>

                      {transactions.map((t, i) => (
                        <div className="lg-row" key={t.id} style={{ animationDelay: `${i * 0.03}s` }}>
                          <div className="lg-row-date">{formatDate(t.date)}</div>
                          <div>
                            <div className="lg-row-desc">{t.description || t.memo || '—'}</div>
                            {t.reference && <div className="lg-row-ref">#{t.reference}</div>}
                          </div>
                          <div className="lg-row-dr">{t.debit  ? fmtAmt(t.debit)  : '—'}</div>
                          <div className="lg-row-cr">{t.credit ? fmtAmt(t.credit) : '—'}</div>
                          <div className={`lg-row-balance ${t.runningBalance < 0 ? 'negative' : ''}`}>
                            {t.runningBalance < 0 ? '(' : ''}
                            {fmtAmt(Math.abs(t.runningBalance))}
                            {t.runningBalance < 0 ? ')' : ''}
                          </div>
                        </div>
                      ))}

                      <div className="lg-footer-row">
                        <div className="lg-footer-label">Closing Balance</div>
                        <div className={`lg-footer-val ${totalDebit  >= totalCredit ? 'red'   : 'green'}`}>{fmtAmt(totalDebit)}</div>
                        <div className={`lg-footer-val ${totalCredit >  totalDebit  ? 'green' : 'red'  }`}>{fmtAmt(totalCredit)}</div>
                        <div className={`lg-footer-val ${netBalance  >= 0           ? 'red'   : 'green'}`}>
                          {fmtAmt(Math.abs(netBalance))}
                          <span style={{ fontSize: 9, marginLeft: 4, opacity: 0.7 }}>
                            {netBalance > 0 ? 'Dr' : netBalance < 0 ? 'Cr' : ''}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}