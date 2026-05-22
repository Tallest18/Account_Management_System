'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { EmptyState, Card } from '@/components/ui';
import { BookOpen } from 'lucide-react';
export default function LedgerPage() {
  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader title="General Ledger" subtitle="All transactions by account" />
        <Card><EmptyState icon={<BookOpen className="w-10 h-10" />} title="General Ledger"
          description="Select an account to view its full transaction history." /></Card>
      </div>
    </AuthGuard>
  );
}
