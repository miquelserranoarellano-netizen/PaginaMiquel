import { memo } from 'react';
import type { Vec2 } from '@/core/geometry';
import { formatNumber } from '@/core/units';
import type { ElementRef, ProjectDoc } from '@/modules/FloorPlan/types';
import { analyzeFurniture } from './analysis';

const HALF_ANGLE = (30 * Math.PI) / 180;

function sector(o: Vec2, theta: number, r1: number, r2: number): string {
  const a0 = theta - HALF_ANGLE;
  const a1 = theta + HALF_ANGLE;
  const P = (r: number, a: number) => `${o.x + r * Math.cos(a)} ${o.y + r * Math.sin(a)}`;
  return `M ${P(r1, a0)} A ${r1} ${r1} 0 0 1 ${P(r1, a1)} L ${P(r2, a1)} A ${r2} ${r2} 0 0 0 ${P(r2, a0)} Z`;
}

/**
 * Guías en planta del mueble seleccionado: para televisores, la zona de visión
 * (verde = distancia ideal para sus pulgadas, ámbar = aceptable).
 */
export const FurnitureGuides2D = memo(function FurnitureGuides2D({ doc, selection, zoom }: { doc: ProjectDoc; selection: ElementRef[]; zoom: number }) {
  if (selection.length !== 1 || selection[0].kind !== 'furniture') return null;
  const item = doc.furniture[selection[0].id];
  if (!item) return null;
  const v = analyzeFurniture(doc, item).viewing;
  if (!v) return null;
  const theta = Math.atan2(v.dir.y, v.dir.x);
  const fs = 10.5 / zoom;
  const label = (r: number) => {
    const p = { x: v.origin.x + r * Math.cos(theta), y: v.origin.y + r * Math.sin(theta) };
    return (
      <text key={r} x={p.x} y={p.y} fontSize={fs} fontWeight={600} textAnchor="middle" dominantBaseline="central" fill="#0f766e" stroke="#ffffff" strokeWidth={3 / zoom} paintOrder="stroke">
        {formatNumber(r, 1)} m
      </text>
    );
  };
  return (
    <g pointerEvents="none">
      <path d={sector(v.origin, theta, v.min, v.max)} fill="#f59e0b" fillOpacity={0.08} stroke="#f59e0b" strokeOpacity={0.5} strokeWidth={1} strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
      <path d={sector(v.origin, theta, v.ideal[0], v.ideal[1])} fill="#10b981" fillOpacity={0.2} stroke="#0d9488" strokeWidth={1.4} vectorEffect="non-scaling-stroke" />
      {label(v.ideal[0])}
      {label(v.ideal[1])}
      <text
        x={v.origin.x + ((v.ideal[0] + v.ideal[1]) / 2) * Math.cos(theta) + Math.cos(theta + Math.PI / 2) * (v.ideal[1] * Math.tan(HALF_ANGLE) * 0.55)}
        y={v.origin.y + ((v.ideal[0] + v.ideal[1]) / 2) * Math.sin(theta) + Math.sin(theta + Math.PI / 2) * (v.ideal[1] * Math.tan(HALF_ANGLE) * 0.55)}
        fontSize={fs * 0.95}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0f766e"
        stroke="#ffffff"
        strokeWidth={3 / zoom}
        paintOrder="stroke"
      >
        zona ideal
      </text>
    </g>
  );
});
