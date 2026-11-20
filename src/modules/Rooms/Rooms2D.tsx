import { memo } from 'react';
import { bboxOf, labelPoint, polygonArea } from '@/core/geometry';
import { formatArea } from '@/core/units';
import type { Room } from '@/modules/FloorPlan/types';

const pts = (p: { x: number; y: number }[]) => p.map((q) => `${q.x},${q.y}`).join(' ');

export const Rooms2D = memo(function Rooms2D({ rooms }: { rooms: Room[] }) {
  return (
    <g>
      {rooms.map((r) => (
        <polygon key={r.id} points={pts(r.points)} fill={r.color} stroke="#94a3b8" strokeOpacity={0.55} strokeWidth={1} vectorEffect="non-scaling-stroke" />
      ))}
    </g>
  );
});

export const RoomLabels = memo(function RoomLabels({ rooms, zoom }: { rooms: Room[]; zoom: number }) {
  return (
    <g>
      {rooms.map((r) => {
        const area = polygonArea(r.points);
        const lp = labelPoint(r.points);
        const b = bboxOf(r.points);
        // El nombre se reduce para caber en la estancia (mín. 7 px en pantalla).
        const fit = ((b.maxX - b.minX) * 0.9) / Math.max(4, r.name.length * 0.6);
        const fs = Math.min(12 / zoom, fit, (b.maxY - b.minY) / 3.2);
        if (fs * zoom < 7) return null;
        return (
          <g key={r.id} pointerEvents="none">
            <text x={lp.x} y={lp.y - fs * 0.55} fontSize={fs} fontWeight={600} textAnchor="middle" fill="#1e293b" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={3 / zoom} paintOrder="stroke">
              {r.name}
            </text>
            <text x={lp.x} y={lp.y + fs * 0.75} fontSize={fs * 0.9} textAnchor="middle" fill="#475569" stroke="#ffffff" strokeOpacity={0.85} strokeWidth={3 / zoom} paintOrder="stroke">
              {formatArea(area)}
            </text>
          </g>
        );
      })}
    </g>
  );
});
