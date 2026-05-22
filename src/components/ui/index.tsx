'use client';
import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2, X } from 'lucide-react';

// ─── Button ──────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-[10px] transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const variants = {
    primary: 'bg-[--accent] hover:bg-[--accent-2] text-white shadow-sm',
    secondary: 'bg-[--bg-3] hover:bg-[--border-2] text-[--text] border border-[--border]',
    ghost: 'hover:bg-[--bg-3] text-[--text-2] hover:text-[--text]',
    danger: 'bg-[--red-bg] hover:bg-[--red] text-[--red] hover:text-white border border-[--red]/30',
    success: 'bg-[--green-bg] hover:bg-[--green] text-[--green] hover:text-[--bg] border border-[--green]/30',
  };
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-6 py-3 text-base' };
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : icon}
      {children}
    </button>
  );
}

// ─── Badge ───────────────────────────────────────────────────────────────────
interface BadgeProps {
  variant?: 'default' | 'green' | 'red' | 'yellow' | 'purple' | 'blue';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  const variants = {
    default: 'bg-[--bg-3] text-[--text-2] border border-[--border]',
    green: 'bg-[--green-bg] text-[--green] border border-[--green]/20',
    red: 'bg-[--red-bg] text-[--red] border border-[--red]/20',
    yellow: 'bg-[--yellow-bg] text-[--yellow] border border-[--yellow]/20',
    purple: 'bg-[--purple-bg] text-[--purple] border border-[--purple]/20',
    blue: 'bg-[--accent-glow] text-[--accent-2] border border-[--accent]/20',
  };
  return (
    <span className={cn('badge', variants[variant], className)}>{children}</span>
  );
}

// ─── Input ───────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export function Input({ label, error, icon, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[--text-3]">{icon}</span>}
        <input className={cn('input-field', icon && 'pl-9', error && 'border-[--red]', className)} {...props} />
      </div>
      {error && <p className="text-xs text-[--red]">{error}</p>}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────────────────
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wide">{label}</label>}
      <select className={cn('input-field', error && 'border-[--red]', className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ background: '#161b27' }}>{o.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[--red]">{error}</p>}
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wide">{label}</label>}
      <textarea className={cn('input-field resize-none', error && 'border-[--red]', className)} {...props} />
      {error && <p className="text-xs text-[--red]">{error}</p>}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  if (!open) return null;
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={cn('card w-full animate-slide-up shadow-2xl', sizes[size])}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
            <h2 className="text-base font-bold text-[--text]">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[--bg-3] text-[--text-3] hover:text-[--text] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
interface CardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ title, subtitle, action, children, className, padding = true }: CardProps) {
  return (
    <div className={cn('card card-hover', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-[--border]">
          <div>
            {title && <h3 className="text-sm font-bold text-[--text]">{title}</h3>}
            {subtitle && <p className="text-xs text-[--text-3] mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={padding ? 'p-5' : ''}>{children}</div>
    </div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return <Loader2 className="animate-spin text-[--accent]" style={{ width: size, height: size }} />;
}

// ─── Empty State ─────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {icon && <div className="text-[--text-3] mb-2">{icon}</div>}
      <p className="font-semibold text-[--text-2]">{title}</p>
      {description && <p className="text-sm text-[--text-3] max-w-sm">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
export function StatCard({ label, value, change, changeLabel, icon, color = 'blue' }: {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
}) {
  const colors = {
    blue: { bg: 'bg-[--accent-glow]', text: 'text-[--accent-2]', border: 'border-[--accent]/20' },
    green: { bg: 'bg-[--green-bg]', text: 'text-[--green]', border: 'border-[--green]/20' },
    red: { bg: 'bg-[--red-bg]', text: 'text-[--red]', border: 'border-[--red]/20' },
    purple: { bg: 'bg-[--purple-bg]', text: 'text-[--purple]', border: 'border-[--purple]/20' },
    yellow: { bg: 'bg-[--yellow-bg]', text: 'text-[--yellow]', border: 'border-[--yellow]/20' },
  };
  const c = colors[color];
  const isPositive = (change ?? 0) >= 0;
  return (
    <div className="card card-hover p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-[--text-3] uppercase tracking-wider">{label}</p>
        {icon && (
          <div className={cn('p-2 rounded-lg border', c.bg, c.border)}>
            <span className={c.text}>{icon}</span>
          </div>
        )}
      </div>
      <p className="text-2xl font-bold text-[--text] font-mono">{value}</p>
      {change !== undefined && (
        <p className={cn('text-xs mt-1.5 font-medium', isPositive ? 'text-[--green]' : 'text-[--red]')}>
          {isPositive ? '↑' : '↓'} {Math.abs(change).toFixed(1)}% {changeLabel ?? 'vs last month'}
        </p>
      )}
    </div>
  );
}

// ─── Confirmation Dialog ─────────────────────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', variant = 'danger', loading }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'primary';
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-[--text-2] mb-5">{message}</p>
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button variant={variant} size="sm" onClick={onConfirm} loading={loading}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
