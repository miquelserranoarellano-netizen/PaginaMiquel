/**
 * Componentes de formulario reutilizables (campos numéricos con validación,
 * selectores, interruptores, secciones…).
 */
import { type ReactNode, useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { formatNumber, parseLength } from '@/core/units';

export function cx(...c: (string | false | null | undefined)[]): string {
  return c.filter(Boolean).join(' ');
}

export function Section({ title, children, actions, defaultOpen = true }: { title: string; children: ReactNode; actions?: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-slate-200/80 last:border-b-0">
      <header className="flex items-center justify-between px-4 py-2.5">
        <button type="button" className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700" onClick={() => setOpen(!open)}>
          <ChevronDown size={13} className={cx('transition-transform', !open && '-rotate-90')} />
          {title}
        </button>
        {actions}
      </header>
      {open && <div className="space-y-2.5 px-4 pb-4">{children}</div>}
    </section>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="grid grid-cols-[96px_1fr] items-center gap-2">
      <span className="truncate text-[12px] text-slate-500" title={hint ?? label}>
        {label}
      </span>
      <div className="min-w-0">{children}</div>
    </label>
  );
}

const inputBase =
  'h-7 w-full rounded-md border bg-white px-2 text-[12.5px] text-slate-800 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-100';

interface NumberFieldProps {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  /** Paso de flechas y botones (5 cm en longitudes, 0,01 en el resto). */
  step?: number;
  /** Decimales mostrados. */
  digits?: number;
  unit?: string;
  /** Acepta "350cm", "3,5 m"... (para longitudes). */
  length?: boolean;
  disabled?: boolean;
  title?: string;
}

/**
 * Campo numérico con validación. Aplica el valor mientras se escribe (con una
 * breve pausa), al salir del campo o con Enter; Esc cancela; flechas ↑/↓
 * incrementan (Mayús ×10). En pantallas táctiles muestra botones − y +.
 */
export function NumberField({ value, onChange, min = -Infinity, max = Infinity, step: stepProp, digits = 2, unit, length, disabled, title }: NumberFieldProps) {
  // Las longitudes avanzan de 5 en 5 cm con las flechas y los botones − / +.
  const step = stepProp ?? (length ? 0.05 : 0.01);
  const [text, setText] = useState(() => formatNumber(value, digits));
  const [error, setError] = useState<string | null>(null);
  const focused = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const valueRef = useRef(value);
  valueRef.current = value;
  const touch = useTouchControls();

  useEffect(() => {
    if (!focused.current) setText(formatNumber(value, digits));
  }, [value, digits]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const parse = (s: string): number | null => {
    if (length) return parseLength(s);
    const n = parseFloat(s.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  };

  const validate = (s: string): number | null => {
    const n = parse(s);
    if (n === null) {
      setError('Escribe un número, por ejemplo 1,20');
      return null;
    }
    if (n < min || n > max) {
      setError(`Debe estar entre ${formatNumber(min, digits)} y ${formatNumber(max, digits)}${unit ? ' ' + unit : ''}`);
      return null;
    }
    setError(null);
    return n;
  };

  const commit = (s: string, reformat = true) => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const n = validate(s);
    if (n === null) return;
    if (Math.abs(n - valueRef.current) > 1e-9) onChange(n);
    if (reformat) setText(formatNumber(n, digits));
  };

  const nudge = (dir: 1 | -1, big = false) => {
    const cur = parse(text) ?? value;
    const n = Math.round(Math.min(max, Math.max(min, cur + dir * step * (big ? 10 : 1))) * 1e6) / 1e6;
    setText(formatNumber(n, digits));
    setError(null);
    onChange(n);
  };

  const input = (
    <div className="relative min-w-0 flex-1">
      <input
        type="text"
        inputMode="decimal"
        enterKeyHint="done"
        disabled={disabled}
        title={error ?? title}
        className={cx(inputBase, 'pr-8 tabular-nums', error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200', disabled && 'bg-slate-50 text-slate-400')}
        value={text}
        onFocus={(e) => {
          focused.current = true;
          e.currentTarget.select();
        }}
        onBlur={(e) => {
          focused.current = false;
          commit(e.currentTarget.value);
        }}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          // Se aplica tras una pausa al escribir (en el móvil no hay tecla Intro).
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => commit(v, false), 700);
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            commit(e.currentTarget.value);
            e.currentTarget.blur();
          } else if (e.key === 'Escape') {
            if (timer.current) clearTimeout(timer.current);
            setText(formatNumber(value, digits));
            setError(null);
            e.currentTarget.blur();
          } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            nudge(e.key === 'ArrowUp' ? 1 : -1, e.shiftKey);
          }
        }}
      />
      {unit && <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-slate-400">{unit}</span>}
    </div>
  );

  return (
    <div>
      {touch && !disabled ? (
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Menos" onClick={() => nudge(-1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[18px] text-slate-600 active:bg-slate-100">
            −
          </button>
          {input}
          <button type="button" aria-label="Más" onClick={() => nudge(1)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-[18px] text-slate-600 active:bg-slate-100">
            +
          </button>
        </div>
      ) : (
        input
      )}
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

/** Controles táctiles (botones − / +) en dispositivos con puntero grueso. */
function useTouchControls(): boolean {
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches);
  useEffect(() => {
    const m = window.matchMedia?.('(pointer: coarse)');
    if (!m) return;
    const on = () => setTouch(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return touch;
}

export function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <input
      type="text"
      className={cx(inputBase, 'border-slate-200')}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() && text !== value && onChange(text.trim())}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setText(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

export function SelectField<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <select className={cx(inputBase, 'border-slate-200 pr-6')} value={value} onChange={(e) => onChange(e.target.value as T)} onKeyDown={(e) => e.stopPropagation()}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  const id = useId();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx('relative h-[18px] w-8 shrink-0 rounded-full transition-colors', checked ? 'bg-accent-600' : 'bg-slate-300')}
      >
        <span className={cx('absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white shadow transition-all', checked ? 'left-[16px]' : 'left-[2px]')} />
      </button>
      {label && (
        <label htmlFor={id} className="cursor-pointer text-[12.5px] text-slate-600">
          {label}
        </label>
      )}
    </span>
  );
}

export function Segmented<T extends string>({ value, onChange, options, size = 'sm' }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; size?: 'sm' | 'md' }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex items-center gap-1.5 rounded-md font-medium transition',
            size === 'md' ? 'px-3 py-1.5 text-[12.5px]' : 'px-2.5 py-1 text-[12px]',
            value === o.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  children,
  onClick,
  variant = 'default',
  title,
  disabled,
  className,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'primary' | 'ghost' | 'danger';
  title?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-[12.5px] font-medium transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'bg-accent-600 text-white shadow-sm hover:bg-accent-700',
        variant === 'default' && 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
        variant === 'ghost' && 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        variant === 'danger' && 'border border-red-200 bg-white text-red-600 hover:bg-red-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function IconButton({ children, onClick, title, active, disabled, className }: { children: ReactNode; onClick?: () => void; title: string; active?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        'inline-flex h-8 w-8 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-35',
        active ? 'bg-accent-50 text-accent-700 ring-1 ring-accent-200' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[12.5px]">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

export function Slider({ value, onChange, min, max, step, format }: { value: number; onChange: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string }) {
  return (
    <div className="flex items-center gap-2">
      <input type="range" className="h-1 w-full cursor-pointer" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} />
      <span className="w-12 shrink-0 text-right text-[11.5px] tabular-nums text-slate-500">{format ? format(value) : formatNumber(value, 2)}</span>
    </div>
  );
}
