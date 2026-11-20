import { ArrowLeftRight, FlipVertical2 } from 'lucide-react';
import { LIMITS } from '@/modules/FloorPlan/defaults';
import type { Opening, OpeningKind } from '@/modules/FloorPlan/types';
import { MaterialPicker } from '@/modules/Materials/MaterialPicker';
import { wallFrame } from '@/modules/Walls/geometry';
import { clampOpenings } from '@/modules/Walls/ops';
import { DeleteSection } from '@/modules/Walls/WallProperties';
import { Button, Field, NumberField, Section, SelectField } from '@/modules/UI/controls';
import { projectApi } from '@/store/projectStore';
import { OPENING_TYPES, getOpeningDef } from './catalog';

export function OpeningProperties({ opening }: { opening: Opening }) {
  const wall = projectApi.doc.walls[opening.wallId];
  const id = opening.id;
  const len = wall ? wallFrame(wall).length : 0;
  const set = (fn: (o: Opening) => void) =>
    projectApi.apply((d) => {
      fn(d.openings[id]);
      clampOpenings(d, d.openings[id].wallId);
    });
  const def = getOpeningDef(opening.kind);
  const isDoor = def.category === 'puerta';
  const maxH = wall ? wall.height - opening.sill : 6;
  return (
    <>
      <Section title={isDoor ? 'Puerta' : 'Ventana'}>
        <Field label="Tipo">
          <SelectField<OpeningKind>
            value={opening.kind}
            options={OPENING_TYPES.map((o) => ({ value: o.kind, label: o.name }))}
            onChange={(k) =>
              set((o) => {
                const nd = getOpeningDef(k);
                o.kind = k;
                o.width = nd.width;
                o.height = nd.height;
                o.sill = nd.sill;
                o.frame = { ...nd.frame };
                o.panel = { ...nd.panel };
              })
            }
          />
        </Field>
        <Field label="Ancho">
          <NumberField value={opening.width} min={LIMITS.openingWidth.min} max={Math.min(LIMITS.openingWidth.max, len - 0.04)} unit="m" length onChange={(v) => set((o) => (o.width = v))} />
        </Field>
        <Field label="Alto">
          <NumberField value={opening.height} min={LIMITS.openingHeight.min} max={Math.max(LIMITS.openingHeight.min, maxH)} unit="m" length onChange={(v) => set((o) => (o.height = v))} />
        </Field>
        <Field label="Antepecho" hint="Altura desde el suelo hasta la parte inferior del hueco">
          <NumberField value={opening.sill} min={0} max={wall ? Math.max(0, wall.height - opening.height) : 3} unit="m" length onChange={(v) => set((o) => (o.sill = v))} />
        </Field>
        <Field label="Desde inicio" hint="Distancia desde el inicio del muro hasta el borde del hueco">
          <NumberField value={opening.offset - opening.width / 2} min={0.02} max={Math.max(0.02, len - opening.width - 0.02)} unit="m" length onChange={(v) => set((o) => (o.offset = v + o.width / 2))} />
        </Field>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button title="Cambia el lado de las bisagras" onClick={() => set((o) => (o.hinge = o.hinge === 'left' ? 'right' : 'left'))}>
            <ArrowLeftRight size={14} /> Bisagras
          </Button>
          <Button title="Cambia hacia qué lado abre" onClick={() => set((o) => (o.swing = o.swing === 'a' ? 'b' : 'a'))}>
            <FlipVertical2 size={14} /> Apertura
          </Button>
        </div>
      </Section>
      <Section title="Materiales">
        <MaterialPicker label="Marco" category="metal" value={opening.frame} onChange={(m) => set((o) => (o.frame = m))} />
        <MaterialPicker label={isDoor && opening.kind !== 'french-window' ? 'Hoja' : 'Vidrio / hoja'} category={isDoor ? 'madera' : 'vidrio'} value={opening.panel} onChange={(m) => set((o) => (o.panel = m))} />
      </Section>
      <DeleteSection label={isDoor ? 'Eliminar puerta' : 'Eliminar ventana'} refs={[{ kind: 'opening', id }]} />
    </>
  );
}
