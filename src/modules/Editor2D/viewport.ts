import type { BBox, Vec2 } from '@/core/geometry';
import type { Viewport2D } from '@/store/editorStore';

export interface Size {
  w: number;
  h: number;
}

export const MIN_ZOOM = 4;
export const MAX_ZOOM = 1200;

export const screenToWorld = (vp: Viewport2D, size: Size, s: Vec2): Vec2 => ({
  x: vp.cx + (s.x - size.w / 2) / vp.zoom,
  y: vp.cy + (s.y - size.h / 2) / vp.zoom,
});

export const worldToScreen = (vp: Viewport2D, size: Size, p: Vec2): Vec2 => ({
  x: (p.x - vp.cx) * vp.zoom + size.w / 2,
  y: (p.y - vp.cy) * vp.zoom + size.h / 2,
});

/** Zoom manteniendo fijo el punto de pantalla `anchor`. */
export function zoomAt(vp: Viewport2D, size: Size, anchor: Vec2, factor: number): Viewport2D {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, vp.zoom * factor));
  const before = screenToWorld(vp, size, anchor);
  const after = screenToWorld({ ...vp, zoom }, size, anchor);
  return { cx: vp.cx + before.x - after.x, cy: vp.cy + before.y - after.y, zoom };
}

export function fitBBox(box: BBox, size: Size, margin = 60): Viewport2D {
  const w = Math.max(1, box.maxX - box.minX);
  const h = Math.max(1, box.maxY - box.minY);
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.min((size.w - margin * 2) / w, (size.h - margin * 2) / h)));
  return { cx: (box.minX + box.maxX) / 2, cy: (box.minY + box.maxY) / 2, zoom };
}

export const worldTransform = (vp: Viewport2D, size: Size): string =>
  `translate(${size.w / 2} ${size.h / 2}) scale(${vp.zoom}) translate(${-vp.cx} ${-vp.cy})`;
