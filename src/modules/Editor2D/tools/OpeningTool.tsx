import { useReducer, useRef } from 'react';
import { type Vec2, dot, roundTo, sub } from '@/core/geometry';
import { formatLength } from '@/core/units';
import { createOpening } from '@/modules/FloorPlan/factory';
import type { Opening, Wall } from '@/modules/FloorPlan/types';
import { getOpeningDef } from '@/modules/DoorsAndWindows/catalog';
import { OpeningSymbol, openingTransform } from '@/modules/DoorsAndWindows/Opening2D';
import { nearestWall, wallFrame } from '@/modules/Walls/geometry';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { toast } from '@/modules/UI/toast';
import { usePlan, useTool } from '../toolContext';
import { Badge } from './overlays';

interface Preview {
  wall: Wall;
  offset: number;
  swing: 'a' | 'b';
  valid: boolean;
  reason?: string;
  cursor: Vec2;
}

/** Coloca puertas y ventanas sobre los muros (la apertura sigue al lado del cursor). */
export function OpeningTool() {
  const { zoom, levelId } = usePlan();
  const kind = useEditorStore((s) => s.openingKind);
  const def = getOpeningDef(kind);
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ preview: Preview | null }>({ preview: null });

  const compute = (world: Vec2, free: boolean): Preview | null => {
    const doc = projectApi.doc;
    const walls = Object.values(doc.walls).filter((w) => w.levelId === levelId);
    const hit = nearestWall(world, walls, 0.6);
    if (!hit) return null;
    const f = wallFrame(hit.wall);
    const w = def.width;
    const swing: 'a' | 'b' = dot(sub(world, hit.point), f.normal) >= 0 ? 'a' : 'b';
    if (f.length < w + 0.04) return { wall: hit.wall, offset: f.length / 2, swing, valid: false, reason: 'El muro es demasiado corto', cursor: world };
    let u = hit.offset;
    if (!free && useEditorStore.getState().snapToGrid) u = roundTo(u - w / 2, useEditorStore.getState().gridSize) + w / 2;
    u = Math.min(f.length - w / 2 - 0.02, Math.max(w / 2 + 0.02, u));
    const overlap = Object.values(doc.openings).some((o) => o.wallId === hit.wall.id && Math.abs(o.offset - u) < (o.width + w) / 2);
    return { wall: hit.wall, offset: u, swing, valid: !overlap, reason: overlap ? 'Se solapa con otro hueco' : undefined, cursor: world };
  };

  useTool({
    cursor: 'copy',
    onPointerMove: (p) => {
      st.current.preview = compute(p.world, p.altKey);
      const pr = st.current.preview;
      if (pr) {
        const len = wallFrame(pr.wall).length;
        useEditorStore.getState().setLiveMeasure(`${def.name}: ${formatLength(pr.offset - def.width / 2)} desde el inicio · ${formatLength(len - pr.offset - def.width / 2)} hasta el final`);
      }
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      const pr = compute(p.world, p.altKey);
      if (!pr) return toast.info('Acerca el cursor a un muro para colocar la puerta o ventana');
      if (!pr.valid) return toast.error(pr.reason ?? 'No se puede colocar aquí');
      let created: Opening | null = null;
      projectApi.apply((d) => {
        const w = d.walls[pr.wall.id];
        const o = createOpening(levelId, pr.wall.id, kind, pr.offset, { swing: pr.swing });
        if (o.sill + o.height > w.height) o.height = Math.max(0.3, w.height - o.sill - 0.05);
        d.openings[o.id] = o;
        created = o;
      });
      if (created) useEditorStore.getState().select([{ kind: 'opening', id: (created as Opening).id }]);
    },
    onContextClick: () => useEditorStore.getState().setTool('select'),
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        useEditorStore.getState().setTool('select');
        return true;
      }
      return false;
    },
    onLeave: () => {
      st.current.preview = null;
      render();
    },
  });

  const pr = st.current.preview;
  if (!pr) return null;
  const fake = { kind, width: def.width, hinge: 'left' as const, swing: pr.swing, offset: pr.offset };
  return (
    <g pointerEvents="none">
      <g transform={openingTransform(fake, pr.wall)} opacity={pr.valid ? 0.85 : 0.5}>
        <rect x={-def.width / 2} y={-pr.wall.thickness / 2 - 0.03} width={def.width} height={pr.wall.thickness + 0.06} fill={pr.valid ? '#14b8a6' : '#ef4444'} fillOpacity={0.25} />
        <OpeningSymbol o={fake} thickness={pr.wall.thickness} />
      </g>
      <Badge at={pr.cursor} zoom={zoom} text={`${def.name} ${formatLength(def.width)}`} />
    </g>
  );
}
