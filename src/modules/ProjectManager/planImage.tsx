/**
 * Render del plano a SVG/PNG fuera de pantalla (exportación y miniaturas).
 */
import { renderToStaticMarkup } from 'react-dom/server';
import type { BBox } from '@/core/geometry';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { levelBBox } from '@/modules/FloorPlan/queries';
import { PlanDrawing, type PlanDrawingOptions } from '@/modules/Editor2D/PlanDrawing';

export interface PlanImageOptions extends PlanDrawingOptions {
  /** Píxeles por metro. */
  pxPerMeter: number;
  /** Margen alrededor del dibujo (m). */
  margin: number;
  background?: string;
  /** Caja fija a dibujar (si no, la de la planta). */
  box?: BBox;
}

export function planSvg(doc: ProjectDoc, levelId: ID, o: PlanImageOptions): { svg: string; width: number; height: number; box: BBox } | null {
  const b = o.box ?? levelBBox(doc, levelId);
  if (!b) return null;
  const box = { minX: b.minX - o.margin, minY: b.minY - o.margin, maxX: b.maxX + o.margin, maxY: b.maxY + o.margin };
  const width = Math.max(1, Math.round((box.maxX - box.minX) * o.pxPerMeter));
  const height = Math.max(1, Math.round((box.maxY - box.minY) * o.pxPerMeter));
  const markup = renderToStaticMarkup(
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      viewBox={`${box.minX} ${box.minY} ${box.maxX - box.minX} ${box.maxY - box.minY}`}
      fontFamily="Inter, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
    >
      <rect x={box.minX} y={box.minY} width={box.maxX - box.minX} height={box.maxY - box.minY} fill={o.background ?? '#ffffff'} />
      <PlanDrawing doc={doc} levelId={levelId} zoom={o.pxPerMeter} options={o} />
    </svg>,
  );
  return { svg: markup, width, height, box };
}

export function svgToCanvas(svg: string, width: number, height: number): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = width;
      c.height = height;
      const g = c.getContext('2d');
      if (!g) return reject(new Error('Canvas no disponible'));
      g.fillStyle = '#ffffff';
      g.fillRect(0, 0, width, height);
      g.drawImage(img, 0, 0, width, height);
      resolve(c);
    };
    img.onerror = () => reject(new Error('No se pudo rasterizar el plano'));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export function canvasToBlob(c: HTMLCanvasElement, type = 'image/png', quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo generar la imagen'))), type, quality));
}
