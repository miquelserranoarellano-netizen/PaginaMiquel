import { useMemo } from 'react';
import { bboxOf, type Vec2 } from '@/core/geometry';
import { computeFootprints } from '@/modules/Walls/geometry';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { useWalkStore, walkRequests } from './walkStore';

const pts = (p: Vec2[]) => p.map((q) => `${q.x},${q.y}`).join(' ');

/** Minimapa de la planta con la posición y la dirección del visitante. Clic para teletransportarse. */
export function Minimap({ doc, levelId, size = 210 }: { doc: ProjectDoc; levelId: ID; size?: number }) {
  const { x, z, yaw } = useWalkStore();
  const data = useMemo(() => {
    const walls = Object.values(doc.walls).filter((w) => w.levelId === levelId);
    const rooms = Object.values(doc.rooms).filter((r) => r.levelId === levelId);
    const fps = computeFootprints(walls);
    const all = [...walls.flatMap((w) => [w.start, w.end]), ...rooms.flatMap((r) => r.points)];
    const b = all.length ? bboxOf(all) : { minX: -5, minY: -5, maxX: 5, maxY: 5 };
    const pad = 1;
    return { polys: walls.map((w) => fps.get(w.id)!.polygon), rooms, box: { minX: b.minX - pad, minY: b.minY - pad, maxX: b.maxX + pad, maxY: b.maxY + pad } };
  }, [doc.walls, doc.rooms, levelId]);
  const { box } = data;
  const w = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const fx = -Math.sin(yaw);
  const fy = -Math.cos(yaw);
  const deg = (Math.atan2(fy, fx) * 180) / Math.PI;
  const s = Math.max(w, h) / 30;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${box.minX} ${box.minY} ${w} ${h}`}
      preserveAspectRatio="xMidYMid meet"
      className="cursor-crosshair"
      onClick={(e) => {
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX;
        pt.y = e.clientY;
        const m = svg.getScreenCTM();
        if (!m) return;
        const p = pt.matrixTransform(m.inverse());
        walkRequests.teleport = { x: p.x, z: p.y };
      }}
    >
      {data.rooms.map((r) => (
        <polygon key={r.id} points={pts(r.points)} fill={r.color} opacity={0.9} />
      ))}
      {data.polys.map((p, i) => (
        <polygon key={i} points={pts(p)} fill="#1f2937" />
      ))}
      <g transform={`translate(${x} ${z}) rotate(${deg})`}>
        <path d={`M0 0 L${s * 5} ${-s * 3} A ${s * 6} ${s * 6} 0 0 1 ${s * 5} ${s * 3} Z`} fill="#0d9488" opacity={0.3} />
        <circle r={s * 1.1} fill="#0d9488" stroke="#fff" strokeWidth={s * 0.4} />
      </g>
    </svg>
  );
}
