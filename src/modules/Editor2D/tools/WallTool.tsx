import { useReducer, useRef } from 'react';
import { type Vec2, add, distance, normalize, orientedRect, scale, sub } from '@/core/geometry';
import { formatLength, formatNumber, parseLength } from '@/core/units';
import { addWallMerged } from '@/modules/Walls/ops';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { toast } from '@/modules/UI/toast';
import type { SnapResult } from '../snapping';
import { type PlanPointer, snapWorld, usePlan, useTool } from '../toolContext';
import { Badge, SnapMarker } from './overlays';

/**
 * Herramienta de muros: clic-clic o clic-arrastrar para encadenar muros.
 * Escribir una longitud + Enter fija la medida exacta en la dirección actual.
 */
export function WallTool() {
  const { zoom, levelId } = usePlan();
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ chain: Vec2 | null; first: Vec2 | null; snap: SnapResult | null; typed: string; downScreen: Vec2 | null }>({
    chain: null,
    first: null,
    snap: null,
    typed: '',
    downScreen: null,
  });

  const snapFor = (p: PlanPointer) => snapWorld(p.world, zoom, levelId, { anchor: st.current.chain, constrain: p.shiftKey, free: p.altKey });

  const endChain = () => {
    st.current.chain = null;
    st.current.first = null;
    st.current.typed = '';
    useEditorStore.getState().setLiveMeasure(null);
    render();
  };

  const commit = (a: Vec2, b: Vec2) => {
    if (distance(a, b) < 0.05) return false;
    projectApi.apply((d) => {
      addWallMerged(d, levelId, a, b);
    });
    const closes = st.current.first && distance(b, st.current.first) < 1e-4;
    st.current.typed = '';
    if (closes) endChain();
    else st.current.chain = b;
    render();
    return true;
  };

  const target = (): Vec2 | null => {
    const s = st.current;
    if (!s.snap) return null;
    if (s.chain && s.typed) {
      const L = parseLength(s.typed);
      if (L && L > 0) {
        const dir = distance(s.snap.point, s.chain) > 1e-6 ? normalize(sub(s.snap.point, s.chain)) : { x: 1, y: 0 };
        return add(s.chain, scale(dir, L));
      }
    }
    return s.snap.point;
  };

  useTool({
    cursor: 'crosshair',
    onPointerMove: (p) => {
      st.current.snap = snapFor(p);
      const s = st.current;
      const t = target();
      if (s.chain && t) {
        const deg = (Math.atan2(t.y - s.chain.y, t.x - s.chain.x) * 180) / Math.PI;
        useEditorStore.getState().setLiveMeasure(`Longitud: ${formatLength(distance(s.chain, t))} · Ángulo: ${formatNumber(-deg, 1)}°`);
      }
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      const sn = snapFor(p);
      st.current.snap = sn;
      st.current.downScreen = p.screen;
      if (!st.current.chain) {
        st.current.chain = sn.point;
        st.current.first = sn.point;
        render();
      } else {
        const t = target();
        if (t) commit(st.current.chain, t);
      }
    },
    onPointerUp: (p) => {
      const s = st.current;
      if (s.downScreen && s.chain && distance(p.screen, s.downScreen) > 8) {
        const t = target();
        if (t) commit(s.chain, t);
      }
      s.downScreen = null;
    },
    onDoubleClick: () => endChain(),
    onContextClick: () => {
      if (st.current.chain) endChain();
      else useEditorStore.getState().setTool('select');
    },
    onKeyDown: (e) => {
      const s = st.current;
      if (e.key === 'Escape') {
        if (s.typed) s.typed = '';
        else if (s.chain) endChain();
        else useEditorStore.getState().setTool('select');
        render();
        return true;
      }
      if (!s.chain) return false;
      if (/^[0-9.,]$/.test(e.key) || (s.typed && /^[cm]$/i.test(e.key))) {
        s.typed += e.key;
        render();
        return true;
      }
      if (e.key === 'Backspace' && s.typed) {
        s.typed = s.typed.slice(0, -1);
        render();
        return true;
      }
      if (e.key === 'Enter') {
        if (s.typed) {
          const t = target();
          if (t && !commit(s.chain, t)) toast.error('Longitud no válida');
          if (!t) toast.error('Mueve el ratón para indicar la dirección del muro');
        } else endChain();
        return true;
      }
      return false;
    },
  });

  const s = st.current;
  const t = target();
  const thickness = projectApi.doc.settings.defaultWallThickness;
  const showPreview = s.chain && t && distance(s.chain, t) > 1e-4;
  return (
    <g pointerEvents="none">
      {showPreview && (
        <>
          <polygon
            points={orientedRect(scale(add(s.chain!, t!), 0.5), distance(s.chain!, t!), thickness, Math.atan2(t!.y - s.chain!.y, t!.x - s.chain!.x))
              .map((q) => `${q.x},${q.y}`)
              .join(' ')}
            fill="#0d9488"
            fillOpacity={0.35}
            stroke="#0d9488"
            strokeWidth={1.2}
            vectorEffect="non-scaling-stroke"
          />
          <Badge at={scale(add(s.chain!, t!), 0.5)} text={s.typed ? `${s.typed} ↵` : formatLength(distance(s.chain!, t!))} zoom={zoom} accent={!!s.typed} dx={10} dy={-18} />
        </>
      )}
      {s.chain && <circle cx={s.chain.x} cy={s.chain.y} r={3.5 / zoom} fill="#0d9488" />}
      <SnapMarker snap={s.snap} zoom={zoom} />
    </g>
  );
}
