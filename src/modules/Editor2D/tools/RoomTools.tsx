import { useMemo, useReducer, useRef } from 'react';
import { type Vec2, distance, polygonArea } from '@/core/geometry';
import { formatArea, formatLength, parseLength } from '@/core/units';
import { addDetectedRoom, addPolygonRoom, addRectRoom } from '@/modules/Rooms/ops';
import { findFaces } from '@/modules/Rooms/detection';
import { getRoomType } from '@/modules/Rooms/roomTypes';
import { pointInPolygon, signedArea } from '@/core/geometry';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { toast } from '@/modules/UI/toast';
import type { SnapResult } from '../snapping';
import { type PlanPointer, snapWorld, usePlan, useTool } from '../toolContext';
import { Badge, SnapMarker } from './overlays';

const pts = (p: Vec2[]) => p.map((q) => `${q.x},${q.y}`).join(' ');

function selectRoom(id: string | null) {
  if (id) useEditorStore.getState().select([{ kind: 'room', id }]);
}

/** Habitación rectangular: arrastrar (o clic-clic). Admite medidas "4x3" + Enter. */
export function RoomRectTool() {
  const { zoom, levelId } = usePlan();
  const roomType = useEditorStore((s) => s.roomType);
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ a: Vec2 | null; snap: SnapResult | null; typed: string; downScreen: Vec2 | null }>({ a: null, snap: null, typed: '', downScreen: null });

  const create = (a: Vec2, b: Vec2) => {
    let id: string | null = null;
    const withWalls = useEditorStore.getState().createWallsWithRoom;
    projectApi.apply((d) => {
      id = addRectRoom(d, levelId, a, b, roomType, withWalls);
    });
    if (!id) toast.error('La habitación es demasiado pequeña (mínimo 30 cm)');
    else selectRoom(id);
    st.current.a = null;
    st.current.typed = '';
    useEditorStore.getState().setLiveMeasure(null);
    render();
  };

  const typedTarget = (): Vec2 | null => {
    const s = st.current;
    if (!s.a || !s.typed) return null;
    const parts = s.typed.toLowerCase().split(/[x×*]/);
    if (parts.length !== 2) return null;
    const w = parseLength(parts[0]);
    const h = parseLength(parts[1]);
    if (!w || !h) return null;
    const p = s.snap?.point ?? s.a;
    return { x: s.a.x + (p.x >= s.a.x ? w : -w), y: s.a.y + (p.y >= s.a.y ? h : -h) };
  };

  const snapFor = (p: PlanPointer) => snapWorld(p.world, zoom, levelId, { free: p.altKey });

  useTool({
    cursor: 'crosshair',
    onPointerMove: (p) => {
      st.current.snap = snapFor(p);
      const { a, snap } = st.current;
      if (a && snap) {
        const w = Math.abs(snap.point.x - a.x);
        const h = Math.abs(snap.point.y - a.y);
        useEditorStore.getState().setLiveMeasure(`${formatLength(w)} × ${formatLength(h)} = ${formatArea(w * h)}`);
      }
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      const sn = snapFor(p);
      st.current.downScreen = p.screen;
      if (!st.current.a) {
        st.current.a = sn.point;
        render();
      } else create(st.current.a, sn.point);
    },
    onPointerUp: (p) => {
      const s = st.current;
      if (s.a && s.downScreen && distance(p.screen, s.downScreen) > 8) create(s.a, snapFor(p).point);
      s.downScreen = null;
    },
    onContextClick: () => {
      if (st.current.a) {
        st.current.a = null;
        render();
      } else useEditorStore.getState().setTool('select');
    },
    onKeyDown: (e) => {
      const s = st.current;
      if (e.key === 'Escape') {
        if (s.typed) s.typed = '';
        else if (s.a) s.a = null;
        else useEditorStore.getState().setTool('select');
        render();
        return true;
      }
      if (!s.a) return false;
      if (/^[0-9.,xX×*]$/.test(e.key) || (s.typed && /^[cm]$/i.test(e.key))) {
        s.typed += e.key;
        render();
        return true;
      }
      if (e.key === 'Backspace' && s.typed) {
        s.typed = s.typed.slice(0, -1);
        render();
        return true;
      }
      if (e.key === 'Enter' && s.typed) {
        const t = typedTarget();
        if (t) create(s.a, t);
        else toast.error('Escribe las medidas como ancho x fondo, por ejemplo 4x3,5');
        return true;
      }
      return false;
    },
  });

  const s = st.current;
  const b = typedTarget() ?? s.snap?.point ?? null;
  const def = getRoomType(roomType);
  let rect: Vec2[] | null = null;
  if (s.a && b) rect = [s.a, { x: b.x, y: s.a.y }, b, { x: s.a.x, y: b.y }];
  return (
    <g pointerEvents="none">
      {rect && (
        <>
          <polygon points={pts(rect)} fill={def.color} fillOpacity={0.8} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
          <Badge
            at={b!}
            zoom={zoom}
            accent={!!s.typed}
            text={s.typed ? `${s.typed} ↵` : `${formatLength(Math.abs(b!.x - s.a!.x))} × ${formatLength(Math.abs(b!.y - s.a!.y))}`}
          />
        </>
      )}
      <SnapMarker snap={s.snap} zoom={zoom} />
    </g>
  );
}

/** Habitación poligonal: clic en cada vértice; clic en el primero, doble clic o Enter para cerrar. */
export function RoomPolyTool() {
  const { zoom, levelId } = usePlan();
  const roomType = useEditorStore((s) => s.roomType);
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ points: Vec2[]; snap: SnapResult | null }>({ points: [], snap: null });

  const finish = () => {
    const points = st.current.points;
    st.current.points = [];
    render();
    if (points.length < 3) return;
    let id: string | null = null;
    const withWalls = useEditorStore.getState().createWallsWithRoom;
    projectApi.apply((d) => {
      id = addPolygonRoom(d, levelId, points, roomType, withWalls);
    });
    if (!id) toast.error('El polígono no es válido');
    else selectRoom(id);
    useEditorStore.getState().setLiveMeasure(null);
  };

  useTool({
    cursor: 'crosshair',
    onPointerMove: (p) => {
      const pts0 = st.current.points;
      st.current.snap = snapWorld(p.world, zoom, levelId, { anchor: pts0[pts0.length - 1] ?? null, constrain: p.shiftKey, free: p.altKey });
      if (pts0.length >= 2) useEditorStore.getState().setLiveMeasure(`Superficie: ${formatArea(polygonArea([...pts0, st.current.snap.point]))}`);
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      const s = st.current;
      const pt = snapWorld(p.world, zoom, levelId, { anchor: s.points[s.points.length - 1] ?? null, constrain: p.shiftKey, free: p.altKey }).point;
      if (s.points.length >= 3 && distance(pt, s.points[0]) < 10 / zoom) return finish();
      if (s.points.length && distance(pt, s.points[s.points.length - 1]) < 1e-4) return;
      s.points.push(pt);
      render();
    },
    onDoubleClick: () => finish(),
    onContextClick: () => {
      if (st.current.points.length) {
        st.current.points = [];
        render();
      } else useEditorStore.getState().setTool('select');
    },
    onKeyDown: (e) => {
      if (e.key === 'Enter') {
        finish();
        return true;
      }
      if (e.key === 'Backspace' && st.current.points.length) {
        st.current.points.pop();
        render();
        return true;
      }
      if (e.key === 'Escape') {
        if (st.current.points.length) st.current.points = [];
        else useEditorStore.getState().setTool('select');
        render();
        return true;
      }
      return false;
    },
  });

  const s = st.current;
  const def = getRoomType(roomType);
  const preview = s.snap ? [...s.points, s.snap.point] : s.points;
  return (
    <g pointerEvents="none">
      {preview.length >= 2 && <polygon points={pts(preview)} fill={def.color} fillOpacity={0.75} stroke="#0d9488" strokeWidth={1.5} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />}
      {s.points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={(i === 0 ? 5 : 3.5) / zoom} fill={i === 0 ? '#ffffff' : '#0d9488'} stroke="#0d9488" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      ))}
      {s.snap && s.points.length > 0 && <Badge at={s.snap.point} zoom={zoom} text={formatLength(distance(s.points[s.points.length - 1], s.snap.point))} />}
      <SnapMarker snap={s.snap} zoom={zoom} />
    </g>
  );
}

/** Detecta el recinto cerrado por muros bajo el cursor y crea la habitación con un clic. */
export function RoomDetectTool() {
  const { levelId } = usePlan();
  const roomType = useEditorStore((s) => s.roomType);
  const walls = useProjectStore((s) => s.doc.walls);
  const faces = useMemo(() => findFaces(Object.values(walls).filter((w) => w.levelId === levelId)), [walls, levelId]);
  const [, render] = useReducer((x: number) => x + 1, 0);
  const st = useRef<{ face: Vec2[] | null; area: number }>({ face: null, area: 0 });

  useTool({
    cursor: 'cell',
    onPointerMove: (p) => {
      const candidates = faces.filter((f) => pointInPolygon(p.world, f.axis)).sort((a, b) => Math.abs(signedArea(a.axis)) - Math.abs(signedArea(b.axis)));
      st.current.face = candidates[0]?.inner ?? null;
      st.current.area = candidates[0]?.area ?? 0;
      useEditorStore.getState().setLiveMeasure(st.current.face ? `Superficie útil: ${formatArea(st.current.area)}` : null);
      render();
    },
    onPointerDown: (p) => {
      if (p.button !== 0) return;
      let id: string | null = null;
      projectApi.apply((d) => {
        id = addDetectedRoom(d, levelId, p.world, roomType);
      });
      if (!id) toast.error('No hay un recinto cerrado por muros en ese punto');
      else {
        selectRoom(id);
        toast.success(`${getRoomType(roomType).name} creado (${formatArea(st.current.area)})`);
      }
    },
    onContextClick: () => useEditorStore.getState().setTool('select'),
    onKeyDown: (e) => {
      if (e.key === 'Escape') {
        useEditorStore.getState().setTool('select');
        return true;
      }
      return false;
    },
  });

  const f = st.current.face;
  if (!f) return null;
  return <polygon points={pts(f)} fill={getRoomType(roomType).color} fillOpacity={0.85} stroke="#0d9488" strokeWidth={2} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" pointerEvents="none" />;
}
