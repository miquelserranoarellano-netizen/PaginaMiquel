import { type Vec2, labelPoint } from '@/core/geometry';
import { levelBBox } from '@/modules/FloorPlan/queries';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { getCatalogItem } from './catalog';
import { createFurniture } from './factory';

/** Punto de inserción razonable: estancia seleccionada, centro de la vista 2D o de la planta. */
export function insertionPoint(): Vec2 {
  const ed = useEditorStore.getState();
  const doc = projectApi.doc;
  const room = ed.selection.find((r) => r.kind === 'room');
  if (room && doc.rooms[room.id]) return labelPoint(doc.rooms[room.id].points);
  if (ed.view === '2d') return { x: ed.viewport.cx, y: ed.viewport.cy };
  const box = levelBBox(doc, ed.activeLevelId);
  return box ? { x: (box.minX + box.maxX) / 2, y: (box.minY + box.maxY) / 2 } : { x: 0, y: 0 };
}

export function addFurnitureAtViewCenter(catalogId: string, at?: Vec2): string | null {
  const item = getCatalogItem(catalogId);
  if (!item) return null;
  const ed = useEditorStore.getState();
  const f = createFurniture(ed.activeLevelId, item, at ?? insertionPoint());
  projectApi.apply((d) => {
    d.furniture[f.id] = f;
  });
  ed.select([{ kind: 'furniture', id: f.id }]);
  return f.id;
}
