import { memo } from 'react';
import { add, normalize, orientedRect, perp, scale, sub } from '@/core/geometry';
import { degToRad } from '@/core/units';
import type { ElementRef, ProjectDoc } from '@/modules/FloorPlan/types';
import { computeFootprint, wallFrame } from '@/modules/Walls/geometry';
import { getHandles } from './handles';

const SEL = '#2563eb';
const HOVER = '#60a5fa';
const pts = (p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(' ');

function Outline({ doc, refEl, color, fillOpacity }: { doc: ProjectDoc; refEl: ElementRef; color: string; fillOpacity: number }) {
  const common = { stroke: color, strokeWidth: 2, vectorEffect: 'non-scaling-stroke' as const, fill: color, fillOpacity };
  switch (refEl.kind) {
    case 'wall': {
      const w = doc.walls[refEl.id];
      if (!w) return null;
      const levelWalls = Object.values(doc.walls).filter((x) => x.levelId === w.levelId);
      return <polygon points={pts(computeFootprint(w, levelWalls).polygon)} {...common} />;
    }
    case 'room': {
      const r = doc.rooms[refEl.id];
      return r ? <polygon points={pts(r.points)} {...common} strokeDasharray="6 4" /> : null;
    }
    case 'opening': {
      const o = doc.openings[refEl.id];
      const w = o && doc.walls[o.wallId];
      if (!o || !w) return null;
      const f = wallFrame(w);
      return <polygon points={pts(orientedRect(add(w.start, scale(f.dir, o.offset)), o.width, w.thickness + 0.06, f.angle))} {...common} />;
    }
    case 'furniture': {
      const f = doc.furniture[refEl.id];
      return f ? <polygon points={pts(orientedRect(f.position, f.width, f.depth, degToRad(f.rotation)))} {...common} /> : null;
    }
    case 'dimension': {
      const d = doc.dimensions[refEl.id];
      if (!d) return null;
      const n = perp(normalize(sub(d.end, d.start)));
      const a = add(d.start, scale(n, d.offset));
      const b = add(d.end, scale(n, d.offset));
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={5} strokeOpacity={0.35} vectorEffect="non-scaling-stroke" />;
    }
  }
}

export const SelectionOverlay = memo(function SelectionOverlay({ doc, selection, hover, zoom }: { doc: ProjectDoc; selection: ElementRef[]; hover: ElementRef | null; zoom: number }) {
  const handles = getHandles(doc, selection, zoom);
  const r = 4.5 / zoom;
  const showHover = hover && !selection.some((s) => s.id === hover.id);
  return (
    <g pointerEvents="none">
      {showHover && <Outline doc={doc} refEl={hover} color={HOVER} fillOpacity={0.08} />}
      {selection.map((s) => (
        <Outline key={s.id} doc={doc} refEl={s} color={SEL} fillOpacity={0.14} />
      ))}
      {handles.map((h, i) => {
        if (h.kind === 'furn-rotate') {
          const f = doc.furniture[h.ref.id];
          const c = f.position;
          return (
            <g key={i}>
              <line x1={c.x} y1={c.y} x2={h.pos.x} y2={h.pos.y} stroke={SEL} strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
              <circle cx={h.pos.x} cy={h.pos.y} r={r * 1.25} fill="#ffffff" stroke={SEL} strokeWidth={2} vectorEffect="non-scaling-stroke" />
              <path d={`M ${h.pos.x - r * 0.6} ${h.pos.y} A ${r * 0.6} ${r * 0.6} 0 1 1 ${h.pos.x} ${h.pos.y + r * 0.6}`} fill="none" stroke={SEL} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
            </g>
          );
        }
        const square = h.kind === 'opening-left' || h.kind === 'opening-right' || h.kind === 'dim-offset';
        return square ? (
          <rect key={i} x={h.pos.x - r} y={h.pos.y - r} width={r * 2} height={r * 2} fill="#ffffff" stroke={SEL} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        ) : (
          <circle key={i} cx={h.pos.x} cy={h.pos.y} r={r} fill="#ffffff" stroke={SEL} strokeWidth={2} vectorEffect="non-scaling-stroke" />
        );
      })}
    </g>
  );
});
