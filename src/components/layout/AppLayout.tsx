'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard, BookOpen, FileText, CreditCard,
  BarChart3, Shield, Settings, LogOut,
  TrendingUp, ChevronDown, Menu, X,
  PanelLeftClose, PanelLeftOpen, Zap,
} from 'lucide-react';

/* ─── nav tree ───────────────────────────────────────── */
const nav = [
  {
    section: 'Overview',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { href: '/journal',   icon: BookOpen,        label: 'Journal Entries' },
    ],
  },
  {
    section: 'Finance',
    items: [
      {
        label: 'Accounts', icon: TrendingUp, children: [
          { href: '/accounts',        label: 'Chart of Accounts' },
          { href: '/accounts/ledger', label: 'General Ledger' },
        ],
      },
      {
        label: 'Sales', icon: FileText, children: [
          { href: '/invoices/sales',     label: 'Invoices' },
          { href: '/contacts/customers', label: 'Customers' },
        ],
      },
      {
        label: 'Purchases', icon: CreditCard, children: [
          { href: '/invoices/purchases', label: 'Bills' },
          { href: '/contacts/vendors',   label: 'Vendors' },
        ],
      },
      { href: '/payments', icon: CreditCard, label: 'Payments' },
    ],
  },
  {
    section: 'Insights',
    items: [
      {
        label: 'Reports', icon: BarChart3, children: [
          { href: '/reports/trial-balance', label: 'Trial Balance' },
          { href: '/reports/profit-loss',   label: 'Profit & Loss' },
          { href: '/reports/balance-sheet', label: 'Balance Sheet' },
          { href: '/reports/cash-flow',     label: 'Cash Flow' },
        ],
      },
      { href: '/audit', icon: Shield, label: 'Audit Log' },
    ],
  },
  {
    section: 'System',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings' },
    ],
  },
];

/* ─── types ──────────────────────────────────────────── */
type LeafItem  = { href: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; label: string };
type GroupItem = { label: string; icon: React.ComponentType<{ style?: React.CSSProperties }>; children: { href: string; label: string }[] };
type NavItem   = LeafItem | GroupItem;

interface AuthUser {
  displayName?: string | null;
  role?: string;
}

function isGroup(item: NavItem): item is GroupItem {
  return 'children' in item;
}
const SZ = { width: '15px', height: '15px' } as const;

/* ─── NavGroup ───────────────────────────────────────── */
function NavGroup({ item, collapsed }: { item: GroupItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = item.children.some((c) => pathname.startsWith(c.href));
  const [open, setOpen] = useState(isActive);

  return (
    <div>
      <button
        onClick={() => !collapsed && setOpen((o) => !o)}
        title={collapsed ? item.label : undefined}
        style={{
          width: '100%', display: 'flex', alignItems: 'center',
          gap: '10px', padding: collapsed ? '9px 0' : '9px 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: '10px', border: 'none', cursor: 'pointer',
          background: isActive ? 'rgba(99,102,241,0.10)' : 'transparent',
          color: isActive ? '#818cf8' : '#6b7280',
          position: 'relative', transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; } }}
        onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; } }}
      >
        {isActive && <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '2px', borderRadius: '2px', background: 'linear-gradient(180deg, #4f46e5, #7c3aed)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />}
        <item.icon style={SZ} />
        {!collapsed && (
          <>
            <span style={{ flex: 1, textAlign: 'left', fontSize: '13px', fontWeight: isActive ? 600 : 400, letterSpacing: '-0.01em' }}>{item.label}</span>
            <ChevronDown style={{ ...SZ, transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s', opacity: 0.5 }} />
          </>
        )}
      </button>

      {!collapsed && (
        <div style={{ overflow: 'hidden', maxHeight: open ? `${item.children.length * 44}px` : '0', transition: 'max-height 0.25s cubic-bezier(0.16,1,0.3,1)' }}>
          <div style={{ marginLeft: '14px', paddingLeft: '14px', borderLeft: '1px solid rgba(99,102,241,0.12)', display: 'flex', flexDirection: 'column', gap: '1px', paddingBottom: '4px', marginTop: '2px' }}>
            {item.children.map((child) => (
              <NavGroupChild key={child.href} href={child.href} label={child.label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── NavGroupChild ──────────────────────────────────── */
// Extracted so usePathname is called at the top level of a component, not inside a .map() callback
function NavGroupChild({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      style={{
        display: 'flex', alignItems: 'center', gap: '7px',
        padding: '7px 10px', borderRadius: '8px', fontSize: '12px',
        fontWeight: active ? 600 : 400, color: active ? '#f9fafb' : '#4b5563',
        background: active ? 'rgba(99,102,241,0.10)' : 'transparent',
        textDecoration: 'none', transition: 'all 0.15s', letterSpacing: '-0.01em',
      }}
      onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.05)'; } }}
      onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.color = '#4b5563'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}
    >
      <span style={{ width: '4px', height: '4px', borderRadius: '50%', flexShrink: 0, background: active ? '#818cf8' : 'rgba(255,255,255,0.15)', boxShadow: active ? '0 0 6px rgba(129,140,248,0.8)' : 'none', transition: 'all 0.15s' }} />
      {label}
    </Link>
  );
}

/* ─── NavLeaf ────────────────────────────────────────── */
function NavLeaf({ item, collapsed }: { item: LeafItem; collapsed: boolean }) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  return (
    <Link href={item.href} title={collapsed ? item.label : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: collapsed ? '9px 0' : '9px 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: '10px',
        background: isActive ? 'rgba(99,102,241,0.10)' : 'transparent',
        color: isActive ? '#818cf8' : '#6b7280',
        textDecoration: 'none',
        position: 'relative', transition: 'all 0.15s', fontSize: '13px',
        fontWeight: isActive ? 600 : 400, letterSpacing: '-0.01em',
      }}
      onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; } }}
      onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#6b7280'; } }}
    >
      {isActive && (
        <>
          <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: '2px', borderRadius: '2px', background: 'linear-gradient(180deg, #4f46e5, #7c3aed)', boxShadow: '0 0 8px rgba(99,102,241,0.6)' }} />
          <div style={{ position: 'absolute', inset: 0, borderRadius: '10px', background: 'radial-gradient(ellipse 80% 100% at 10% 50%, rgba(99,102,241,0.14), transparent)', pointerEvents: 'none' }} />
        </>
      )}
      <item.icon style={SZ} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}

/* ─── SidebarInner ───────────────────────────────────── */
function SidebarInner({ collapsed, onToggleCollapse, showToggle }: {
  collapsed: boolean;
  onToggleCollapse?: () => void;
  showToggle?: boolean;
}) {
  const { user, company, logOut } = useAuth();
  const authUser = user as AuthUser | null;
  const initials = authUser?.displayName
    ? authUser.displayName.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <>
      {/* Logo row */}
      <div style={{
        display: 'flex', alignItems: 'center', height: '56px', flexShrink: 0,
        padding: collapsed ? '0' : '0 16px',
        justifyContent: collapsed ? 'center' : 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0, background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(99,102,241,0.45)' }}>
            <Zap style={{ width: '15px', height: '15px', color: '#fff' }} />
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.03em', lineHeight: 1 }}>LedgerFlow</p>
              <p style={{ fontSize: '10px', color: '#374151', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{company?.name ?? 'Your Company'}</p>
            </div>
          )}
        </div>
        {showToggle && (
          <button onClick={onToggleCollapse}
            style={{ width: '24px', height: '24px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#374151', transition: 'all 0.15s', flexShrink: 0 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#9ca3af'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#374151'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
          >
            {collapsed ? <PanelLeftOpen style={SZ} /> : <PanelLeftClose style={SZ} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '12px 8px' : '12px 10px', display: 'flex', flexDirection: 'column' }}>
        {nav.map((section) => (
          <div key={section.section} style={{ marginBottom: '8px' }}>
            {!collapsed
              ? <p style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#1f2937', padding: '6px 10px 4px' }}>{section.section}</p>
              : <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
            }
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {section.items.map((item, i) =>
                isGroup(item)
                  ? <NavGroup key={i} item={item} collapsed={collapsed} />
                  : <NavLeaf  key={i} item={item as LeafItem} collapsed={collapsed} />
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: collapsed ? '12px 8px' : '12px 10px', flexShrink: 0 }}>
        {!collapsed ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '6px' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '9px', flexShrink: 0, background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.06))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>{initials}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{ fontSize: '12px', fontWeight: 600, color: '#e5e7eb', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>{authUser?.displayName ?? 'User'}</p>
              <p style={{ fontSize: '10px', color: '#374151', textTransform: 'capitalize', marginTop: '1px' }}>{authUser?.role ?? 'Member'}</p>
            </div>
          </div>
        ) : (
          <div style={{ width: '30px', height: '30px', borderRadius: '9px', margin: '0 auto 6px', background: 'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(99,102,241,0.06))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: '#818cf8' }}>{initials}</div>
        )}
        <button onClick={logOut} title="Sign Out"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: collapsed ? '8px 0' : '8px 10px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: '9px', background: 'transparent', border: 'none', color: '#374151', cursor: 'pointer', fontSize: '12px', fontWeight: 500, transition: 'all 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'; (e.currentTarget as HTMLElement).style.color = '#f87171'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#374151'; }}
        >
          <LogOut style={{ ...SZ, flexShrink: 0 }} />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </>
  );
}

/* ─── AppLayout ──────────────────────────────────────── */
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const handle = (e: MediaQueryListEvent | MediaQueryList) => {
      setIsMobile(e.matches);
      if (e.matches) setMobileOpen(false);
    };
    handle(mq);
    mq.addEventListener('change', handle);
    return () => mq.removeEventListener('change', handle);
  }, []);

  // Close mobile drawer on route change.
  // The ref is synced after every render (inside an effect, not during render)
  // so reading it inside the pathname effect is always accurate.
  const mobileOpenRef = useRef(false);
  useEffect(() => {
    mobileOpenRef.current = mobileOpen;
  });

  const pathname = usePathname();
  useEffect(() => {
    if (mobileOpenRef.current) {
      setMobileOpen(false);
    }
  }, [pathname]);

  const sidebarW = collapsed ? 64 : 232;

  return (
    <>
      <style>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.18); border-radius: 4px; }
      `}</style>

      <div style={{ display: 'flex', height: '100dvh', overflow: 'hidden', background: '#07070f' }}>

        {/* ── DESKTOP SIDEBAR ── */}
        {!isMobile && (
          <aside style={{
            width: sidebarW, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            background: 'linear-gradient(180deg, rgba(10,10,15,0.98) 0%, rgba(8,8,12,0.99) 100%)',
            borderRight: '1px solid rgba(255,255,255,0.05)',
            transition: 'width 0.22s cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden', zIndex: 50, position: 'relative',
          }}>
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '1px', background: 'linear-gradient(180deg, transparent, rgba(99,102,241,0.12) 30%, rgba(99,102,241,0.12) 70%, transparent)', pointerEvents: 'none' }} />
            <SidebarInner collapsed={collapsed} onToggleCollapse={() => setCollapsed(c => !c)} showToggle />
          </aside>
        )}

        {/* ── MOBILE OVERLAY + DRAWER ── */}
        {isMobile && mobileOpen && (
          <>
            <div onClick={() => setMobileOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} />
            <aside style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: 232, zIndex: 50,
              display: 'flex', flexDirection: 'column',
              background: 'rgba(10,10,15,0.99)',
              borderRight: '1px solid rgba(99,102,241,0.10)',
              animation: 'slideInLeft 0.25s cubic-bezier(0.16,1,0.3,1)',
            }}>
              <button onClick={() => setMobileOpen(false)} style={{ position: 'absolute', top: '14px', right: '14px', zIndex: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#6b7280', display: 'flex' }}>
                <X style={{ width: '14px', height: '14px' }} />
              </button>
              <SidebarInner collapsed={false} showToggle={false} />
            </aside>
          </>
        )}

        {/* ── MAIN AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Mobile topbar */}
          {isMobile && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '12px', height: '56px',
              padding: '0 16px', flexShrink: 0,
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              background: 'rgba(10,10,15,0.97)', backdropFilter: 'blur(20px)',
            }}>
              <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: '4px', display: 'flex' }}>
                <Menu style={{ width: '18px', height: '18px' }} />
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 10px rgba(99,102,241,0.4)' }}>
                  <Zap style={{ width: '11px', height: '11px', color: '#fff' }} />
                </div>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.03em' }}>LedgerFlow</span>
              </div>
            </div>
          )}

          <main style={{ flex: 1, overflowY: 'auto' }}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}

/* ─── PageHeader ─────────────────────────────────────── */
export function PageHeader({ title, subtitle, action, icon }: {
  title: string; subtitle?: string; action?: React.ReactNode; icon?: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', gap: '12px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        {icon && (
          <div style={{ width: '36px', height: '36px', borderRadius: '10px', flexShrink: 0, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8', marginTop: '2px' }}>
            {icon}
          </div>
        )}
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f9fafb', letterSpacing: '-0.03em', lineHeight: 1.2 }}>{title}</h1>
          {subtitle && <p style={{ fontSize: '12px', color: '#374151', marginTop: '4px', letterSpacing: '0.01em' }}>{subtitle}</p>}
        </div>
      </div>
      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}