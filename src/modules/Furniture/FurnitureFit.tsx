import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import type { FurnitureItem, ProjectDoc } from '@/modules/FloorPlan/types';
import { Field, NumberField, Section, Toggle, cx } from '@/modules/UI/controls';
import { projectApi } from '@/store/projectStore';
import { analyzeFurniture } from './analysis';
import { getCatalogItem } from './catalog';
import { TV_BEZEL, TV_STAND_H, pint, resolveParams, tvScreen } from './params';
import type { CatalogItem, ParamValue } from './types';

const TV_QUICK = [43, 50, 55, 65, 75, 85];

/** Altura del centro de la pantalla desde el suelo. */
function tvCenter(item: FurnitureItem, catalogId: string): number {
  const inches = pint(resolveParams(getCatalogItem(catalogId), item.params), 'inches', 55, 24, 110);
  return Math.round((item.elevation + (catalogId === 'tv-55' ? TV_STAND_H : 0) + TV_BEZEL + tvScreen(inches).h / 2) * 1000) / 1000;
}

/** Aplica un cambio de parámetros y recalcula las medidas derivadas (manteniendo el centro). */
export function setFurnitureParam(id: string, key: string, value: ParamValue) {
  projectApi.apply((d) => {
    const f = d.furniture[id];
    const cat = getCatalogItem(f.catalogId);
    if (!cat) return;
    const params = { ...resolveParams(cat, f.params), [key]: value };
    f.params = params;
    if (cat.derive) {
      const dims = cat.derive(params, { w: f.width, d: f.depth, h: f.height });
      if (dims.w !== undefined) f.width = dims.w;
      if (dims.d !== undefined) f.depth = dims.d;
      if (dims.h !== undefined) f.height = dims.h;
    }
    if (key === 'inches' && /^Televisor/.test(f.name)) f.name = `Televisor ${value}"${cat.id === 'tv-65-wall' ? ' de pared' : ''}`;
  });
}

/** Medidas que no se pueden editar a mano porque dependen de la configuración. */
export function derivedKeys(cat: CatalogItem | undefined, f: FurnitureItem): Set<'w' | 'd' | 'h'> {
  if (!cat?.derive) return new Set();
  return new Set(Object.keys(cat.derive(resolveParams(cat, f.params), { w: f.width, d: f.depth, h: f.height })) as ('w' | 'd' | 'h')[]);
}

export function FurnitureConfig({ item }: { item: FurnitureItem }) {
  const cat = getCatalogItem(item.catalogId);
  if (!cat?.params?.length) return null;
  const p = resolveParams(cat, item.params);
  const isTv = cat.params.some((d) => d.key === 'inches');
  return (
    <Section title="Configuración">
      {isTv && (
        <div className="flex flex-wrap gap-1">
          {TV_QUICK.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setFurnitureParam(item.id, 'inches', n)}
              className={cx('rounded-md border px-2 py-1 text-[11.5px] font-medium', p.inches === n ? 'border-accent-300 bg-accent-50 text-accent-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50')}
            >
              {n}"
            </button>
          ))}
        </div>
      )}
      {isTv && (
        <Field label="Centro a" hint="Altura del centro de la pantalla desde el suelo (sentado se ve mejor entre 1,0 y 1,15 m)">
          <NumberField
            value={tvCenter(item, cat.id)}
            min={0.3}
            max={3}
            step={0.05}
            unit="m"
            length
            onChange={(v) => projectApi.apply((d) => void (d.furniture[item.id].elevation = Math.max(0, Math.round((v - (tvCenter(item, cat.id) - item.elevation)) * 1000) / 1000)))}
          />
        </Field>
      )}
      {cat.params.map((def) =>
        def.kind === 'bool' ? (
          <Field key={def.key} label={def.label}>
            <Toggle checked={Boolean(p[def.key])} onChange={(v) => setFurnitureParam(item.id, def.key, v)} />
          </Field>
        ) : (
          <Field key={def.key} label={def.label} hint={def.hint}>
            <NumberField
              value={Number(p[def.key])}
              min={def.min}
              max={def.max}
              step={def.step ?? 1}
              digits={def.kind === 'int' ? 0 : 2}
              unit={def.unit}
              length={def.unit === 'm'}
              onChange={(v) => setFurnitureParam(item.id, def.key, def.kind === 'int' ? Math.round(v) : v)}
            />
          </Field>
        ),
      )}
    </Section>
  );
}

const ICON = {
  ok: <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-accent-600" />,
  warn: <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-500" />,
  info: <Info size={15} className="mt-0.5 shrink-0 text-sky-600" />,
};

/** "¿Cómo queda?": medidas calculadas y comprobaciones en su sitio. */
export function FurnitureFit({ doc, item }: { doc: ProjectDoc; item: FurnitureItem }) {
  const a = analyzeFurniture(doc, item);
  if (!a.facts.length && !a.findings.length) return null;
  return (
    <Section title="¿Cómo queda?">
      {a.facts.length > 0 && (
        <div className="space-y-1 rounded-lg bg-slate-50 p-2.5">
          {a.facts.map((f) => (
            <div key={f.label} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-slate-500">{f.label}</span>
              <span className="text-right font-medium tabular-nums text-slate-800">{f.value}</span>
            </div>
          ))}
        </div>
      )}
      <ul className="space-y-2">
        {a.findings.map((f, i) => (
          <li key={i} className="flex gap-2 text-[12px] leading-snug">
            {ICON[f.level]}
            <span>
              <span className="font-medium text-slate-800">{f.title}</span>
              {f.detail && <span className="block text-slate-500">{f.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
