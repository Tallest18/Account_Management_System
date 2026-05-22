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

export default function ProfitLossPage() {
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

  const revenueAccounts = accounts.filter((a) => a.type === 'revenue');
  const cogsAccounts = accounts.filter((a) => a.category === 'cogs');
  const opexAccounts = accounts.filter((a) => a.category === 'operating_expense');
  const otherExpAccounts = accounts.filter((a) => a.category === 'other_expense');

  const totalRevenue = sumBy(revenueAccounts, 'balance');
  const totalCOGS = sumBy(cogsAccounts, 'balance');
  const grossProfit = totalRevenue - totalCOGS;
  const totalOpex = sumBy(opexAccounts, 'balance');
  const operatingIncome = grossProfit - totalOpex;
  const totalOtherExp = sumBy(otherExpAccounts, 'balance');
  const netIncome = operatingIncome - totalOtherExp;

  const Section = ({ title, accounts, total, totalLabel, totalClass }: { title: string; accounts: Account[]; total: number; totalLabel: string; totalClass: string }) => (
    <>
      <tr className="bg-[--bg-3]">
        <td colSpan={2} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[--text-3]">{title}</td>
      </tr>
      {accounts.map((a) => (
        <tr key={a.id}>
          <td className="pl-8 py-2 text-sm">
            <span className="text-[--text-3] font-mono text-xs mr-2">{a.code}</span>{a.name}
          </td>
          <td className="text-right font-mono text-sm px-4 py-2">{formatCurrency(a.balance, company?.currency)}</td>
        </tr>
      ))}
      <tr className="border-t border-[--border]">
        <td className="px-4 py-2 font-semibold text-sm text-[--text-2]">{totalLabel}</td>
        <td className={`text-right font-mono font-bold text-sm px-4 py-2 ${totalClass}`}>{formatCurrency(total, company?.currency)}</td>
      </tr>
    </>
  );

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader
          title="Profit & Loss Statement"
          subtitle={`${company?.name ?? ''} — For the period ending ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`}
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
          <div className="max-w-2xl">
            <Card padding={false}>
              <div className="px-6 py-4 border-b border-[--border] text-center">
                <p className="font-bold text-lg text-[--text]">{company?.name}</p>
                <p className="text-sm text-[--text-3]">Income Statement (Profit & Loss)</p>
              </div>
              <table className="w-full">
                <tbody>
                  <Section title="Revenue" accounts={revenueAccounts} total={totalRevenue} totalLabel="Total Revenue" totalClass="text-[--green]" />

                  <tr className="h-2" />
                  <Section title="Cost of Goods Sold" accounts={cogsAccounts} total={totalCOGS} totalLabel="Total COGS" totalClass="text-[--red]" />

                  <tr className="bg-[--bg-3] border-t border-[--border-2]">
                    <td className="px-4 py-3 font-bold text-base">Gross Profit</td>
                    <td className={`text-right font-mono font-bold text-base px-4 py-3 ${grossProfit >= 0 ? 'text-[--green]' : 'text-[--red]'}`}>
                      {formatCurrency(grossProfit, company?.currency)}
                    </td>
                  </tr>

                  <tr className="h-2" />
                  <Section title="Operating Expenses" accounts={opexAccounts} total={totalOpex} totalLabel="Total Operating Expenses" totalClass="text-[--red]" />

                  <tr className="bg-[--bg-3] border-t border-[--border-2]">
                    <td className="px-4 py-3 font-bold text-base">Operating Income</td>
                    <td className={`text-right font-mono font-bold text-base px-4 py-3 ${operatingIncome >= 0 ? 'text-[--green]' : 'text-[--red]'}`}>
                      {formatCurrency(operatingIncome, company?.currency)}
                    </td>
                  </tr>

                  {otherExpAccounts.length > 0 && (
                    <>
                      <tr className="h-2" />
                      <Section title="Other Expenses" accounts={otherExpAccounts} total={totalOtherExp} totalLabel="Total Other Expenses" totalClass="text-[--red]" />
                    </>
                  )}

                  <tr className="border-t-2 border-[--border-2] bg-[--bg]">
                    <td className="px-4 py-4 font-bold text-lg">Net Income</td>
                    <td className={`text-right font-mono font-bold text-xl px-4 py-4 ${netIncome >= 0 ? 'text-[--green]' : 'text-[--red]'}`}>
                      {formatCurrency(netIncome, company?.currency)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* Net margin callout */}
            {totalRevenue > 0 && (
              <div className={`mt-4 card p-4 flex items-center justify-between ${netIncome >= 0 ? 'border-[--green]/20' : 'border-[--red]/20'}`}>
                <p className="text-sm text-[--text-2]">Net Profit Margin</p>
                <p className={`font-bold font-mono text-lg ${netIncome >= 0 ? 'text-[--green]' : 'text-[--red]'}`}>
                  {((netIncome / totalRevenue) * 100).toFixed(2)}%
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
