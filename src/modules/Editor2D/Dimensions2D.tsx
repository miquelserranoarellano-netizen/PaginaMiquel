import { memo } from 'react';
import { type Vec2, add, distance, normalize, perp, scale, sub } from '@/core/geometry';
import { formatNumber } from '@/core/units';
import type { Dimension } from '@/modules/FloorPlan/types';

const COLOR = '#0f766e';

/** Cota con líneas de referencia, marcas oblicuas y texto centrado. */
export function DimensionLine({ start, end, offset, zoom, color = COLOR, label }: { start: Vec2; end: Vec2; offset: number; zoom: number; color?: string; label?: string }) {
  const len = distance(start, end);
  if (len < 1e-6) return null;
  const d = normalize(sub(end, start));
  const n = perp(d);
  const a = add(start, scale(n, offset));
  const b = add(end, scale(n, offset));
  const tick = 5 / zoom;
  const ext = 4 / zoom;
  const sgn = offset >= 0 ? 1 : -1;
  const mid = scale(add(a, b), 0.5);
  let deg = (Math.atan2(d.y, d.x) * 180) / Math.PI;
  if (deg > 90.5 || deg < -89.5) deg += 180;
  const fs = 10.5 / zoom;
  const textPos = add(mid, scale(n, -7 / zoom));
  const tickPath = (p: Vec2) => {
    const v = scale(add(d, n), tick * 0.7);
    return `M ${p.x - v.x} ${p.y - v.y} L ${p.x + v.x} ${p.y + v.y}`;
  };
  return (
    <g>
      {Math.abs(offset) > 1e-6 && (
        <>
          <line x1={start.x} y1={start.y} x2={a.x + n.x * ext * sgn} y2={a.y + n.y * ext * sgn} stroke={color} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
          <line x1={end.x} y1={end.y} x2={b.x + n.x * ext * sgn} y2={b.y + n.y * ext * sgn} stroke={color} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
        </>
      )}
      <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <path d={`${tickPath(a)} ${tickPath(b)}`} stroke={color} strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      <text
        x={textPos.x}
        y={textPos.y}
        fontSize={fs}
        fontWeight={600}
        textAnchor="middle"
        dominantBaseline="central"
        transform={`rotate(${deg} ${textPos.x} ${textPos.y})`}
        fill={color}
        stroke="#ffffff"
        strokeWidth={3 / zoom}
        paintOrder="stroke"
      >
        {label ?? `${formatNumber(len, 2)} m`}
      </text>
    </g>
  );
}

export const Dimensions2D = memo(function Dimensions2D({ dims, zoom }: { dims: Dimension[]; zoom: number }) {
  return (
    <g>
      {dims.map((d) => (
        <DimensionLine key={d.id} start={d.start} end={d.end} offset={d.offset} zoom={zoom} />
      ))}
    </g>
  );
});
