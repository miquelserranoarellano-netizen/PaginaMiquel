/** Miniatura del plano para la lista de proyectos (limitada a una cada 20 s por proyecto). */
import type { ProjectDoc } from '@/modules/FloorPlan/types';
import { levelBBox, sortedLevels } from '@/modules/FloorPlan/queries';
import { planSvg, svgToCanvas } from './planImage';

const last = new Map<string, { at: number; url: string | undefined }>();
const W = 360;
const H = 225;

export async function renderThumbnail(doc: ProjectDoc, force = false): Promise<string | undefined> {
  const prev = last.get(doc.id);
  if (prev && !force && Date.now() - prev.at < 20000) return prev.url;
  const level = sortedLevels(doc).find((l) => levelBBox(doc, l.id));
  let url: string | undefined;
  if (level) {
    const b = levelBBox(doc, level.id)!;
    const ppm = Math.min((W - 24) / (b.maxX - b.minX || 1), (H - 24) / (b.maxY - b.minY || 1));
    const r = planSvg(doc, level.id, { pxPerMeter: ppm, margin: 12 / ppm, background: '#fbfbfa', wallLengths: false, roomLabels: false, furniture: true, dimensions: false });
    if (r) url = (await svgToCanvas(r.svg, r.width, r.height)).toDataURL('image/png');
  }
  last.set(doc.id, { at: Date.now(), url });
  return url;
}
