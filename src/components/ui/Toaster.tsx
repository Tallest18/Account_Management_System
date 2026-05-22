'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Toast { id: string; type: 'success' | 'error' | 'warning' | 'info'; message: string; }
interface ToastCtx { toast: (type: Toast['type'], message: string) => void; }

const ToastContext = createContext<ToastCtx | null>(null);

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((p) => [...p, { id, type, message }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000);
  }, []);

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-[--green]" />,
    error: <XCircle className="w-4 h-4 text-[--red]" />,
    warning: <AlertTriangle className="w-4 h-4 text-[--yellow]" />,
    info: <Info className="w-4 h-4 text-[--accent-2]" />,
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl animate-slide-up pointer-events-auto max-w-sm',
              'bg-[--bg-2] border-[--border]'
            )}
          >
            {icons[t.type]}
            <span className="text-sm text-[--text] flex-1">{t.message}</span>
            <button
              onClick={() => setToasts((p) => p.filter((x) => x.id !== t.id))}
              className="text-[--text-3] hover:text-[--text] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  // Fallback if context not found (Toaster wraps entire app)
  return ctx ?? {
    toast: (type: string, message: string) => console.log(`[${type}] ${message}`)
  };
}
