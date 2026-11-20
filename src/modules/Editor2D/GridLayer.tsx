import { memo } from 'react';
import type { Viewport2D } from '@/store/editorStore';
import type { Size } from './viewport';

/** Cuadrícula: líneas finas cada `gridSize`, más marcadas cada metro y cada 5 m. */
export const GridLayer = memo(function GridLayer({ vp, size, gridSize }: { vp: Viewport2D; size: Size; gridSize: number }) {
  const x0 = vp.cx - size.w / 2 / vp.zoom;
  const x1 = vp.cx + size.w / 2 / vp.zoom;
  const y0 = vp.cy - size.h / 2 / vp.zoom;
  const y1 = vp.cy + size.h / 2 / vp.zoom;
  const build = (step: number, skip?: number) => {
    if (step * vp.zoom < 7) return '';
    let d = '';
    const sx = Math.floor(x0 / step) * step;
    const sy = Math.floor(y0 / step) * step;
    for (let x = sx; x <= x1; x += step) {
      if (skip && Math.abs(x / skip - Math.round(x / skip)) < 1e-6) continue;
      d += `M${x.toFixed(4)} ${y0}V${y1}`;
    }
    for (let y = sy; y <= y1; y += step) {
      if (skip && Math.abs(y / skip - Math.round(y / skip)) < 1e-6) continue;
      d += `M${x0} ${y.toFixed(4)}H${x1}`;
    }
    return d;
  };
  const minor = gridSize < 1 ? build(gridSize, 1) : '';
  const major = build(1, 5);
  const major5 = build(5);
  return (
    <g pointerEvents="none">
      {minor && <path d={minor} stroke="#e8ebee" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      {major && <path d={major} stroke="#d9dee3" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      {major5 && <path d={major5} stroke="#c3cad2" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      <path d={`M${x0} 0H${x1}M0 ${y0}V${y1}`} stroke="#a7b1bb" strokeWidth={1} vectorEffect="non-scaling-stroke" />
    </g>
  );
});
