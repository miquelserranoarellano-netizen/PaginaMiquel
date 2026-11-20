import { memo } from 'react';
import { lighten } from '@/core/color';
import type { FurnitureItem } from '@/modules/FloorPlan/types';
import { getCatalogItem } from './catalog';
import { furnitureSymbol } from './symbol';

const STROKE = '#5b6670';

export function FurnitureSymbol({ item }: { item: Pick<FurnitureItem, 'catalogId' | 'width' | 'depth' | 'height' | 'materials' | 'name' | 'assetId'> }) {
  const cat = getCatalogItem(item.catalogId);
  if (!cat || item.assetId) {
    const fs = Math.min(item.width, item.depth) * 0.22;
    return (
      <g>
        <rect x={-item.width / 2} y={-item.depth / 2} width={item.width} height={item.depth} fill="#f8fafc" stroke={STROKE} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <line x1={-item.width / 2} y1={-item.depth / 2} x2={item.width / 2} y2={item.depth / 2} stroke="#cbd5e1" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        <line x1={item.width / 2} y1={-item.depth / 2} x2={-item.width / 2} y2={item.depth / 2} stroke="#cbd5e1" strokeWidth={0.8} vectorEffect="non-scaling-stroke" />
        <text x={0} y={0} fontSize={Math.max(0.05, Math.min(0.2, fs))} textAnchor="middle" dominantBaseline="central" fill="#334155">
          {item.name}
        </text>
      </g>
    );
  }
  const shapes = furnitureSymbol(cat, item.width, item.depth, item.height);
  const fill = (slot: string) => {
    const m = item.materials[slot] ?? cat.slots[slot];
    if (!m) return '#ffffff';
    if (m.materialId === 'vidrio' || m.materialId === 'vidrio-mate') return '#e0f2fe';
    return lighten(m.color, 0.55);
  };
  return (
    <g>
      {shapes.map((s, i) =>
        s.kind === 'poly' ? (
          <polygon key={i} points={s.points} fill={fill(s.slot)} stroke={STROKE} strokeWidth={0.7} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        ) : (
          <ellipse key={i} cx={s.cx} cy={s.cy} rx={s.rx} ry={s.ry} transform={s.rot ? `rotate(${s.rot} ${s.cx} ${s.cy})` : undefined} fill={fill(s.slot)} stroke={STROKE} strokeWidth={0.7} vectorEffect="non-scaling-stroke" />
        ),
      )}
    </g>
  );
}

export const furnitureTransform = (f: Pick<FurnitureItem, 'position' | 'rotation'>) => `translate(${f.position.x} ${f.position.y}) rotate(${f.rotation})`;

export const Furniture2D = memo(function Furniture2D({ items }: { items: FurnitureItem[] }) {
  const sorted = [...items].sort((a, b) => a.elevation + a.height - (b.elevation + b.height));
  return (
    <g>
      {sorted.map((f) => (
        <g key={f.id} transform={furnitureTransform(f)}>
          <FurnitureSymbol item={f} />
        </g>
      ))}
    </g>
  );
});
