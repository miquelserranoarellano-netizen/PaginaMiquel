/**
 * Exportaciones: plano (PNG/PDF a escala), modelo 3D (GLB/GLTF), captura 3D y proyecto.
 */
import type { Object3D } from 'three';
import { formatArea, formatNumber } from '@/core/units';
import { polygonArea } from '@/core/geometry';
import type { ProjectDoc } from '@/modules/FloorPlan/types';
import { levelBBox, sortedLevels, summarize } from '@/modules/FloorPlan/queries';
import { getViewer } from '@/modules/Editor3D/viewerRef';
import { toast } from '@/modules/UI/toast';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { downloadOrSave } from './files';
import { canvasToBlob, planSvg, svgToCanvas } from './planImage';
import { exportProjectFile, safeName } from './actions';

const PLAN_OPTIONS = { wallLengths: true, roomLabels: true, furniture: true, dimensions: true };

/** PNG del plano de la planta activa a 100 px/m (≈ 1:50 a 127 ppp). */
export async function exportPlanPng(): Promise<void> {
  const doc = projectApi.doc;
  const levelId = useEditorStore.getState().activeLevelId;
  const plan = useEditorStore.getState().plan;
  const r = planSvg(doc, levelId, { ...PLAN_OPTIONS, furniture: plan.furniture, dimensions: plan.dimensions, pxPerMeter: 100, margin: 1 });
  if (!r) return void toast.error('La planta está vacía: no hay nada que exportar');
  const canvas = await svgToCanvas(r.svg, r.width, r.height);
  const blob = await canvasToBlob(canvas);
  const level = doc.levels[levelId];
  if (await downloadOrSave(`${safeName(doc.name)} - ${safeName(level.name)}.png`, blob, 'base64', [{ name: 'Imagen PNG', extensions: ['png'] }])) toast.success('Plano exportado en PNG');
}

const SCALES = [20, 25, 50, 75, 100, 150, 200, 250, 300, 500, 1000];

/** PDF A3 apaisado: una página por planta, a escala normalizada, con cajetín y cuadro de superficies. */
export async function exportPlanPdf(): Promise<void> {
  const doc = projectApi.doc;
  const levels = sortedLevels(doc).filter((l) => levelBBox(doc, l.id));
  if (!levels.length) return void toast.error('El proyecto está vacío: no hay nada que exportar');
  toast.info('Generando PDF…');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a3' });
  const PW = 420;
  const PH = 297;
  const M = 12;
  const SIDE = 92;
  const areaW = PW - 2 * M - SIDE - 8;
  const areaH = PH - 2 * M;
  const DPI = 200;
  const total = summarize(doc);
  const date = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (i > 0) pdf.addPage('a3', 'landscape');
    const b = levelBBox(doc, level.id)!;
    const margin = 0.8;
    const wM = b.maxX - b.minX + 2 * margin;
    const hM = b.maxY - b.minY + 2 * margin;
    const scale = SCALES.find((s) => (wM * 1000) / s <= areaW && (hM * 1000) / s <= areaH) ?? 1000;
    const mmPerM = 1000 / scale;
    const ppm = (mmPerM * DPI) / 25.4;
    const r = planSvg(doc, level.id, { ...PLAN_OPTIONS, pxPerMeter: ppm, margin });
    if (!r) continue;
    const canvas = await svgToCanvas(r.svg, r.width, r.height);
    const img = canvas.toDataURL('image/png');
    const dw = wM * mmPerM;
    const dh = hM * mmPerM;
    const dx = M + (areaW - dw) / 2;
    const dy = M + (areaH - dh) / 2;
    pdf.addImage(img, 'PNG', dx, dy, dw, dh, undefined, 'FAST');

    // Marco
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.5);
    pdf.rect(M - 4, M - 4, PW - 2 * M + 8, PH - 2 * M + 8);
    const sx = PW - M - SIDE;
    pdf.setLineWidth(0.3);
    pdf.line(sx - 4, M - 4, sx - 4, PH - M + 4);

    // Cajetín
    let y = M + 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(doc.name, sx, y + 4, { maxWidth: SIDE });
    y += 13;
    pdf.setFontSize(11);
    pdf.setTextColor(13, 148, 136);
    pdf.text(level.name.toUpperCase(), sx, y);
    pdf.setTextColor(30);
    y += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const lvl = summarize(doc, level.id);
    const rows: [string, string][] = [
      ['Escala', `1:${scale}  (A3)`],
      ['Fecha', date],
      ['Superficie útil planta', formatArea(lvl.usefulArea)],
      ...(lvl.outdoorArea > 0 ? ([['Exterior planta', formatArea(lvl.outdoorArea)]] as [string, string][]) : []),
      ['Superficie útil total', formatArea(total.usefulArea)],
      ['Cota del suelo', `${formatNumber(level.elevation)} m`],
      ['Altura libre', `${formatNumber(level.height)} m`],
    ];
    for (const [k, v] of rows) {
      pdf.setTextColor(100);
      pdf.text(k, sx, y);
      pdf.setTextColor(20);
      pdf.text(v, sx + SIDE, y, { align: 'right' });
      y += 5.5;
    }
    // Cuadro de superficies
    y += 4;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Cuadro de superficies', sx, y);
    y += 2;
    pdf.setLineWidth(0.2);
    pdf.line(sx, y, sx + SIDE, y);
    y += 5;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    const rooms = Object.values(doc.rooms)
      .filter((r2) => r2.levelId === level.id)
      .sort((a, c) => polygonArea(c.points) - polygonArea(a.points));
    for (const room of rooms) {
      if (y > PH - M - 40) break;
      pdf.setFillColor(room.color);
      pdf.rect(sx, y - 2.8, 3, 3, 'F');
      pdf.setTextColor(30);
      pdf.text(room.name, sx + 5, y, { maxWidth: SIDE - 30 });
      pdf.text(formatArea(polygonArea(room.points)), sx + SIDE, y, { align: 'right' });
      y += 5;
    }
    // Barra de escala y norte
    const barY = PH - M - 18;
    const barM = scale <= 50 ? 2 : scale <= 100 ? 5 : scale <= 250 ? 10 : 20;
    const barW = barM * mmPerM;
    pdf.setDrawColor(30, 30, 30);
    pdf.setFillColor(30, 30, 30);
    for (let k = 0; k < 4; k++) {
      const seg = barW / 4;
      if (k % 2 === 0) pdf.rect(sx + k * seg, barY, seg, 2, 'F');
      else pdf.rect(sx + k * seg, barY, seg, 2);
    }
    pdf.setFontSize(8);
    pdf.text('0', sx, barY + 6);
    pdf.text(`${barM} m`, sx + barW, barY + 6, { align: 'center' });
    const nx = sx + SIDE - 8;
    const ny = barY - 4;
    pdf.triangle(nx, ny - 8, nx - 3, ny + 2, nx + 3, ny + 2, 'F');
    pdf.setFontSize(9);
    pdf.text('N', nx, ny - 10, { align: 'center' });
    pdf.setFontSize(7.5);
    pdf.setTextColor(120);
    pdf.text(`HomeDesign Studio · Hoja ${i + 1} de ${levels.length}`, sx, PH - M + 1);
  }
  const blob = pdf.output('blob');
  if (await downloadOrSave(`${safeName(doc.name)} - planos.pdf`, blob, 'base64', [{ name: 'Documento PDF', extensions: ['pdf'] }])) toast.success('Planos exportados en PDF');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Asegura que el visor 3D está montado y con la vivienda completa (todas las plantas). */
async function prepareScene(): Promise<{ root: Object3D; restore: () => void } | null> {
  const ed = useEditorStore.getState();
  const prevView = ed.view;
  const prev3d = ed.view3d;
  ed.clearSelection();
  ed.setView3d({ upToActiveLevel: false, cutaway: false, showFurniture: true, showCeilings: true });
  if (ed.view === '2d') {
    toast.info('Preparando el modelo 3D…');
    ed.setView('3d');
  }
  let root: Object3D | undefined;
  for (let i = 0; i < 150; i++) {
    root = getViewer()?.scene.getObjectByName('vivienda');
    if (root && root.children.length) break;
    await sleep(100);
  }
  await sleep(600);
  const restore = () => {
    useEditorStore.getState().setView3d(prev3d);
    if (prevView === '2d') useEditorStore.getState().setView('2d');
  };
  if (!root) {
    restore();
    return null;
  }
  return { root, restore };
}

export async function exportModel(binary: boolean): Promise<void> {
  const doc = projectApi.doc;
  if (!Object.keys(doc.walls).length && !Object.keys(doc.furniture).length) return void toast.error('El proyecto está vacío: no hay nada que exportar');
  const prepared = await prepareScene();
  if (!prepared) return void toast.error('No se pudo preparar el modelo 3D');
  try {
    const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
    const exporter = new GLTFExporter();
    const result = await exporter.parseAsync(prepared.root, { binary, onlyVisible: true, maxTextureSize: 1024 });
    const name = safeName(doc.name);
    const ok = binary
      ? await downloadOrSave(`${name}.glb`, new Blob([result as ArrayBuffer], { type: 'model/gltf-binary' }), 'base64', [{ name: 'Modelo GLB', extensions: ['glb'] }])
      : await downloadOrSave(`${name}.gltf`, JSON.stringify(result), 'utf8', [{ name: 'Modelo GLTF', extensions: ['gltf'] }]);
    if (ok) toast.success(`Modelo 3D exportado en ${binary ? 'GLB' : 'GLTF'}`);
  } catch (e) {
    console.error(e);
    toast.error('No se pudo exportar el modelo 3D');
  } finally {
    prepared.restore();
  }
}

/** Captura de la vista 3D actual en PNG. */
export async function exportScreenshot(): Promise<void> {
  const v = getViewer();
  if (!v) return void toast.info('Abre el modelo 3D o el recorrido para hacer una captura');
  v.gl.render(v.scene, v.camera);
  const blob = await canvasToBlob(v.gl.domElement);
  const doc: ProjectDoc = projectApi.doc;
  if (await downloadOrSave(`${safeName(doc.name)} - captura.png`, blob, 'base64', [{ name: 'Imagen PNG', extensions: ['png'] }])) toast.success('Captura guardada');
}

export async function exportProject(): Promise<void> {
  await exportProjectFile(projectApi.doc);
}
