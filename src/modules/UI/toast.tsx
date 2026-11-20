import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { cx } from './controls';

export type ToastKind = 'info' | 'success' | 'error';
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

interface ToastState {
  toasts: Toast[];
  push: (kind: ToastKind, message: string) => void;
  dismiss: (id: number) => void;
}

let next = 1;

export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (kind, message) => {
    const id = next++;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { id, kind, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), kind === 'error' ? 7000 : 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (m: string) => useToasts.getState().push('info', m),
  success: (m: string) => useToasts.getState().push('success', m),
  error: (m: string) => useToasts.getState().push('error', m),
};

export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div className="pointer-events-none fixed bottom-12 left-1/2 z-50 flex w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 flex-col items-center gap-2 max-[900px]:bottom-28">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cx(
            'pointer-events-auto flex max-w-md items-center gap-2.5 rounded-lg border bg-white px-3.5 py-2.5 text-[12.5px] shadow-lg',
            t.kind === 'error' ? 'border-red-200 text-red-700' : t.kind === 'success' ? 'border-accent-200 text-slate-700' : 'border-slate-200 text-slate-700',
          )}
        >
          {t.kind === 'error' ? <AlertTriangle size={16} /> : t.kind === 'success' ? <CheckCircle2 size={16} className="text-accent-600" /> : <Info size={16} className="text-sky-600" />}
          <span>{t.message}</span>
          <button type="button" className="ml-1 text-slate-400 hover:text-slate-700" onClick={() => dismiss(t.id)} aria-label="Cerrar">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
