import { formatArea, formatLength } from '@/core/units';
import { perimeter, polygonArea } from '@/core/geometry';
import type { Room, RoomType } from '@/modules/FloorPlan/types';
import { MaterialPicker } from '@/modules/Materials/MaterialPicker';
import { DeleteSection } from '@/modules/Walls/WallProperties';
import { Button, Field, NumberField, Section, SelectField, Stat, TextField, Toggle } from '@/modules/UI/controls';
import { Sparkles } from 'lucide-react';
import { furnishRoom, type FurnishResult } from '@/modules/Furniture/autoFurnish';
import { toast } from '@/modules/UI/toast';
import { useProjectStore } from '@/store/projectStore';
import { projectApi } from '@/store/projectStore';
import { ROOM_TYPES, getRoomType } from './roomTypes';

/** Amuebla la estancia y avisa con opción de deshacer. */
function furnish(id: string) {
  let res: FurnishResult = { added: [], skipped: [] };
  projectApi.apply((d) => {
    res = furnishRoom(d, id);
  });
  if (!res.added.length) {
    toast.info('No hay sitio libre para añadir muebles en esta estancia');
    return;
  }
  toast.action(`${res.added.length} muebles colocados${res.skipped.length ? ` · sin sitio: ${res.skipped.slice(0, 3).join(', ')}` : ''}`, 'Deshacer', () => useProjectStore.getState().undo());
}

export function RoomProperties({ room }: { room: Room }) {
  const id = room.id;
  const set = (fn: (r: Room) => void) => projectApi.apply((d) => fn(d.rooms[id]));
  const levelHeight = projectApi.doc.levels[room.levelId]?.height ?? 2.7;
  return (
    <>
      <Section title="Estancia">
        <Field label="Nombre">
          <TextField value={room.name} onChange={(v) => set((r) => (r.name = v))} />
        </Field>
        <Field label="Tipo">
          <SelectField<RoomType>
            value={room.type}
            options={ROOM_TYPES.map((t) => ({ value: t.type, label: t.name }))}
            onChange={(t) =>
              set((r) => {
                const prev = getRoomType(r.type);
                const next = getRoomType(t);
                if (r.name === prev.name) r.name = next.name;
                r.type = t;
                r.color = next.color;
                r.floor = { ...next.floor };
                r.hasCeiling = next.hasCeiling;
                r.ceilingLight = !next.exterior;
              })
            }
          />
        </Field>
        <div className="space-y-1.5 rounded-lg bg-slate-50 p-2.5">
          <Stat label="Superficie" value={<span className="text-[14px] font-semibold text-accent-700">{formatArea(polygonArea(room.points))}</span>} />
          <Stat label="Perímetro" value={formatLength(perimeter(room.points))} />
          <Stat label="Vértices" value={room.points.length} />
        </div>
        <Field label="Color en plano">
          <input type="color" className="h-7 w-full cursor-pointer rounded-md border border-slate-200 bg-white" value={room.color} onChange={(e) => set((r) => (r.color = e.target.value))} />
        </Field>
        <Button variant="primary" className="w-full" onClick={() => furnish(id)} title="Coloca los muebles típicos de este tipo de estancia">
          <Sparkles size={14} /> Amueblar estancia
        </Button>
      </Section>
      <Section title="Suelo y techo">
        <MaterialPicker label="Suelo" category="suelo" value={room.floor} onChange={(m) => set((r) => (r.floor = m))} />
        <Field label="Techo">
          <Toggle checked={room.hasCeiling} onChange={(v) => set((r) => (r.hasCeiling = v))} label={room.hasCeiling ? 'Con techo' : 'Sin techo'} />
        </Field>
        {room.hasCeiling && (
          <>
            <Field label="Altura techo" hint="Vacío = altura de la planta">
              <NumberField value={room.ceilingHeight ?? levelHeight} min={1.8} max={12} unit="m" length onChange={(v) => set((r) => (r.ceilingHeight = v))} />
            </Field>
            <MaterialPicker label="Techo" category="pared" value={room.ceiling} onChange={(m) => set((r) => (r.ceiling = m))} />
            <Field label="Luz de techo">
              <Toggle checked={room.ceilingLight} onChange={(v) => set((r) => (r.ceilingLight = v))} label={room.ceilingLight ? 'Sí' : 'No'} />
            </Field>
          </>
        )}
      </Section>
      <DeleteSection label="Eliminar estancia" refs={[{ kind: 'room', id }]} />
    </>
  );
}
