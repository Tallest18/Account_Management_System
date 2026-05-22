'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { EmptyState, Card } from '@/components/ui';
import { BarChart3 } from 'lucide-react';
export default function CashFlowPage() {
  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader title="Cash Flow Statement" subtitle="Operating, investing, and financing activities" />
        <Card><EmptyState icon={<BarChart3 className="w-10 h-10" />} title="Cash Flow Report"
          description="Cash flow reporting coming soon." /></Card>
      </div>
    </AuthGuard>
  );
}
