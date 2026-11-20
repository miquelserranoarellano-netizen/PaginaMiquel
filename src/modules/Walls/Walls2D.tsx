import { memo, useMemo } from 'react';
import { add, scale } from '@/core/geometry';
import { formatNumber } from '@/core/units';
import type { Opening, Wall } from '@/modules/FloorPlan/types';
import { buildWallPieces, computeFootprints, wallFrame } from './geometry';

const pts = (p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(' ');

interface Props {
  walls: Wall[];
  openings: Opening[];
  fill?: string;
}

/** Muros en planta: se dibujan solo los tramos macizos, los huecos quedan abiertos. */
export const Walls2D = memo(function Walls2D({ walls, openings, fill = '#2e3336' }: Props) {
  const polys = useMemo(() => {
    const fps = computeFootprints(walls);
    const out: { key: string; points: string }[] = [];
    for (const w of walls) {
      const fp = fps.get(w.id)!;
      const own = openings.filter((o) => o.wallId === w.id);
      if (!own.length) {
        out.push({ key: w.id, points: pts(fp.polygon) });
        continue;
      }
      buildWallPieces(w, fp, own)
        .filter((p) => p.role === 'solid')
        .forEach((p, i) => out.push({ key: `${w.id}-${i}`, points: pts(p.quad) }));
    }
    return out;
  }, [walls, openings]);
  return (
    <g>
      {polys.map((p) => (
        <polygon key={p.key} points={p.points} fill={fill} stroke={fill} strokeWidth={0.6} vectorEffect="non-scaling-stroke" strokeLinejoin="miter" />
      ))}
    </g>
  );
});

/** Etiquetas de longitud junto a cada muro (lado B). */
export const WallLabels = memo(function WallLabels({ walls, zoom }: { walls: Wall[]; zoom: number }) {
  const fs = 10.5 / zoom;
  return (
    <g>
      {walls.map((w) => {
        const f = wallFrame(w);
        if (f.length * zoom < 42) return null;
        const mid = add(w.start, scale(f.dir, f.length / 2));
        const pos = add(mid, scale(f.normal, -(w.thickness / 2 + 9 / zoom)));
        let deg = (f.angle * 180) / Math.PI;
        if (deg > 90.5 || deg < -89.5) deg += 180;
        return (
          <text
            key={w.id}
            x={pos.x}
            y={pos.y}
            fontSize={fs}
            textAnchor="middle"
            dominantBaseline="central"
            transform={`rotate(${deg} ${pos.x} ${pos.y})`}
            fill="#475569"
            stroke="#ffffff"
            strokeWidth={3 / zoom}
            paintOrder="stroke"
            className="tabular-nums"
          >
            {formatNumber(f.length, 2)}
          </text>
        );
      })}
    </g>
  );
});
