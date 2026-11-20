import { FlipHorizontal2, Scissors, Trash2 } from 'lucide-react';
import { formatArea } from '@/core/units';
import { LIMITS } from '@/modules/FloorPlan/defaults';
import type { Wall } from '@/modules/FloorPlan/types';
import { deleteElements } from '@/modules/FloorPlan/queries';
import { MaterialPicker } from '@/modules/Materials/MaterialPicker';
import { Button, Field, NumberField, Section, Stat } from '@/modules/UI/controls';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { wallFrame } from './geometry';
import { clampOpenings, flipWall, setWallAngle, setWallLength, splitWall } from './ops';

export function WallProperties({ wall }: { wall: Wall }) {
  const f = wallFrame(wall);
  const angle = Math.round(((-f.angle * 180) / Math.PI + 360) % 360 * 10) / 10;
  const id = wall.id;
  const set = (fn: (w: Wall) => void) =>
    projectApi.apply((d) => {
      fn(d.walls[id]);
      clampOpenings(d, id);
    });
  return (
    <>
      <Section title="Muro">
        <Field label="Longitud" hint="Se mueve el extremo final; los muros conectados le acompañan">
          <NumberField value={f.length} min={LIMITS.wallLength.min} max={LIMITS.wallLength.max} unit="m" length onChange={(v) => projectApi.apply((d) => setWallLength(d, id, v))} />
        </Field>
        <Field label="Ángulo" hint="0° = hacia la derecha, sentido antihorario">
          <NumberField value={angle} min={-360} max={360} step={1} digits={1} unit="°" onChange={(v) => projectApi.apply((d) => setWallAngle(d, id, -v))} />
        </Field>
        <Field label="Grosor">
          <NumberField value={wall.thickness} min={LIMITS.wallThickness.min} max={LIMITS.wallThickness.max} step={0.01} unit="m" length onChange={(v) => set((w) => (w.thickness = v))} />
        </Field>
        <Field label="Altura">
          <NumberField value={wall.height} min={LIMITS.wallHeight.min} max={LIMITS.wallHeight.max} step={0.05} unit="m" length onChange={(v) => set((w) => (w.height = v))} />
        </Field>
        <Stat label="Superficie (por cara)" value={formatArea(f.length * wall.height)} />
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button title="Divide el muro en dos por su punto medio" onClick={() => projectApi.apply((d) => void splitWall(d, id, f.length / 2))}>
            <Scissors size={14} /> Dividir
          </Button>
          <Button title="Intercambia las caras A y B" onClick={() => projectApi.apply((d) => flipWall(d, id))}>
            <FlipHorizontal2 size={14} /> Invertir
          </Button>
        </div>
      </Section>
      <Section title="Acabados">
        <MaterialPicker label="Cara A (izquierda)" category="pared" value={wall.sideA} onChange={(m) => set((w) => (w.sideA = m))} />
        <MaterialPicker label="Cara B (derecha)" category="pared" value={wall.sideB} onChange={(m) => set((w) => (w.sideB = m))} />
      </Section>
      <DeleteSection onDelete={() => projectApi.apply((d) => deleteElements(d, [{ kind: 'wall', id }]))} label="Eliminar muro" />
    </>
  );
}

export function DeleteSection({ onDelete, label }: { onDelete: () => void; label: string }) {
  return (
    <div className="p-4">
      <Button
        variant="danger"
        className="w-full"
        onClick={() => {
          onDelete();
          useEditorStore.getState().clearSelection();
        }}
      >
        <Trash2 size={14} /> {label}
      </Button>
    </div>
  );
}

/** Edición conjunta de varios muros. */
export function MultiWallProperties({ walls }: { walls: Wall[] }) {
  const ids = walls.map((w) => w.id);
  const same = <T,>(get: (w: Wall) => T): T | null => (walls.every((w) => get(w) === get(walls[0])) ? get(walls[0]) : null);
  const thickness = same((w) => w.thickness);
  const height = same((w) => w.height);
  const setAll = (fn: (w: Wall) => void) =>
    projectApi.apply((d) => {
      for (const id of ids) {
        fn(d.walls[id]);
        clampOpenings(d, id);
      }
    });
  return (
    <Section title={`${walls.length} muros`}>
      <Field label="Grosor">
        <NumberField value={thickness ?? walls[0].thickness} min={LIMITS.wallThickness.min} max={LIMITS.wallThickness.max} unit="m" length onChange={(v) => setAll((w) => (w.thickness = v))} />
      </Field>
      <Field label="Altura">
        <NumberField value={height ?? walls[0].height} min={LIMITS.wallHeight.min} max={LIMITS.wallHeight.max} unit="m" length onChange={(v) => setAll((w) => (w.height = v))} />
      </Field>
      <MaterialPicker label="Cara A (todos)" category="pared" value={walls[0].sideA} onChange={(m) => setAll((w) => (w.sideA = m))} />
      <MaterialPicker label="Cara B (todos)" category="pared" value={walls[0].sideB} onChange={(m) => setAll((w) => (w.sideB = m))} />
    </Section>
  );
}
