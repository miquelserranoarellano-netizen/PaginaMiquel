import { useRef, useState } from 'react';
import { type Vec2, bboxOf, distance, roundTo, sub } from '@/core/geometry';
import { formatLength } from '@/core/units';
import { elementExists, elementsInBox, translateElements } from '@/modules/FloorPlan/queries';
import type { ElementRef } from '@/modules/FloorPlan/types';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { type Handle, getHandles, hitHandle } from '../handles';
import { applyHandle, moveOpeningTo } from '../handleOps';
import { hitTest } from '../hitTest';
import { type PlanPointer, snapWorld, usePlan, useTool } from '../toolContext';

type Mode = 'idle' | 'pending' | 'moving' | 'handle' | 'marquee';

export function SelectTool() {
  const { zoom, levelId } = usePlan();
  const [marquee, setMarquee] = useState<{ a: Vec2; b: Vec2 } | null>(null);
  const [cursor, setCursor] = useState('default');
  const st = useRef<{ mode: Mode; start: Vec2; startScreen: Vec2; refs: ElementRef[]; handle?: Handle; shift: boolean }>({
    mode: 'idle',
    start: { x: 0, y: 0 },
    startScreen: { x: 0, y: 0 },
    refs: [],
    shift: false,
  });

  const hit = (p: PlanPointer) => {
    const ed = useEditorStore.getState();
    return hitTest(projectApi.doc, levelId, p.world, { furniture: ed.plan.furniture, dimensions: ed.plan.dimensions, tol: 6 / zoom });
  };

  useTool({
    cursor,
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      const ed = useEditorStore.getState();
      const doc = projectApi.doc;
      const h = hitHandle(getHandles(doc, ed.selection, zoom), p.world, zoom);
      if (h) {
        st.current = { mode: 'handle', handle: h, start: { ...h.pos }, startScreen: p.screen, refs: [], shift: false };
        projectApi.beginGesture();
        return;
      }
      const target = hit(p);
      if (target) {
        if (p.shiftKey) ed.toggleSelect(target);
        else if (!ed.selection.some((r) => r.id === target.id)) ed.select([target]);
        const sel = useEditorStore.getState().selection.filter((r) => elementExists(doc, r));
        st.current = { mode: 'pending', start: p.world, startScreen: p.screen, refs: sel, shift: p.shiftKey };
        return;
      }
      if (!p.shiftKey) ed.clearSelection();
      st.current = { mode: 'marquee', start: p.world, startScreen: p.screen, refs: [], shift: p.shiftKey };
      setMarquee({ a: p.world, b: p.world });
    },

    onPointerMove: (p) => {
      const s = st.current;
      const ed = useEditorStore.getState();
      if (s.mode === 'idle') {
        const h = hitHandle(getHandles(projectApi.doc, ed.selection, zoom), p.world, zoom);
        const target = h ? null : hit(p);
        const cur = ed.hover;
        if ((target?.id ?? null) !== (cur?.id ?? null)) ed.setHover(target);
        setCursor(h ? (h.kind === 'furn-rotate' ? 'grab' : h.kind === 'furn-resize' ? 'nwse-resize' : 'crosshair') : target ? 'move' : 'default');
        return;
      }
      if (s.mode === 'pending') {
        if (distance(p.screen, s.startScreen) < 4 || !s.refs.length) return;
        projectApi.beginGesture();
        s.mode = 'moving';
      }
      const snap = ed.snapToGrid && !p.altKey;
      if (s.mode === 'moving') {
        if (s.refs.length === 1 && s.refs[0].kind === 'opening') {
          const id = s.refs[0].id;
          projectApi.updateGesture((d) => moveOpeningTo(d, id, p.world, ed.gridSize, snap));
          return;
        }
        let delta = sub(p.world, s.start);
        if (snap) delta = { x: roundTo(delta.x, ed.gridSize), y: roundTo(delta.y, ed.gridSize) };
        const refs = s.refs;
        projectApi.updateGesture((d) => translateElements(d, refs, delta));
        ed.setLiveMeasure(`Desplazamiento: ${formatLength(Math.hypot(delta.x, delta.y))}  (Δx ${formatLength(delta.x)}, Δy ${formatLength(delta.y)})`);
        return;
      }
      if (s.mode === 'handle' && s.handle) {
        const h = s.handle;
        let anchor: Vec2 | null = null;
        if (h.kind === 'wall-start' || h.kind === 'wall-end') {
          const w = useProjectStore.getState().gestureBase?.walls[h.ref.id];
          if (w) anchor = h.kind === 'wall-start' ? w.end : w.start;
        }
        const snapped = snapWorld(p.world, zoom, levelId, { anchor, constrain: p.shiftKey, free: p.altKey, excludePoints: [s.start], useGestureBase: true });
        projectApi.updateGesture((d) => applyHandle(d, h, { point: snapped.point, raw: p.world, gridSize: ed.gridSize, snap: !p.altKey }));
        if (anchor) ed.setLiveMeasure(`Longitud: ${formatLength(distance(anchor, snapped.point))}`);
        if (h.kind === 'furn-resize') {
          const f = projectApi.doc.furniture[h.ref.id];
          if (f) ed.setLiveMeasure(`${formatLength(f.width)} × ${formatLength(f.depth)}`);
        }
        return;
      }
      if (s.mode === 'marquee') setMarquee({ a: s.start, b: p.world });
    },

    onPointerUp: (p) => {
      const s = st.current;
      const ed = useEditorStore.getState();
      if (s.mode === 'moving' || s.mode === 'handle') projectApi.endGesture();
      if (s.mode === 'marquee') {
        if (distance(p.screen, s.startScreen) > 4) {
          const box = bboxOf([s.start, p.world]);
          const windowSel = p.world.x >= s.start.x;
          const found = elementsInBox(projectApi.doc, levelId, box, windowSel);
          const base = s.shift ? ed.selection : [];
          const ids = new Set(base.map((r) => r.id));
          ed.select([...base, ...found.filter((r) => !ids.has(r.id))]);
        }
        setMarquee(null);
      }
      ed.setLiveMeasure(null);
      st.current = { ...s, mode: 'idle' };
    },

    onLeave: () => useEditorStore.getState().setHover(null),
  });

  if (!marquee) return null;
  const x = Math.min(marquee.a.x, marquee.b.x);
  const y = Math.min(marquee.a.y, marquee.b.y);
  const w = Math.abs(marquee.b.x - marquee.a.x);
  const h = Math.abs(marquee.b.y - marquee.a.y);
  const crossing = marquee.b.x < marquee.a.x;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      fill={crossing ? '#10b981' : '#2563eb'}
      fillOpacity={0.07}
      stroke={crossing ? '#10b981' : '#2563eb'}
      strokeWidth={1}
      strokeDasharray={crossing ? '5 4' : undefined}
      vectorEffect="non-scaling-stroke"
      pointerEvents="none"
    />
  );
}
