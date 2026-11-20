/**
 * "¿Cómo quedaría?": análisis de un mueble en su contexto.
 *  - Televisores: distancia de visión según pulgadas, altura de la pantalla,
 *    si cabe en el mueble que lo sostiene.
 *  - Estanterías: huecos, metros de balda, capacidad y flecha de las baldas.
 *  - Todos: si cabe en la pared, si tapa puertas o ventanas, si llega al
 *    techo y si choca con otros muebles.
 */
import { type Vec2, add, dot, orientedRect, pointInPolygon, polygonArea, projectOnSegment, rotate, sub, length } from '@/core/geometry';
import { degToRad, formatCm, formatLength, formatNumber } from '@/core/units';
import type { FurnitureItem, ProjectDoc } from '@/modules/FloorPlan/types';
import { getOpeningDef } from '@/modules/DoorsAndWindows/catalog';
import { wallFrame } from '@/modules/Walls/geometry';
import { getCatalogItem } from './catalog';
import { SHELF_T, TV_BEZEL, TV_STAND_H, pint, pnum, resolveParams, shelfLayout, suggestedInches, tvScreen } from './params';

export type FindingLevel = 'ok' | 'warn' | 'info';

export interface Finding {
  level: FindingLevel;
  title: string;
  detail?: string;
}

export interface Analysis {
  /** Datos calculados (pantalla, capacidad…) para mostrar como tabla. */
  facts: { label: string; value: string }[];
  findings: Finding[];
  /** Zona de visión recomendada (para dibujarla en el plano). */
  viewing?: { origin: Vec2; dir: Vec2; min: number; max: number; ideal: [number, number] };
}

const TV_IDS = new Set(['tv-55', 'tv-65-wall']);
const SEAT_IDS = new Set(['sofa-3', 'sofa-2', 'sofa-l', 'armchair', 'bed-double', 'bed-king', 'bed-single', 'lounger']);

/** Vector del frente del mueble en planta (+y local girado). */
export const frontDir = (f: Pick<FurnitureItem, 'rotation'>): Vec2 => rotate({ x: 0, y: 1 }, degToRad(f.rotation));

const footprint = (f: FurnitureItem) => orientedRect(f.position, f.width, f.depth, degToRad(f.rotation));

/** Intersección de dos polígonos convexos (ejes separadores). */
function convexOverlap(a: Vec2[], b: Vec2[]): boolean {
  for (const poly of [a, b]) {
    for (let i = 0; i < poly.length; i++) {
      const p = poly[i];
      const q = poly[(i + 1) % poly.length];
      const axis = { x: -(q.y - p.y), y: q.x - p.x };
      const pa = a.map((v) => dot(v, axis));
      const pb = b.map((v) => dot(v, axis));
      if (Math.max(...pa) <= Math.min(...pb) + 1e-4 || Math.max(...pb) <= Math.min(...pa) + 1e-4) return false;
    }
  }
  return true;
}

function ceilingAt(doc: ProjectDoc, f: FurnitureItem): number {
  const level = doc.levels[f.levelId];
  const room = Object.values(doc.rooms)
    .filter((r) => r.levelId === f.levelId && pointInPolygon(f.position, r.points))
    .sort((a, b) => polygonArea(a.points) - polygonArea(b.points))[0];
  if (room && !room.hasCeiling) return Infinity;
  return room?.ceilingHeight ?? level?.height ?? 2.7;
}

/** Muro en el que se apoya la trasera del mueble (si lo hay). */
function supportWall(doc: ProjectDoc, f: FurnitureItem) {
  const back = add(f.position, rotate({ x: 0, y: -f.depth / 2 }, degToRad(f.rotation)));
  let best: { wallId: string; u: number; dist: number } | null = null;
  for (const w of Object.values(doc.walls)) {
    if (w.levelId !== f.levelId) continue;
    const pr = projectOnSegment(back, w.start, w.end, false);
    const fr = wallFrame(w);
    const aligned = Math.abs(dot(frontDir(f), fr.normal)) > 0.95;
    if (!aligned || pr.distance > w.thickness / 2 + 0.12) continue;
    if (!best || pr.distance < best.dist) best = { wallId: w.id, u: pr.t * fr.length, dist: pr.distance };
  }
  return best;
}

export function analyzeFurniture(doc: ProjectDoc, f: FurnitureItem): Analysis {
  const cat = getCatalogItem(f.catalogId);
  const p = resolveParams(cat, f.params);
  const facts: Analysis['facts'] = [];
  const findings: Finding[] = [];
  let viewing: Analysis['viewing'];
  const others = Object.values(doc.furniture).filter((o) => o.levelId === f.levelId && o.id !== f.id);

  // ── Televisores ─────────────────────────────────────────────────────────
  if (cat && TV_IDS.has(cat.id)) {
    const inches = pint(p, 'inches', 55, 24, 110);
    const screen = tvScreen(inches);
    const withStand = cat.id === 'tv-55';
    facts.push({ label: 'Pantalla', value: `${formatCm(screen.w)} × ${formatCm(screen.h)}` });
    facts.push({ label: 'Diagonal', value: `${inches}" (${formatCm(screen.diag)})` });
    facts.push({ label: 'Medidas totales', value: `${formatCm(f.width)} × ${formatCm(f.height)}` });
    const ideal: [number, number] = [screen.diag * 1.2, screen.diag * 1.6];
    facts.push({ label: 'Distancia ideal (4K)', value: `${formatNumber(ideal[0], 1)} – ${formatNumber(ideal[1], 1)} m` });
    const front = frontDir(f);
    const origin = add(f.position, rotate({ x: 0, y: withStand ? 0 : f.depth / 2 }, degToRad(f.rotation)));
    viewing = { origin, dir: front, min: screen.diag * 1.0, max: screen.diag * 2.5, ideal };

    // Asiento principal que mira hacia la pantalla: primero sofás y camas, luego sillones.
    let seat: { item: FurnitureItem; dist: number; rank: number } | null = null;
    for (const o of others) {
      if (!SEAT_IDS.has(o.catalogId)) continue;
      const v = sub(o.position, origin);
      const d = length(v);
      if (d < 0.3 || dot(front, v) < 0.5 * d) continue; // fuera del ángulo de la pantalla
      if (dot(frontDir(o), v) > 0.2 * d) continue; // el asiento no mira hacia la TV
      const rank = o.catalogId === 'armchair' || o.catalogId === 'lounger' ? 1 : 0;
      if (!seat || rank < seat.rank || (rank === seat.rank && d < seat.dist)) seat = { item: o, dist: d, rank };
    }
    if (seat) {
      // Distancia aproximada a los ojos: hasta el respaldo menos ~35 cm.
      const eye = Math.max(0.5, seat.dist + seat.item.depth / 2 - 0.35);
      facts.push({ label: `Distancia desde ${seat.item.name.toLowerCase()}`, value: formatLength(eye, 1) });
      const ratio = eye / screen.diag;
      const sug = suggestedInches(eye);
      if (ratio < 1.0) findings.push({ level: 'warn', title: 'Pantalla demasiado grande para esta distancia', detail: `A ${formatLength(eye, 1)} lo recomendable son unas ${sug}". Aleja el sofá o elige menos pulgadas.` });
      else if (ratio <= 1.75) findings.push({ level: 'ok', title: 'Tamaño ideal para la distancia de visión', detail: `A ${formatLength(eye, 1)} la pantalla ocupa un campo de visión de cine (unos 30–40°).` });
      else if (ratio <= 2.5) findings.push({ level: 'info', title: 'Algo pequeña para esta distancia', detail: `Con ${sug}" la experiencia sería más inmersiva.` });
      else findings.push({ level: 'warn', title: 'Pantalla pequeña para esta distancia', detail: `Se recomiendan unas ${sug}" o acercar el sofá a ${formatLength(ideal[1], 1)}.` });
    } else findings.push({ level: 'info', title: 'No hay ningún sofá ni cama frente al televisor', detail: 'Coloca un asiento mirando a la pantalla para calcular la distancia de visión.' });

    // Altura del centro de la pantalla (ojos sentados ≈ 1,0–1,15 m)
    const center = f.elevation + (withStand ? TV_STAND_H : 0) + TV_BEZEL + screen.h / 2;
    facts.push({ label: 'Centro de la pantalla', value: `${formatLength(center, 2)} del suelo` });
    if (center > 1.35) findings.push({ level: 'warn', title: 'Pantalla alta', detail: `El centro queda a ${formatLength(center, 2)}; sentado se ve mejor hacia 1,05 m (bájala ${formatCm(center - 1.05)}).` });
    else if (center < 0.8) findings.push({ level: 'info', title: 'Pantalla baja', detail: `El centro queda a ${formatLength(center, 2)}; lo cómodo sentado es 1,0–1,15 m.` });
    else findings.push({ level: 'ok', title: 'Altura cómoda para ver sentado' });

    // ¿Cabe en el mueble que la sostiene?
    if (f.elevation > 0.05) {
      const support = others.find((o) => Math.abs(o.elevation + o.height - f.elevation) < 0.04 && pointInPolygon(f.position, footprint(o)));
      if (support) {
        const over = f.width - support.width;
        if (over > 0.005) findings.push({ level: 'warn', title: `Sobresale ${formatCm(over)} de ${support.name.toLowerCase()}`, detail: `La TV mide ${formatCm(f.width)} y el mueble ${formatCm(support.width)}.` });
        else findings.push({ level: 'ok', title: `Cabe en ${support.name.toLowerCase()}`, detail: `Sobran ${formatCm(-over)} de ancho (${formatCm(f.width)} de ${formatCm(support.width)}).` });
      } else if (withStand) findings.push({ level: 'info', title: 'No está apoyada en ningún mueble', detail: 'Colócala sobre un mueble de TV o ajusta su elevación.' });
    }
  }

  // ── Estanterías ─────────────────────────────────────────────────────────
  if (cat && (cat.id === 'bookshelf' || cat.id === 'cube-shelf' || cat.id === 'wall-shelves')) {
    let levels: number;
    let columns: number;
    let clearH: number;
    let clearW: number;
    let boardT = SHELF_T;
    if (cat.id === 'wall-shelves') {
      levels = pint(p, 'count', 3, 1, 8);
      columns = 1;
      clearH = Math.max(0, pnum(p, 'spacing', 0.35) - 0.03);
      clearW = f.width;
      boardT = 0.03;
    } else if (cat.id === 'cube-shelf') {
      levels = pint(p, 'rows', 4, 1, 6);
      columns = pint(p, 'cols', 4, 1, 6);
      boardT = 0.039;
      const l = shelfLayout(f.width, f.height, levels, columns, boardT);
      clearH = l.clearHeight;
      clearW = l.clearWidth;
    } else {
      levels = pint(p, 'levels', 5, 1, 12);
      columns = pint(p, 'columns', 1, 1, 8);
      const l = shelfLayout(f.width, f.height, levels, columns);
      clearH = l.clearHeight;
      clearW = l.clearWidth;
    }
    const linear = clearW * columns * levels;
    facts.push({ label: 'Huecos', value: `${levels} × ${columns} = ${levels * columns}` });
    facts.push({ label: 'Hueco libre', value: `${formatCm(clearW)} ancho × ${cat.id === 'wall-shelves' ? formatCm(clearH) + ' entre baldas' : formatCm(clearH) + ' alto'}` });
    facts.push({ label: 'Metros de balda', value: formatLength(linear, 1) });
    const usable = clearH >= 0.24 ? linear : clearH >= 0.18 ? linear * 0.7 : 0;
    facts.push({ label: 'Capacidad aprox.', value: usable > 0 ? `${Math.round(usable * 30)} libros` : '—' });
    if (clearH < 0.18) findings.push({ level: 'warn', title: 'Huecos muy bajos', detail: `Con ${formatCm(clearH)} solo caben objetos pequeños; reduce el número de baldas.` });
    else if (clearH < 0.24) findings.push({ level: 'info', title: 'Huecos para libros de bolsillo', detail: `Caben libros de hasta ${formatCm(clearH - 0.02)}; para libros grandes se necesitan unos 26 cm.` });
    else findings.push({ level: 'ok', title: 'Caben libros de tamaño normal', detail: `Altura útil por hueco: ${formatCm(clearH)}.` });
    // Flecha: baldas largas de tablero se curvan con el peso.
    if (clearW > 0.9 && boardT <= 0.03) findings.push({ level: 'warn', title: `Baldas de ${formatCm(clearW)} sin apoyo intermedio`, detail: cat.id === 'bookshelf' ? 'Por encima de 80–90 cm se combarán con libros: añade un módulo (columna).' : 'Usa escuadras intermedias o baldas más cortas.' });
  }

  // ── Comprobaciones generales ────────────────────────────────────────────
  const top = f.elevation + f.height;
  const ceiling = ceilingAt(doc, f);
  if (Number.isFinite(ceiling)) {
    if (top > ceiling + 0.005) findings.push({ level: 'warn', title: `Sobrepasa el techo ${formatCm(top - ceiling)}`, detail: `Altura total ${formatLength(top, 2)} y techo a ${formatLength(ceiling, 2)}.` });
    else if (f.height > 1.2) facts.push({ label: 'Hasta el techo', value: formatCm(ceiling - top) });
  }

  const wall = supportWall(doc, f);
  if (wall) {
    const w = doc.walls[wall.wallId];
    const fr = wallFrame(w);
    // Extensión del mueble a lo largo del muro
    const along = dot(sub(f.position, w.start), fr.dir);
    const u0 = along - f.width / 2;
    const u1 = along + f.width / 2;
    if (u0 < -0.01 || u1 > fr.length + 0.01) findings.push({ level: 'warn', title: 'Sobresale del muro en el que se apoya', detail: `El muro mide ${formatLength(fr.length)} y el mueble ${formatLength(f.width)}.` });
    const blocked: string[] = [];
    for (const o of Object.values(doc.openings)) {
      if (o.wallId !== w.id) continue;
      const overlapH = Math.min(u1, o.offset + o.width / 2) - Math.max(u0, o.offset - o.width / 2);
      const overlapV = Math.min(top, o.sill + o.height) - Math.max(f.elevation, o.sill);
      if (overlapH > 0.02 && overlapV > 0.02) blocked.push(getOpeningDef(o.kind).name.toLowerCase());
    }
    if (blocked.length) findings.push({ level: 'warn', title: `Tapa ${blocked.join(' y ')}`, detail: 'Desplázalo a lo largo del muro o cambia sus medidas.' });
    else findings.push({ level: 'ok', title: 'Cabe en la pared sin tapar huecos', detail: `Libre a los lados: ${formatCm(Math.max(0, u0))} y ${formatCm(Math.max(0, fr.length - u1))} (medido al eje del muro).` });
  }

  const fp = footprint(f);
  const clashes = others.filter((o) => {
    if (o.height < 0.03 || f.height < 0.03) return false; // alfombras
    const vOverlap = Math.min(top, o.elevation + o.height) - Math.max(f.elevation, o.elevation);
    return vOverlap > 0.02 && convexOverlap(fp, footprint(o));
  });
  if (clashes.length) findings.push({ level: 'warn', title: `Choca con ${clashes.map((c) => c.name.toLowerCase()).slice(0, 3).join(', ')}`, detail: 'Los volúmenes se solapan en planta y en altura.' });

  // Paso libre delante (60 cm recomendados) para muebles de suelo
  if (f.elevation < 0.1 && f.height > 0.3 && !TV_IDS.has(f.catalogId)) {
    const probe = add(f.position, rotate({ x: 0, y: f.depth / 2 + 0.3 }, degToRad(f.rotation)));
    const zone = orientedRect(probe, f.width * 0.8, 0.58, degToRad(f.rotation));
    const blocker = others.find((o) => o.height > 0.3 && o.elevation < 1 && convexOverlap(zone, footprint(o)));
    if (blocker && !clashes.includes(blocker)) findings.push({ level: 'info', title: `Menos de 60 cm libres delante (${blocker.name.toLowerCase()})`, detail: 'Para abrir puertas y cajones y pasar con comodidad se recomiendan 60–90 cm.' });
  }

  return { facts, findings, viewing };
}

export const _internals = { convexOverlap };
