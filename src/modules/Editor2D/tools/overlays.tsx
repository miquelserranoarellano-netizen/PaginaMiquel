import type { Vec2 } from '@/core/geometry';
import type { SnapResult } from '../snapping';

const ACCENT = '#0d9488';

/** Marcador del tipo de ajuste aplicado en el cursor. */
export function SnapMarker({ snap, zoom }: { snap: SnapResult | null; zoom: number }) {
  if (!snap) return null;
  const r = 5 / zoom;
  const { x, y } = snap.point;
  const sw = { strokeWidth: 1.6, vectorEffect: 'non-scaling-stroke' as const };
  return (
    <g pointerEvents="none">
      {snap.guides.map((g, i) => (
        <line key={i} x1={g.from.x} y1={g.from.y} x2={g.to.x} y2={g.to.y} stroke="#f97316" strokeDasharray="4 4" {...sw} strokeWidth={1} />
      ))}
      {snap.kind === 'endpoint' && <circle cx={x} cy={y} r={r * 1.3} fill="none" stroke="#16a34a" {...sw} />}
      {snap.kind === 'midpoint' && <polygon points={`${x},${y - r * 1.3} ${x + r * 1.2},${y + r} ${x - r * 1.2},${y + r}`} fill="none" stroke="#16a34a" {...sw} />}
      {snap.kind === 'wall' && <rect x={x - r} y={y - r} width={r * 2} height={r * 2} fill="none" stroke="#16a34a" {...sw} />}
      <path d={`M${x - r} ${y}H${x + r}M${x} ${y - r}V${y + r}`} stroke={ACCENT} {...sw} />
    </g>
  );
}

/** Etiqueta con tamaño constante en pantalla. */
export function Badge({ at, text, zoom, dx = 14, dy = -14, accent = false }: { at: Vec2; text: string; zoom: number; dx?: number; dy?: number; accent?: boolean }) {
  const fs = 11.5 / zoom;
  const padX = 6 / zoom;
  const w = (text.length * 6.6 + 12) / zoom;
  const h = 19 / zoom;
  const x = at.x + dx / zoom;
  const y = at.y + dy / zoom - h / 2;
  return (
    <g pointerEvents="none">
      <rect x={x} y={y} width={w} height={h} rx={4 / zoom} fill={accent ? '#0f766e' : '#1e293b'} opacity={0.92} />
      <text x={x + padX} y={y + h / 2} fontSize={fs} dominantBaseline="central" fill="#ffffff" className="tabular-nums">
        {text}
      </text>
    </g>
  );
}
