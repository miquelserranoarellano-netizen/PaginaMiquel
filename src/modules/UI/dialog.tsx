/**
 * Diálogos propios (preguntar un texto, confirmar una acción). Sustituyen a
 * window.prompt/confirm, que no funcionan en Electron ni dentro de marcos
 * con sandbox (por ejemplo, la página publicada).
 */
import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { Button } from './controls';

interface PromptRequest {
  kind: 'prompt';
  title: string;
  message?: string;
  label?: string;
  defaultValue?: string;
  confirmText?: string;
  resolve: (v: string | null) => void;
}

interface ConfirmRequest {
  kind: 'confirm';
  title: string;
  message?: string;
  confirmText?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
}

type Request = PromptRequest | ConfirmRequest;

const useDialogStore = create<{ current: Request | null; open: (r: Request) => void; close: () => void }>()((set) => ({
  current: null,
  open: (r) => set({ current: r }),
  close: () => set({ current: null }),
}));

export const dialog = {
  prompt(opts: Omit<PromptRequest, 'kind' | 'resolve'>): Promise<string | null> {
    return new Promise((resolve) => useDialogStore.getState().open({ ...opts, kind: 'prompt', resolve }));
  },
  confirm(opts: Omit<ConfirmRequest, 'kind' | 'resolve'>): Promise<boolean> {
    return new Promise((resolve) => useDialogStore.getState().open({ ...opts, kind: 'confirm', resolve }));
  },
};

export function DialogHost() {
  const req = useDialogStore((s) => s.current);
  const close = useDialogStore((s) => s.close);
  const [value, setValue] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const confirmBtn = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!req) return;
    setValue(req.kind === 'prompt' ? (req.defaultValue ?? '') : '');
    const t = setTimeout(() => {
      if (req.kind === 'prompt') input.current?.select();
      else confirmBtn.current?.querySelector('button')?.focus();
    }, 30);
    return () => clearTimeout(t);
  }, [req]);

  if (!req) return null;
  const cancel = () => {
    if (req.kind === 'prompt') req.resolve(null);
    else req.resolve(false);
    close();
  };
  const accept = () => {
    if (req.kind === 'prompt') {
      const v = value.trim();
      if (!v) return;
      req.resolve(v);
    } else req.resolve(true);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/40 p-4 backdrop-blur-[2px] sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && cancel()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') cancel();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="hd-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          accept();
        }}
      >
        <h2 id="hd-dialog-title" className="text-[15px] font-semibold text-slate-900">
          {req.title}
        </h2>
        {req.message && <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{req.message}</p>}
        {req.kind === 'prompt' && (
          <label className="mt-4 block">
            {req.label && <span className="mb-1 block text-[12px] text-slate-500">{req.label}</span>}
            <input
              id="hd-dialog-input"
              ref={input}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-[14px] outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-100"
            />
          </label>
        )}
        <div ref={confirmBtn} className="mt-5 flex justify-end gap-2">
          <Button onClick={cancel}>Cancelar</Button>
          <Button type="submit" variant={req.kind === 'confirm' && req.danger ? 'danger' : 'primary'} disabled={req.kind === 'prompt' && !value.trim()}>
            {req.confirmText ?? (req.kind === 'prompt' ? 'Aceptar' : 'Confirmar')}
          </Button>
        </div>
      </form>
    </div>
  );
}
