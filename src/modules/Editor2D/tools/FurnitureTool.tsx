import { useReducer, useRef } from 'react';
import { type Vec2, roundTo } from '@/core/geometry';
import { getCatalogItem } from '@/modules/Furniture/catalog';
import { createFurniture } from '@/modules/Furniture/factory';
import { FurnitureSymbol } from '@/modules/Furniture/Furniture2D';
import { placeAgainstWall } from '@/modules/Furniture/placement';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { usePlan, useTool } from '../toolContext';
import { Badge } from './overlays';

/** Coloca el mueble elegido en la biblioteca. Se apoya solo contra las paredes cercanas. R gira 90°. */
export function FurnitureTool() {
  const { zoom, levelId } = usePlan();
  const catalogId = useEditorStore((s) => s.placingCatalogId);
  const item = catalogId ? getCatalogItem(catalogId) : undefined;
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ pos: Vec2 | null; rotation: number; userRotation: number }>({ pos: null, rotation: 0, userRotation: 0 });

  const place = (world: Vec2, free: boolean) => {
    if (!item) return null;
    const ed = useEditorStore.getState();
    let pos = ed.snapToGrid && !free ? { x: roundTo(world.x, ed.gridSize), y: roundTo(world.y, ed.gridSize) } : world;
    let rotation = st.current.userRotation;
    if (!free) {
      const snapped = placeAgainstWall(projectApi.doc, levelId, world, item.w, item.d, rotation);
      if (snapped) {
        pos = snapped.position;
        rotation = snapped.rotation;
      }
    }
    return { pos, rotation };
  };

  useTool({
    cursor: 'copy',
    onPointerMove: (p) => {
      const r = place(p.world, p.altKey);
      if (r) {
        st.current.pos = r.pos;
        st.current.rotation = r.rotation;
      }
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0 || !item) return;
      const r = place(p.world, p.altKey);
      if (!r) return;
      const f = createFurniture(levelId, item, r.pos, r.rotation);
      projectApi.apply((d) => {
        d.furniture[f.id] = f;
      });
      const ed = useEditorStore.getState();
      if (!p.shiftKey) ed.setTool('select');
      ed.select([{ kind: 'furniture', id: f.id }]);
    },
    onContextClick: () => useEditorStore.getState().setTool('select'),
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        useEditorStore.getState().setTool('select');
        return true;
      }
      if (e.key === 'r' || e.key === 'R') {
        st.current.userRotation = (st.current.userRotation + (e.shiftKey ? 15 : 90)) % 360;
        st.current.rotation = st.current.userRotation;
        render();
        return true;
      }
      return false;
    },
    onLeave: () => {
      st.current.pos = null;
      render();
    },
  });

  const s = st.current;
  if (!item || !s.pos) return null;
  const ghost = { catalogId: item.id, width: item.w, depth: item.d, height: item.h, materials: item.slots, name: item.name };
  return (
    <g pointerEvents="none">
      <g transform={`translate(${s.pos.x} ${s.pos.y}) rotate(${s.rotation})`} opacity={0.75}>
        <FurnitureSymbol item={ghost} />
      </g>
      <Badge at={s.pos} zoom={zoom} text={`${item.name} · R para girar`} dx={18} dy={-22} />
    </g>
  );
}
