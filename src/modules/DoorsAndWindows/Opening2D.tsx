import { memo } from 'react';
import { add, scale } from '@/core/geometry';
import type { Opening, Wall } from '@/modules/FloorPlan/types';
import { wallFrame } from '@/modules/Walls/geometry';

const LINE = '#2e3336';
const LEAF = '#475569';
const GLASS = '#0ea5e9';

function swingArc(hx: number, sx: number, sy: number, t: number, w: number, key?: string) {
  const y0 = (sy * t) / 2;
  const leafEnd = { x: hx, y: y0 + sy * w };
  const closed = { x: hx + sx * w, y: y0 };
  const sweep = sx * sy > 0 ? 0 : 1;
  return (
    <g key={key}>
      <line x1={hx} y1={y0} x2={leafEnd.x} y2={leafEnd.y} stroke={LEAF} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
      <path d={`M ${leafEnd.x} ${leafEnd.y} A ${w} ${w} 0 0 ${sweep} ${closed.x} ${closed.y}`} fill="none" stroke={LEAF} strokeWidth={0.8} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
    </g>
  );
}

/** Símbolo de planta de una puerta o ventana, en coordenadas locales del muro. */
export function OpeningSymbol({ o, thickness }: { o: Pick<Opening, 'kind' | 'width' | 'hinge' | 'swing'>; thickness: number }) {
  const w = o.width;
  const t = thickness;
  const hw = w / 2;
  const sy = o.swing === 'a' ? 1 : -1;
  const jamb = (x: number) => <line x1={x} y1={-t / 2} x2={x} y2={t / 2} stroke={LINE} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />;
  const base = <rect x={-hw} y={-t / 2} width={w} height={t} fill="#ffffff" />;

  switch (o.kind) {
    case 'door':
    case 'entrance-door': {
      const hinged = o.hinge === 'left' ? -hw : hw;
      const sx = o.hinge === 'left' ? 1 : -1;
      return (
        <g>
          {base}
          {jamb(-hw)}
          {jamb(hw)}
          {swingArc(hinged, sx, sy, t, w)}
        </g>
      );
    }
    case 'double-door':
    case 'french-window':
      return (
        <g>
          {base}
          {jamb(-hw)}
          {jamb(hw)}
          {o.kind === 'french-window' && <line x1={-hw} y1={0} x2={hw} y2={0} stroke={GLASS} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
          {swingArc(-hw, 1, sy, t, hw, 'l')}
          {swingArc(hw, -1, sy, t, hw, 'r')}
        </g>
      );
    case 'sliding-door':
    case 'sliding-window': {
      const glass = o.kind === 'sliding-window';
      return (
        <g>
          {base}
          {jamb(-hw)}
          {jamb(hw)}
          <rect x={-hw} y={-t * 0.22} width={w * 0.55} height={t * 0.16} fill={glass ? '#e0f2fe' : '#ffffff'} stroke={glass ? GLASS : LEAF} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <rect x={hw - w * 0.55} y={t * 0.06} width={w * 0.55} height={t * 0.16} fill={glass ? '#e0f2fe' : '#ffffff'} stroke={glass ? GLASS : LEAF} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
        </g>
      );
    }
    case 'garage-door':
      return (
        <g>
          {base}
          {jamb(-hw)}
          {jamb(hw)}
          <line x1={-hw} y1={0} x2={hw} y2={0} stroke={LEAF} strokeWidth={1.4} strokeDasharray="6 4" vectorEffect="non-scaling-stroke" />
        </g>
      );
    default:
      // Ventanas: marco + vidrio
      return (
        <g>
          <rect x={-hw} y={-t / 2} width={w} height={t} fill="#ffffff" stroke={LINE} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <line x1={-hw} y1={-t / 8} x2={hw} y2={-t / 8} stroke={GLASS} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          <line x1={-hw} y1={t / 8} x2={hw} y2={t / 8} stroke={GLASS} strokeWidth={1.2} vectorEffect="non-scaling-stroke" />
          {o.kind === 'window' && <line x1={0} y1={-t / 2} x2={0} y2={t / 2} stroke={LINE} strokeWidth={1} vectorEffect="non-scaling-stroke" />}
        </g>
      );
  }
}

export function openingTransform(o: Pick<Opening, 'offset'>, wall: Wall): string {
  const f = wallFrame(wall);
  const c = add(wall.start, scale(f.dir, o.offset));
  return `translate(${c.x} ${c.y}) rotate(${(f.angle * 180) / Math.PI})`;
}

export const Openings2D = memo(function Openings2D({ openings, walls }: { openings: Opening[]; walls: Record<string, Wall> }) {
  return (
    <g>
      {openings.map((o) => {
        const w = walls[o.wallId];
        if (!w) return null;
        return (
          <g key={o.id} transform={openingTransform(o, w)}>
            <OpeningSymbol o={o} thickness={w.thickness} />
          </g>
        );
      })}
    </g>
  );
});
