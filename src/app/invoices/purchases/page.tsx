'use client';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { EmptyState, Card, Button } from '@/components/ui';
import { FileText, Plus } from 'lucide-react';
export default function PurchasesPage() {
  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader title="Purchase Bills" subtitle="Track bills from vendors"
          action={<Button icon={<Plus className="w-4 h-4" />}>New Bill</Button>} />
        <Card><EmptyState icon={<FileText className="w-10 h-10" />} title="No bills yet"
          description="Record purchase bills from your vendors." action={<Button>Create Bill</Button>} /></Card>
      </div>
    </AuthGuard>
  );
}
