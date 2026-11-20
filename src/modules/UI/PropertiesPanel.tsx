import { Copy, Trash2 } from 'lucide-react';
import { formatArea, formatLength } from '@/core/units';
import { distance, polygonArea } from '@/core/geometry';
import type { Dimension, ElementRef, ProjectDoc } from '@/modules/FloorPlan/types';
import { deleteElements, duplicateElements } from '@/modules/FloorPlan/queries';
import { WallProperties, MultiWallProperties, DeleteSection } from '@/modules/Walls/WallProperties';
import { RoomProperties } from '@/modules/Rooms/RoomProperties';
import { OpeningProperties } from '@/modules/DoorsAndWindows/OpeningProperties';
import { FurnitureProperties } from '@/modules/Furniture/FurnitureProperties';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { Button, Field, NumberField, Section, Stat } from './controls';
import { NoSelectionPanel } from './NoSelectionPanel';

const KIND_LABEL: Record<ElementRef['kind'], string> = { wall: 'muros', room: 'estancias', opening: 'huecos', furniture: 'objetos', dimension: 'cotas' };

function DimensionProperties({ dim }: { dim: Dimension }) {
  return (
    <>
      <Section title="Cota">
        <Stat label="Distancia" value={<span className="text-[14px] font-semibold text-accent-700">{formatLength(distance(dim.start, dim.end))}</span>} />
        <Field label="Separación">
          <NumberField value={dim.offset} min={-20} max={20} unit="m" length onChange={(v) => projectApi.apply((d) => void (d.dimensions[dim.id].offset = v))} />
        </Field>
      </Section>
      <DeleteSection label="Eliminar cota" onDelete={() => projectApi.apply((d) => deleteElements(d, [{ kind: 'dimension', id: dim.id }]))} />
    </>
  );
}

function MultiSelection({ doc, refs }: { doc: ProjectDoc; refs: ElementRef[] }) {
  const counts = refs.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.kind]: (acc[r.kind] ?? 0) + 1 }), {});
  const walls = refs.filter((r) => r.kind === 'wall').map((r) => doc.walls[r.id]);
  const area = refs.filter((r) => r.kind === 'room').reduce((s, r) => s + polygonArea(doc.rooms[r.id].points), 0);
  return (
    <>
      <Section title={`${refs.length} elementos seleccionados`}>
        {Object.entries(counts).map(([k, n]) => (
          <Stat key={k} label={KIND_LABEL[k as ElementRef['kind']]} value={n} />
        ))}
        {area > 0 && <Stat label="Superficie de estancias" value={formatArea(area)} />}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            onClick={() => {
              let out: ElementRef[] = [];
              projectApi.apply((d) => {
                out = duplicateElements(d, refs, { x: 0.5, y: 0.5 });
              });
              useEditorStore.getState().select(out);
            }}
          >
            <Copy size={14} /> Duplicar
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              projectApi.apply((d) => deleteElements(d, refs));
              useEditorStore.getState().clearSelection();
            }}
          >
            <Trash2 size={14} /> Eliminar
          </Button>
        </div>
      </Section>
      {walls.length > 1 && <MultiWallProperties walls={walls} />}
    </>
  );
}

export function PropertiesPanel() {
  const doc = useProjectStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const refs = selection.filter((r) => {
    switch (r.kind) {
      case 'wall':
        return !!doc.walls[r.id];
      case 'room':
        return !!doc.rooms[r.id];
      case 'opening':
        return !!doc.openings[r.id];
      case 'furniture':
        return !!doc.furniture[r.id];
      case 'dimension':
        return !!doc.dimensions[r.id];
    }
  });
  let content;
  if (refs.length === 0) content = <NoSelectionPanel />;
  else if (refs.length > 1) content = <MultiSelection doc={doc} refs={refs} />;
  else {
    const r = refs[0];
    switch (r.kind) {
      case 'wall':
        content = <WallProperties key={r.id} wall={doc.walls[r.id]} />;
        break;
      case 'room':
        content = <RoomProperties key={r.id} room={doc.rooms[r.id]} />;
        break;
      case 'opening':
        content = <OpeningProperties key={r.id} opening={doc.openings[r.id]} />;
        break;
      case 'furniture':
        content = <FurnitureProperties key={r.id} item={doc.furniture[r.id]} />;
        break;
      case 'dimension':
        content = <DimensionProperties key={r.id} dim={doc.dimensions[r.id]} />;
        break;
    }
  }
  return <div className="pb-6">{content}</div>;
}
