import { Copy, RotateCw } from 'lucide-react';
import { LIMITS } from '@/modules/FloorPlan/defaults';
import type { FurnitureItem } from '@/modules/FloorPlan/types';
import { duplicateElements } from '@/modules/FloorPlan/queries';
import { MaterialPicker } from '@/modules/Materials/MaterialPicker';
import { DeleteSection } from '@/modules/Walls/WallProperties';
import { Button, Field, NumberField, Section, Slider, TextField, Toggle } from '@/modules/UI/controls';
import { normalizeDeg } from '@/core/units';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { CATEGORY_LABELS } from './types';
import { getCatalogItem } from './catalog';
import { fitFullHeight } from './ceiling';
import { FurnitureConfig, FurnitureFit, derivedKeys } from './FurnitureFit';
import { useProjectStore } from '@/store/projectStore';

export function FurnitureProperties({ item }: { item: FurnitureItem }) {
  const id = item.id;
  const cat = getCatalogItem(item.catalogId);
  const set = (fn: (f: FurnitureItem) => void) => projectApi.apply((d) => fn(d.furniture[id]));
  const S = LIMITS.furnitureSize;
  const doc = useProjectStore((st) => st.doc);
  const derived = derivedKeys(cat, item);
  const auto = 'Se calcula a partir de la configuración';
  return (
    <>
      <Section title={cat ? CATEGORY_LABELS[cat.category] : 'Objeto'}>
        <Field label="Nombre">
          <TextField value={item.name} onChange={(v) => set((f) => (f.name = v))} />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="text-[11px] text-slate-500">Posición X</span>
            <NumberField value={item.position.x} unit="m" length onChange={(v) => set((f) => (f.position = { ...f.position, x: v }))} />
          </label>
          <label className="space-y-1">
            <span className="text-[11px] text-slate-500">Posición Y</span>
            <NumberField value={item.position.y} unit="m" length onChange={(v) => set((f) => (f.position = { ...f.position, y: v }))} />
          </label>
        </div>
        <Field label="Rotación">
          <div className="flex gap-1.5">
            <NumberField value={item.rotation} min={-360} max={720} step={15} digits={1} unit="°" onChange={(v) => set((f) => (f.rotation = normalizeDeg(v)))} />
            <Button title="Girar 90°" className="px-2" onClick={() => set((f) => (f.rotation = normalizeDeg(f.rotation + 90)))}>
              <RotateCw size={14} />
            </Button>
          </div>
        </Field>
      </Section>
      <FurnitureConfig item={item} />
      <Section title="Dimensiones">
        <Field label="Ancho" hint={derived.has('w') ? auto : undefined}>
          <NumberField value={item.width} min={S.min} max={S.max} unit="m" length disabled={derived.has('w')} title={derived.has('w') ? auto : undefined} onChange={(v) => set((f) => (f.width = v))} />
        </Field>
        <Field label="Fondo" hint={derived.has('d') ? auto : undefined}>
          <NumberField value={item.depth} min={S.min} max={S.max} unit="m" length disabled={derived.has('d')} title={derived.has('d') ? auto : undefined} onChange={(v) => set((f) => (f.depth = v))} />
        </Field>
        <Field label="Alto" hint={derived.has('h') ? auto : undefined}>
          <NumberField value={item.height} min={S.min} max={S.max} unit="m" length disabled={derived.has('h')} title={derived.has('h') ? auto : undefined} onChange={(v) => set((f) => (f.height = v))} />
        </Field>
        {cat?.fullHeight && (
          <button type="button" className="text-[11.5px] text-accent-700 hover:underline" onClick={() => projectApi.apply((d) => void fitFullHeight(d, d.furniture[id], true))}>
            Ajustar al techo (de suelo a techo)
          </button>
        )}
        <Field label="Desde el suelo" hint="Altura a la que está la base del objeto (0 = apoyado en el suelo)">
          <NumberField value={item.elevation} min={0} max={20} step={0.05} unit="m" length onChange={(v) => set((f) => (f.elevation = v))} />
        </Field>
        {cat && !cat.derive && (
          <button
            type="button"
            className="text-[11.5px] text-accent-700 hover:underline"
            onClick={() =>
              set((f) => {
                f.width = cat.w;
                f.depth = cat.d;
                f.height = cat.h;
              })
            }
          >
            Restablecer medidas originales
          </button>
        )}
      </Section>
      <FurnitureFit doc={doc} item={item} />
      {item.light && (
        <Section title="Luz">
          <Field label="Encendida">
            <Toggle checked={item.light.on} onChange={(v) => set((f) => f.light && (f.light.on = v))} />
          </Field>
          <Field label="Intensidad">
            <Slider value={item.light.intensity} min={0} max={3} step={0.05} onChange={(v) => set((f) => f.light && (f.light.intensity = v))} />
          </Field>
          <Field label="Color de luz">
            <input type="color" className="h-7 w-full cursor-pointer rounded-md border border-slate-200 bg-white" value={item.light.color} onChange={(e) => set((f) => f.light && (f.light.color = e.target.value))} />
          </Field>
        </Section>
      )}
      {cat && Object.keys(cat.slots).length > 0 && (
        <Section title="Materiales">
          {Object.entries(cat.slots).map(([slot, def]) => (
            <MaterialPicker key={slot} label={def.label} value={item.materials[slot] ?? def} onChange={(m) => set((f) => (f.materials[slot] = m))} />
          ))}
        </Section>
      )}
      <div className="px-4 pt-4">
        <Button
          className="w-full"
          onClick={() => {
            let refs: ReturnType<typeof duplicateElements> = [];
            projectApi.apply((d) => {
              refs = duplicateElements(d, [{ kind: 'furniture', id }], { x: 0.3, y: 0.3 });
            });
            useEditorStore.getState().select(refs);
          }}
        >
          <Copy size={14} /> Duplicar
        </Button>
      </div>
      <DeleteSection label="Eliminar objeto" refs={[{ kind: 'furniture', id }]} />
    </>
  );
}
