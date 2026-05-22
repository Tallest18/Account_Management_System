'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Card, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getAccounts } from '@/lib/db';
import { Account } from '@/types';
import { formatCurrency, toTitleCase, groupBy } from '@/lib/utils';
import { BarChart3, Download, RefreshCw } from 'lucide-react';

export default function TrialBalancePage() {
  const { user, company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getAccounts(user.companyId);
    setAccounts(data.filter((a) => a.balance !== 0));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const grouped = groupBy(accounts, 'type');
  const totalDebit = accounts.filter((a) => a.type === 'asset' || a.type === 'expense').reduce((s, a) => s + Math.abs(a.balance), 0);
  const totalCredit = accounts.filter((a) => a.type !== 'asset' && a.type !== 'expense').reduce((s, a) => s + Math.abs(a.balance), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const rows = (type: string) => grouped[type] ?? [];

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Trial Balance"
          subtitle={`${company?.name ?? ''} — As of ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          action={
            <div className="flex gap-3">
              <Button variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} size="sm" onClick={load}>Refresh</Button>
              <Button variant="secondary" icon={<Download className="w-3.5 h-3.5" />} size="sm">Export</Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <Card padding={false}>
            <div className="overflow-x-auto">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Account Name</th>
                    <th>Type</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(['asset', 'liability', 'equity', 'revenue', 'expense'] as const).map((type) => {
                    const group = rows(type);
                    if (!group.length) return null;
                    return (
                      <>
                        <tr key={`header-${type}`} className="bg-[--bg-3]">
                          <td colSpan={5} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[--text-3]">
                            {toTitleCase(type)}s
                          </td>
                        </tr>
                        {group.map((acct) => {
                          const isDebitNormal = acct.type === 'asset' || acct.type === 'expense';
                          return (
                            <tr key={acct.id}>
                              <td className="font-mono text-xs text-[--accent-2]">{acct.code}</td>
                              <td>{acct.name}</td>
                              <td className="text-xs text-[--text-3] capitalize">{acct.type}</td>
                              <td className="text-right font-mono text-sm text-[--green]">
                                {isDebitNormal && acct.balance > 0 ? formatCurrency(acct.balance) : '—'}
                              </td>
                              <td className="text-right font-mono text-sm text-[--red]">
                                {!isDebitNormal && acct.balance > 0 ? formatCurrency(acct.balance) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[--border-2] bg-[--bg]">
                    <td colSpan={3} className="px-4 py-3 font-bold text-sm uppercase tracking-wider">Totals</td>
                    <td className="text-right font-mono font-bold text-lg text-[--green] px-4 py-3">{formatCurrency(totalDebit)}</td>
                    <td className="text-right font-mono font-bold text-lg text-[--red] px-4 py-3">{formatCurrency(totalCredit)}</td>
                  </tr>
                  <tr className="bg-[--bg]">
                    <td colSpan={5} className={`px-4 py-2 text-center text-sm font-semibold ${isBalanced ? 'text-[--green]' : 'text-[--red]'}`}>
                      {isBalanced ? '✓ Trial Balance is balanced' : `⚠ Difference of ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        )}
      </div>
    </AuthGuard>
  );
}
