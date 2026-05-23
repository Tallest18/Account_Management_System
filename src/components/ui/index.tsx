'use client';
import React from 'react';

// ── cn helper ────────────────────────────────────────────────────────────────
export function cn(...classes: (string | undefined | false | null)[]) {
  return classes.filter(Boolean).join(' ');
}

// ── Button ───────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}
export function Button({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, style, ...props }: ButtonProps) {
  const sizes: Record<string, string> = { sm: 'px-3 py-1.5 text-xs gap-1.5', md: 'px-4 py-2 text-sm gap-2', lg: 'px-6 py-3 text-base gap-2' };
  const base = `inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-150 ${sizes[size]}`;
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'linear-gradient(135deg,#3b82f6,#6366f1)', color: 'white', boxShadow: '0 2px 12px rgba(59,130,246,0.3)' },
    secondary: { background: 'var(--bg-3)', color: 'var(--text)', border: '1.5px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-2)' },
    danger: { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.3)' },
  };
  return (
    <button className={cn(base, 'disabled:opacity-40 disabled:cursor-not-allowed', className)}
      disabled={disabled || loading}
      style={{ ...variants[variant], ...style }}
      {...props}>
      {loading ? (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
      ) : icon}
      {children}
    </button>
  );
}

// ── Badge ────────────────────────────────────────────────────────────────────
const badgeStyles: Record<string, React.CSSProperties> = {
  default: { background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)' },
  green:   { background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.25)' },
  red:     { background: 'var(--red-bg)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.25)' },
  yellow:  { background: 'var(--yellow-bg)', color: 'var(--yellow)', border: '1px solid rgba(245,158,11,0.25)' },
  purple:  { background: 'var(--purple-bg)', color: 'var(--purple)', border: '1px solid rgba(139,92,246,0.25)' },
  blue:    { background: 'var(--accent-glow)', color: 'var(--accent-h)', border: '1px solid rgba(59,130,246,0.25)' },
};
export function Badge({ variant = 'default', children, className }: { variant?: string; children: React.ReactNode; className?: string }) {
  return <span className={cn('badge', className)} style={badgeStyles[variant] ?? badgeStyles.default}>{children}</span>;
}

// ── Input ────────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; icon?: React.ReactNode;
}
export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'var(--text-3)' }}>{icon}</span>}
        <input className={cn('input-field', icon && 'pl-10', error && 'border-[--red]', className)}
          style={error ? { borderColor: 'var(--red)' } : {}} {...props} />
      </div>
      {error && <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}

// ── Select ───────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string; error?: string; options: { value: string; label: string }[];
}
export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>{label}</label>}
      <select className={cn('input-field', className)} style={error ? { borderColor: 'var(--red)' } : {}} {...props}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}

// ── Textarea ──────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string;
}
export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-2)' }}>{label}</label>}
      <textarea className={cn('input-field resize-none', className)} style={error ? { borderColor: 'var(--red)' } : {}} {...props} />
      {error && <p className="text-xs font-medium" style={{ color: 'var(--red)' }}>{error}</p>}
    </div>
  );
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, size = 'md' }: {
  open: boolean; onClose: () => void; title?: string; children: React.ReactNode; size?: 'sm'|'md'|'lg'|'xl';
}) {
  if (!open) return null;
  const maxW = { sm: '420px', md: '560px', lg: '720px', xl: '900px' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}>
      <div className="card w-full animate-slide-up overflow-hidden" style={{ maxWidth: maxW, boxShadow: '0 25px 60px rgba(0,0,0,0.6)' }}
        onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold" style={{ color: 'var(--text)' }}>{title}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ color: 'var(--text-3)' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.background = 'var(--bg-3)'; (e.target as HTMLElement).style.color = 'var(--text)'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.background = 'transparent'; (e.target as HTMLElement).style.color = 'var(--text-3)'; }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: '80vh' }}>{children}</div>
      </div>
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────────
export function Card({ title, subtitle, action, children, className, padding = true }: {
  title?: React.ReactNode; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; className?: string; padding?: boolean;
}) {
  return (
    <div className={cn('card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div>
            {title && <h3 className="text-sm font-bold" style={{ color: 'var(--text)' }}>{title}</h3>}
            {subtitle && <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg className="animate-spin" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
      <path d="M21 12a9 9 0 11-6.219-8.56"/>
    </svg>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
      {icon && <div className="mb-2" style={{ color: 'var(--text-3)' }}>{icon}</div>}
      <p className="font-semibold" style={{ color: 'var(--text-2)' }}>{title}</p>
      {description && <p className="text-sm max-w-sm" style={{ color: 'var(--text-3)' }}>{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, change, changeLabel, icon, color = 'blue' }: {
  label: string; value: string; change?: number; changeLabel?: string; icon?: React.ReactNode; color?: string;
}) {
  const colors: Record<string, { bg: React.CSSProperties; icon: React.CSSProperties }> = {
    blue:   { bg: { background: 'var(--accent-glow)', border: '1px solid rgba(59,130,246,0.2)' },   icon: { color: 'var(--accent-h)' } },
    green:  { bg: { background: 'var(--green-bg)',   border: '1px solid rgba(16,185,129,0.2)' },    icon: { color: 'var(--green)' } },
    red:    { bg: { background: 'var(--red-bg)',     border: '1px solid rgba(239,68,68,0.2)' },     icon: { color: 'var(--red)' } },
    purple: { bg: { background: 'var(--purple-bg)',  border: '1px solid rgba(139,92,246,0.2)' },    icon: { color: 'var(--purple)' } },
    yellow: { bg: { background: 'var(--yellow-bg)',  border: '1px solid rgba(245,158,11,0.2)' },    icon: { color: 'var(--yellow)' } },
  };
  const c = colors[color] ?? colors.blue;
  const isPos = (change ?? 0) >= 0;
  return (
    <div className="card p-5 transition-all duration-200" style={{ cursor: 'default' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-2)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; }}>
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>{label}</p>
        {icon && (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ ...c.bg }}>
            <span style={c.icon}>{icon}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold tracking-tight" style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</p>
      {change !== undefined && (
        <p className="text-xs mt-2 font-semibold" style={{ color: isPos ? 'var(--green)' : 'var(--red)' }}>
          {isPos ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% {changeLabel ?? 'vs last month'}
        </p>
      )}
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading }: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; message: string; confirmLabel?: string; variant?: 'danger'|'primary'; loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
