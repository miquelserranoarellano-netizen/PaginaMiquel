import { useReducer, useRef } from 'react';
import { type Vec2, distance } from '@/core/geometry';
import { formatLength } from '@/core/units';
import { createDimension } from '@/modules/FloorPlan/factory';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { DimensionLine } from '../Dimensions2D';
import type { SnapResult } from '../snapping';
import { type PlanPointer, snapWorld, usePlan, useTool } from '../toolContext';
import { SnapMarker } from './overlays';

/** Mide distancias y deja una cota en el plano (se puede borrar como cualquier elemento). */
export function MeasureTool() {
  const { zoom, levelId } = usePlan();
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ a: Vec2 | null; snap: SnapResult | null; downScreen: Vec2 | null }>({ a: null, snap: null, downScreen: null });
  const snapFor = (p: PlanPointer) => snapWorld(p.world, zoom, levelId, { anchor: st.current.a, constrain: p.shiftKey, free: p.altKey });

  const commit = (a: Vec2, b: Vec2) => {
    st.current.a = null;
    render();
    if (distance(a, b) < 0.01) return;
    const dim = createDimension(levelId, a, b, 0);
    projectApi.apply((d) => {
      d.dimensions[dim.id] = dim;
    });
    useEditorStore.getState().select([{ kind: 'dimension', id: dim.id }]);
  };

  useTool({
    cursor: 'crosshair',
    onPointerMove: (p) => {
      st.current.snap = snapFor(p);
      if (st.current.a) useEditorStore.getState().setLiveMeasure(`Distancia: ${formatLength(distance(st.current.a, st.current.snap.point))}`);
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      st.current.downScreen = p.screen;
      const pt = snapFor(p).point;
      if (!st.current.a) {
        st.current.a = pt;
        render();
      } else commit(st.current.a, pt);
    },
    onPointerUp: (p) => {
      const s = st.current;
      if (s.a && s.downScreen && distance(p.screen, s.downScreen) > 8) commit(s.a, snapFor(p).point);
      s.downScreen = null;
    },
    onContextClick: () => {
      if (st.current.a) {
        st.current.a = null;
        render();
      } else useEditorStore.getState().setTool('select');
    },
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        if (st.current.a) st.current.a = null;
        else useEditorStore.getState().setTool('select');
        render();
        return true;
      }
      return false;
    },
  });

  const s = st.current;
  return (
    <g pointerEvents="none">
      {s.a && s.snap && <DimensionLine start={s.a} end={s.snap.point} offset={0} zoom={zoom} color="#ea580c" />}
      <SnapMarker snap={s.snap} zoom={zoom} />
    </g>
  );
}
