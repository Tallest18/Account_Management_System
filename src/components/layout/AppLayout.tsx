'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, BookOpen, FileText, Users, CreditCard,
  BarChart3, Shield, Settings, LogOut, ChevronRight,
  TrendingUp, ChevronDown, Menu, X, Building2,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/journal', icon: BookOpen, label: 'Journal Entries' },
  {
    label: 'Accounts', icon: TrendingUp, children: [
      { href: '/accounts', label: 'Chart of Accounts' },
      { href: '/accounts/ledger', label: 'General Ledger' },
    ],
  },
  {
    label: 'Sales', icon: FileText, children: [
      { href: '/invoices/sales', label: 'Invoices' },
      { href: '/contacts/customers', label: 'Customers' },
    ],
  },
  {
    label: 'Purchases', icon: CreditCard, children: [
      { href: '/invoices/purchases', label: 'Bills' },
      { href: '/contacts/vendors', label: 'Vendors' },
    ],
  },
  { href: '/payments', icon: CreditCard, label: 'Payments' },
  {
    label: 'Reports', icon: BarChart3, children: [
      { href: '/reports/trial-balance', label: 'Trial Balance' },
      { href: '/reports/profit-loss', label: 'Profit & Loss' },
      { href: '/reports/balance-sheet', label: 'Balance Sheet' },
      { href: '/reports/cash-flow', label: 'Cash Flow' },
    ],
  },
  { href: '/audit', icon: Shield, label: 'Audit Log' },
  { href: '/settings', icon: Settings, label: 'Settings' },
];

function NavItem({ item, collapsed }: { item: typeof nav[0]; collapsed: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if ('children' in item && item.children) {
    const isActive = item.children.some((c) => pathname.startsWith(c.href));
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={cn('nav-item w-full', isActive && 'active')}
        >
          <item.icon className="w-4 h-4 shrink-0" />
          {!collapsed && <><span className="flex-1 text-left">{item.label}</span><ChevronDown className={cn('w-3.5 h-3.5 transition-transform', open && 'rotate-180')} /></>}
        </button>
        {open && !collapsed && (
          <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-[--border] pl-3">
            {item.children.map((c) => (
              <Link key={c.href} href={c.href} className={cn('nav-item text-xs py-2', pathname === c.href && 'active')}>
                <ChevronRight className="w-3 h-3" />{c.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  const href = (item as { href: string }).href;
  const isActive = pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} className={cn('nav-item', isActive && 'active')}>
      <item.icon className="w-4 h-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, company, logOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 flex flex-col',
        'bg-[--bg-2] border-r border-[--border] transition-all duration-200',
        collapsed ? 'w-16' : 'w-60',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className={cn('flex items-center gap-3 px-4 py-5 border-b border-[--border]', collapsed && 'justify-center px-3')}>
          <div className="w-8 h-8 rounded-lg bg-[--accent] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-[--text] truncate">LedgerFlow</p>
              <p className="text-[10px] text-[--text-3] truncate">{company?.name ?? 'Your Company'}</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-auto text-[--text-3] hover:text-[--text] hidden lg:block"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          {nav.map((item, i) => <NavItem key={i} item={item} collapsed={collapsed} />)}
        </nav>

        {/* User */}
        <div className={cn('p-3 border-t border-[--border]', collapsed && 'flex flex-col items-center gap-2')}>
          {!collapsed && (
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-[10px] bg-[--bg-3] mb-2">
              <div className="w-7 h-7 rounded-full bg-[--accent-glow] border border-[--accent]/30 flex items-center justify-center">
                <span className="text-xs font-bold text-[--accent-2]">
                  {user?.displayName?.[0]?.toUpperCase() ?? 'U'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[--text] truncate">{user?.displayName}</p>
                <p className="text-[10px] text-[--text-3] truncate capitalize">{user?.role}</p>
              </div>
            </div>
          )}
          <button
            onClick={logOut}
            className={cn('nav-item w-full text-[--red] hover:bg-[--red-bg] hover:text-[--red]', collapsed && 'justify-center')}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-[--border] bg-[--bg-2]">
          <button onClick={() => setMobileOpen(true)} className="text-[--text-2]">
            <Menu className="w-5 h-5" />
          </button>
          <p className="text-sm font-bold text-gradient">LedgerFlow</p>
        </div>

        <main className="flex-1 overflow-y-auto bg-[--bg]">
          {children}
        </main>
      </div>
    </div>
  );
}

// Page header component
export function PageHeader({ title, subtitle, action }: {
  title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-xl font-bold text-[--text]">{title}</h1>
        {subtitle && <p className="text-sm text-[--text-3] mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
