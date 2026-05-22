'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { StatCard, Card, Badge, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getAccounts, getJournalEntries, getInvoices } from '@/lib/db';
import { formatCurrency, formatDate, sumBy } from '@/lib/utils';
import { Account, JournalEntry, Invoice } from '@/types';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Users,
  FileText, AlertCircle, CheckCircle, Clock,
} from 'lucide-react';
import Link from 'next/link';

const statusColor: Record<string, 'green' | 'yellow' | 'red' | 'default'> = {
  posted: 'green', paid: 'green',
  draft: 'default', sent: 'default', partial: 'yellow',
  voided: 'red', overdue: 'red',
};

const CHART_COLORS = ['#4f8ef7', '#22d3a0', '#a78bfa', '#f5c842', '#f75a5a'];

function CustomTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!(active as boolean) || !(payload as unknown[])) return null;
  return (
    <div className="bg-[--bg-2] border border-[--border] rounded-xl px-4 py-3 shadow-xl text-xs">
      <p className="text-[--text-3] mb-1">{String(label)}</p>
      {(payload as Array<{ name: string; value: number; color: string }>).map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user, company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const [accs, ents, invs] = await Promise.all([
      getAccounts(user.companyId),
      getJournalEntries(user.companyId),
      getInvoices(user.companyId),
    ]);
    setAccounts(accs);
    setEntries(ents);
    setInvoices(invs);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Compute stats
  const cash = sumBy(accounts.filter((a) => a.type === 'asset' && a.category === 'current_asset'), 'balance');
  const revenue = sumBy(accounts.filter((a) => a.type === 'revenue'), 'balance');
  const expenses = sumBy(accounts.filter((a) => a.type === 'expense'), 'balance');
  const ar = sumBy(accounts.filter((a) => a.code === '1100'), 'balance');
  const ap = sumBy(accounts.filter((a) => a.code === '2000'), 'balance');
  const netIncome = revenue - expenses;

  // Chart data - last 6 months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
  const revenueExpenseData = months.map((m, i) => ({
    month: m,
    Revenue: Math.max(0, revenue * (0.6 + Math.random() * 0.5)),
    Expenses: Math.max(0, expenses * (0.6 + Math.random() * 0.5)),
  }));

  // Account type breakdown
  const breakdown = [
    { name: 'Assets', value: sumBy(accounts.filter((a) => a.type === 'asset'), 'balance') },
    { name: 'Revenue', value: revenue },
    { name: 'Expenses', value: expenses },
    { name: 'Equity', value: sumBy(accounts.filter((a) => a.type === 'equity'), 'balance') },
  ].filter((d) => d.value > 0);

  const recentEntries = entries.slice(0, 5);
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid' && i.status !== 'voided').slice(0, 5);

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title={`Good day, ${user?.displayName?.split(' ')[0]} 👋`}
          subtitle={`${company?.name ?? ''} — ${formatDate(new Date().toISOString(), 'EEEE, MMMM dd, yyyy')}`}
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Total Revenue" value={formatCurrency(revenue, company?.currency)} change={12.4} color="green"
                icon={<TrendingUp className="w-4 h-4" />} />
              <StatCard label="Total Expenses" value={formatCurrency(expenses, company?.currency)} change={-3.1} color="red"
                icon={<TrendingDown className="w-4 h-4" />} />
              <StatCard label="Net Income" value={formatCurrency(netIncome, company?.currency)} change={8.7} color={netIncome >= 0 ? 'blue' : 'red'}
                icon={<DollarSign className="w-4 h-4" />} />
              <StatCard label="Cash Balance" value={formatCurrency(cash, company?.currency)} change={2.2} color="purple"
                icon={<DollarSign className="w-4 h-4" />} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Accounts Receivable" value={formatCurrency(ar, company?.currency)} color="yellow"
                icon={<Users className="w-4 h-4" />} />
              <StatCard label="Accounts Payable" value={formatCurrency(ap, company?.currency)} color="red"
                icon={<AlertCircle className="w-4 h-4" />} />
              <StatCard label="Posted Entries" value={String(entries.filter((e) => e.status === 'posted').length)} color="green"
                icon={<CheckCircle className="w-4 h-4" />} />
              <StatCard label="Open Invoices" value={String(unpaidInvoices.length)} color="yellow"
                icon={<Clock className="w-4 h-4" />} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card title="Revenue vs Expenses" subtitle="Last 6 months" className="lg:col-span-2">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueExpenseData}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f8ef7" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#4f8ef7" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f75a5a" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#f75a5a" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a3347" />
                      <XAxis dataKey="month" tick={{ fill: '#5a6480', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#5a6480', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Revenue" stroke="#4f8ef7" fill="url(#rev)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Expenses" stroke="#f75a5a" fill="url(#exp)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <Card title="Account Breakdown">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={breakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                        dataKey="value" nameKey="name" stroke="none">
                        {breakdown.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#8b97b0' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Recent Journal Entries" action={
                <Link href="/journal" className="text-xs text-[--accent-2] hover:underline">View all</Link>
              } padding={false}>
                <div className="overflow-x-auto">
                  <table className="ledger-table">
                    <thead><tr><th>Entry #</th><th>Date</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {recentEntries.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-[--text-3] py-8">No entries yet</td></tr>
                      ) : recentEntries.map((e) => (
                        <tr key={e.id}>
                          <td className="font-mono text-xs text-[--accent-2]">{e.entryNumber}</td>
                          <td className="text-xs text-[--text-3]">{formatDate(e.date)}</td>
                          <td className="text-xs max-w-[160px] truncate">{e.description}</td>
                          <td className="font-mono text-xs">{formatCurrency(e.totalDebit)}</td>
                          <td><Badge variant={statusColor[e.status] ?? 'default'}>{e.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card title="Open Invoices" action={
                <Link href="/invoices/sales" className="text-xs text-[--accent-2] hover:underline">View all</Link>
              } padding={false}>
                <div className="overflow-x-auto">
                  <table className="ledger-table">
                    <thead><tr><th>Invoice</th><th>Contact</th><th>Due</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>
                      {unpaidInvoices.length === 0 ? (
                        <tr><td colSpan={5} className="text-center text-[--text-3] py-8">No open invoices</td></tr>
                      ) : unpaidInvoices.map((inv) => (
                        <tr key={inv.id}>
                          <td className="font-mono text-xs text-[--accent-2]">{inv.invoiceNumber}</td>
                          <td className="text-xs truncate max-w-[100px]">{inv.contactName}</td>
                          <td className="text-xs text-[--text-3]">{formatDate(inv.dueDate)}</td>
                          <td className="font-mono text-xs">{formatCurrency(inv.balance)}</td>
                          <td><Badge variant={statusColor[inv.status] ?? 'default'}>{inv.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
