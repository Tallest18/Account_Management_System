'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Card, Spinner } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { getAccounts } from '@/lib/db';
import { Account } from '@/types';
import { formatCurrency, sumBy } from '@/lib/utils';
import { Download, RefreshCw } from 'lucide-react';

export default function BalanceSheetPage() {
  const { user, company } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const data = await getAccounts(user.companyId);
    setAccounts(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const cur = (currency?: string) => company?.currency ?? currency ?? 'USD';

  const assetAccounts = accounts.filter((a) => a.type === 'asset');
  const liabilityAccounts = accounts.filter((a) => a.type === 'liability');
  const equityAccounts = accounts.filter((a) => a.type === 'equity');
  const revenue = sumBy(accounts.filter((a) => a.type === 'revenue'), 'balance');
  const expenses = sumBy(accounts.filter((a) => a.type === 'expense'), 'balance');
  const retainedEarnings = revenue - expenses;

  const totalAssets = sumBy(assetAccounts, 'balance');
  const totalLiabilities = sumBy(liabilityAccounts, 'balance');
  const totalEquity = sumBy(equityAccounts, 'balance') + retainedEarnings;
  const totalLiabEquity = totalLiabilities + totalEquity;
  const isBalanced = Math.abs(totalAssets - totalLiabEquity) < 0.01;

  const Section = ({ title, accts, total, totalLabel, totalClass }: { title: string; accts: Account[]; total: number; totalLabel: string; totalClass: string }) => (
    <div>
      <div className="px-5 py-2 bg-[--bg-3] border-b border-[--border]">
        <p className="text-xs font-bold uppercase tracking-wider text-[--text-3]">{title}</p>
      </div>
      {accts.map((a) => (
        <div key={a.id} className="flex justify-between items-center px-5 py-2.5 border-b border-[--border] hover:bg-[rgba(79,142,247,0.03)]">
          <p className="text-sm pl-4">
            <span className="text-[--text-3] font-mono text-xs mr-2">{a.code}</span>{a.name}
          </p>
          <p className="font-mono text-sm">{formatCurrency(a.balance, cur())}</p>
        </div>
      ))}
      <div className="flex justify-between items-center px-5 py-3 border-b border-[--border-2]">
        <p className="text-sm font-semibold text-[--text-2]">{totalLabel}</p>
        <p className={`font-mono font-bold text-sm ${totalClass}`}>{formatCurrency(total, cur())}</p>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Balance Sheet"
          subtitle={`${company?.name ?? ''} — As of ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
          action={
            <div className="flex gap-3">
              <Button variant="secondary" icon={<RefreshCw className="w-3.5 h-3.5" />} size="sm" onClick={load}>Refresh</Button>
              <Button variant="secondary" icon={<Download className="w-3.5 h-3.5" />} size="sm">Export PDF</Button>
            </div>
          }
        />

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size={28} /></div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets */}
            <div>
              <h2 className="text-sm font-bold text-[--text] mb-3 uppercase tracking-wider">Assets</h2>
              <Card padding={false}>
                <Section title="Current Assets" accts={assetAccounts.filter((a) => a.category === 'current_asset')}
                  total={sumBy(assetAccounts.filter((a) => a.category === 'current_asset'), 'balance')}
                  totalLabel="Total Current Assets" totalClass="text-[--blue-400] text-[--accent-2]" />
                <Section title="Fixed Assets" accts={assetAccounts.filter((a) => a.category === 'fixed_asset')}
                  total={sumBy(assetAccounts.filter((a) => a.category === 'fixed_asset'), 'balance')}
                  totalLabel="Total Fixed Assets" totalClass="text-[--accent-2]" />
                <div className="flex justify-between items-center px-5 py-4 bg-[--bg]">
                  <p className="font-bold text-base">Total Assets</p>
                  <p className="font-mono font-bold text-lg text-[--accent-2]">{formatCurrency(totalAssets, cur())}</p>
                </div>
              </Card>
            </div>

            {/* Liabilities + Equity */}
            <div>
              <h2 className="text-sm font-bold text-[--text] mb-3 uppercase tracking-wider">Liabilities & Equity</h2>
              <Card padding={false}>
                <Section title="Current Liabilities" accts={liabilityAccounts.filter((a) => a.category === 'current_liability')}
                  total={sumBy(liabilityAccounts.filter((a) => a.category === 'current_liability'), 'balance')}
                  totalLabel="Total Current Liabilities" totalClass="text-[--red]" />
                <Section title="Long-term Liabilities" accts={liabilityAccounts.filter((a) => a.category === 'long_term_liability')}
                  total={sumBy(liabilityAccounts.filter((a) => a.category === 'long_term_liability'), 'balance')}
                  totalLabel="Total Long-term Liabilities" totalClass="text-[--red]" />
                <div className="flex justify-between items-center px-5 py-2.5 border-b border-[--border]">
                  <p className="text-sm font-semibold text-[--text-2]">Total Liabilities</p>
                  <p className="font-mono font-bold text-sm text-[--red]">{formatCurrency(totalLiabilities, cur())}</p>
                </div>

                <Section title="Equity" accts={equityAccounts}
                  total={sumBy(equityAccounts, 'balance')}
                  totalLabel="Paid-in Capital" totalClass="text-[--purple]" />

                <div className="flex justify-between items-center px-5 py-2.5 border-b border-[--border] pl-9">
                  <p className="text-sm text-[--text-2]">Retained Earnings (Current Period)</p>
                  <p className={`font-mono text-sm ${retainedEarnings >= 0 ? 'text-[--green]' : 'text-[--red]'}`}>{formatCurrency(retainedEarnings, cur())}</p>
                </div>
                <div className="flex justify-between items-center px-5 py-2.5 border-b border-[--border]">
                  <p className="text-sm font-semibold text-[--text-2]">Total Equity</p>
                  <p className="font-mono font-bold text-sm text-[--purple]">{formatCurrency(totalEquity, cur())}</p>
                </div>
                <div className="flex justify-between items-center px-5 py-4 bg-[--bg]">
                  <p className="font-bold text-base">Total Liabilities & Equity</p>
                  <p className={`font-mono font-bold text-lg ${isBalanced ? 'text-[--green]' : 'text-[--red]'}`}>{formatCurrency(totalLiabEquity, cur())}</p>
                </div>
              </Card>

              {!isBalanced && (
                <div className="mt-3 p-3 rounded-xl bg-[--red-bg] border border-[--red]/20 text-sm text-[--red]">
                  ⚠ Balance sheet is out of balance by {formatCurrency(Math.abs(totalAssets - totalLiabEquity), cur())}
                </div>
              )}
              {isBalanced && totalAssets > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-[--green-bg] border border-[--green]/20 text-sm text-[--green]">
                  ✓ Balance sheet is balanced
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
