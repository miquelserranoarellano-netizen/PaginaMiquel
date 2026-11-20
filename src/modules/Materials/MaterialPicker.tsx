import { useState } from 'react';
import { Check } from 'lucide-react';
import { isValidHex } from '@/core/color';
import type { SurfaceMaterial } from '@/modules/FloorPlan/types';
import { cx } from '@/modules/UI/controls';
import { COLOR_SWATCHES, type MaterialCategory, getMaterialDef, materialsForCategory } from './library';
import { materialPreview } from './preview';

const CATEGORY_TABS: { value: MaterialCategory | 'todos'; label: string }[] = [
  { value: 'suelo', label: 'Suelos' },
  { value: 'pared', label: 'Paredes' },
  { value: 'madera', label: 'Madera' },
  { value: 'piedra', label: 'Piedra' },
  { value: 'metal', label: 'Metal' },
  { value: 'tela', label: 'Tejidos' },
  { value: 'vidrio', label: 'Vidrio' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'todos', label: 'Todos' },
];

export function MaterialSwatch({ value, size = 28, className }: { value: SurfaceMaterial; size?: number; className?: string }) {
  const def = getMaterialDef(value.materialId);
  return (
    <span
      className={cx('inline-block shrink-0 rounded-md border border-black/10 bg-cover bg-center shadow-inner', className)}
      style={{ width: size, height: size, backgroundColor: value.color, backgroundImage: `url(${materialPreview(def, value.color)})` }}
    />
  );
}

/**
 * Selector de material + color. Se despliega dentro del panel de propiedades.
 */
export function MaterialPicker({ label, value, onChange, category = 'todos' }: { label: string; value: SurfaceMaterial; onChange: (v: SurfaceMaterial) => void; category?: MaterialCategory | 'todos' }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<MaterialCategory | 'todos'>(category);
  const def = getMaterialDef(value.materialId);
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center gap-2.5 px-2 py-1.5 text-left hover:bg-slate-50">
        <MaterialSwatch value={value} />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-slate-500">{label}</span>
          <span className="block truncate text-[12.5px] font-medium text-slate-800">{def.name}</span>
        </span>
        <span className="text-[11px] text-accent-700">{open ? 'Cerrar' : 'Cambiar'}</span>
      </button>
      {open && (
        <div className="space-y-2.5 border-t border-slate-100 p-2">
          <div className="flex flex-wrap gap-1">
            {CATEGORY_TABS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTab(t.value)}
                className={cx('rounded-full px-2 py-0.5 text-[11px]', tab === t.value ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="grid max-h-56 grid-cols-4 gap-1.5 overflow-y-auto pr-1 thin-scroll">
            {materialsForCategory(tab).map((m) => {
              const active = m.id === value.materialId;
              return (
                <button
                  key={m.id}
                  type="button"
                  title={m.name}
                  onClick={() => onChange({ materialId: m.id, color: m.id === value.materialId ? value.color : m.color })}
                  className={cx('group relative flex flex-col items-center gap-1 rounded-md p-1 text-center hover:bg-slate-50', active && 'bg-accent-50 ring-1 ring-accent-300')}
                >
                  <MaterialSwatch value={{ materialId: m.id, color: m.color }} size={40} />
                  <span className="line-clamp-2 text-[10px] leading-tight text-slate-600">{m.name}</span>
                  {active && <Check size={12} className="absolute right-1 top-1 text-accent-700" />}
                </button>
              );
            })}
          </div>
          <div>
            <div className="mb-1 text-[11px] text-slate-500">Color</div>
            <div className="flex flex-wrap gap-1">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  title={c}
                  onClick={() => onChange({ ...value, color: c })}
                  className={cx('h-5 w-5 rounded border border-black/10', value.color.toLowerCase() === c && 'ring-2 ring-accent-500 ring-offset-1')}
                  style={{ backgroundColor: c }}
                />
              ))}
              <label className="relative h-5 w-5 cursor-pointer overflow-hidden rounded border border-dashed border-slate-400" title="Color personalizado">
                <input type="color" className="absolute -inset-2 h-9 w-9 cursor-pointer opacity-0" value={isValidHex(value.color) ? value.color : '#ffffff'} onChange={(e) => onChange({ ...value, color: e.target.value })} />
                <span className="pointer-events-none flex h-full w-full items-center justify-center text-[12px] leading-none text-slate-500">+</span>
              </label>
              <button type="button" className="ml-auto text-[11px] text-slate-500 hover:text-slate-800" onClick={() => onChange({ ...value, color: def.color })}>
                Original
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
