/**
 * Casa de ejemplo: vivienda unifamiliar de una planta (~110 m² útiles) con
 * garaje, terraza y piscina, totalmente amueblada. Se genera con las mismas
 * operaciones que usa el editor, así que es 100 % editable.
 */
import { type Vec2, add, dot, pointInPolygon, projectOnSegment, scale } from '@/core/geometry';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { createOpening } from '@/modules/FloorPlan/factory';
import type { OpeningKind, Opening, ProjectDoc, RoomType, SurfaceMaterial, Wall } from '@/modules/FloorPlan/types';
import { addWallMerged } from '@/modules/Walls/ops';
import { wallFrame } from '@/modules/Walls/geometry';
import { addDetectedRoom, addPolygonRoom } from '@/modules/Rooms/ops';
import { getCatalogItem } from '@/modules/Furniture/catalog';
import { createFurniture } from '@/modules/Furniture/factory';
import { tvSize } from '@/modules/Furniture/params';
import type { FurnitureItem } from '@/modules/FloorPlan/types';

const PAINT: SurfaceMaterial = { materialId: 'pintura', color: '#f3f1ec' };
const RENDER: SurfaceMaterial = { materialId: 'pintura', color: '#f4f3ef' };

export function createSampleHouse(): ProjectDoc {
  const doc = createEmptyProject('Casa de ejemplo');
  doc.settings.defaultInterior = { ...PAINT };
  const L = Object.keys(doc.levels)[0];

  const wall = (a: [number, number], b: [number, number], thickness: number) => {
    doc.settings.defaultWallThickness = thickness;
    addWallMerged(doc, L, { x: a[0], y: a[1] }, { x: b[0], y: b[1] });
  };
  // Muros exteriores (25 cm)
  wall([0, 0], [12, 0], 0.25);
  wall([12, 0], [18, 0], 0.25);
  wall([18, 0], [18, 6], 0.25);
  wall([18, 6], [12, 6], 0.25);
  wall([12, 0], [12, 11], 0.25);
  wall([12, 11], [0, 11], 0.25);
  wall([0, 11], [0, 0], 0.25);
  // Tabiques (12 cm)
  wall([0, 4], [12, 4], 0.12);
  wall([0, 5.4], [12, 5.4], 0.12);
  wall([5, 0], [5, 4], 0.12);
  wall([8, 0], [8, 4], 0.12);
  wall([7, 5.4], [7, 11], 0.12);
  doc.settings.defaultWallThickness = 0.2;

  // Acabados: cara exterior de la fachada con estuco (o piedra en la fachada principal).
  const footprint: Vec2[] = [
    { x: 0, y: 0 },
    { x: 18, y: 0 },
    { x: 18, y: 6 },
    { x: 12, y: 6 },
    { x: 12, y: 11 },
    { x: 0, y: 11 },
  ];
  for (const w of Object.values(doc.walls)) {
    const f = wallFrame(w);
    const mid = add(w.start, scale(f.dir, f.length / 2));
    const aOut = !pointInPolygon(add(mid, scale(f.normal, 0.4)), footprint);
    const bOut = !pointInPolygon(add(mid, scale(f.normal, -0.4)), footprint);
    // Fachadas blancas (estilo maqueta) con un paño de piedra junto a la terraza.
    const facade = Math.abs(mid.y - 11) < 0.01 && mid.x < 7 ? { materialId: 'piedra', color: '#b9b2a6' } : RENDER;
    if (aOut) w.sideA = { ...facade };
    if (bOut) w.sideB = { ...facade };
  }

  // Huecos (posición absoluta sobre el eje del muro)
  const openingAt = (x: number, y: number, kind: OpeningKind, extra: Partial<Opening> = {}) => {
    let best: { w: Wall; d: number; u: number } | null = null;
    for (const w of Object.values(doc.walls)) {
      const pr = projectOnSegment({ x, y }, w.start, w.end);
      if (pr.distance < 0.05 && (!best || pr.distance < best.d)) best = { w, d: pr.distance, u: pr.t * wallFrame(w).length };
    }
    if (!best) throw new Error(`No hay muro en (${x}, ${y})`);
    const o = createOpening(L, best.w.id, kind, best.u, extra);
    doc.openings[o.id] = o;
    return o;
  };
  // Lado de apertura: hacia el punto indicado.
  const towards = (x: number, y: number, tx: number, ty: number): 'a' | 'b' => {
    for (const w of Object.values(doc.walls)) {
      const pr = projectOnSegment({ x, y }, w.start, w.end);
      if (pr.distance < 0.05) return dot({ x: tx - x, y: ty - y }, wallFrame(w).normal) >= 0 ? 'a' : 'b';
    }
    return 'a';
  };
  openingAt(0, 4.7, 'entrance-door', { swing: towards(0, 4.7, 1, 4.7) });
  openingAt(2.5, 4, 'door', { swing: towards(2.5, 4, 2.5, 3), hinge: 'right' });
  openingAt(6.5, 4, 'door', { swing: towards(6.5, 4, 6.5, 3) });
  openingAt(10, 4, 'door', { swing: towards(10, 4, 10, 3) });
  openingAt(3.5, 5.4, 'double-door', { swing: towards(3.5, 5.4, 3.5, 6.5) });
  openingAt(9.5, 5.4, 'door', { swing: towards(9.5, 5.4, 9.5, 6.5) });
  openingAt(12, 4.7, 'door', { swing: towards(12, 4.7, 13, 4.7) });
  openingAt(7, 6.3, 'sliding-door', { width: 1.2 });
  // Ventanas
  openingAt(2.5, 0, 'window', { width: 1.4 });
  openingAt(0, 1.2, 'window', { width: 1.0 });
  openingAt(6.5, 0, 'small-window', { width: 0.8, sill: 1.4 });
  openingAt(10, 0, 'window');
  openingAt(3.5, 11, 'sliding-window', { width: 3.0, swing: towards(3.5, 11, 3.5, 12) });
  openingAt(0, 8.2, 'window', { width: 1.4 });
  openingAt(9.5, 11, 'window', { width: 1.6 });
  openingAt(12, 8.5, 'window', { width: 1.2, sill: 1.05, height: 1.05 });
  openingAt(15, 6, 'garage-door', { width: 2.8 });
  openingAt(18, 3, 'small-window', { width: 1.0 });

  // Estancias detectadas automáticamente a partir de los muros
  const room = (p: [number, number], type: RoomType, name?: string, patch: Partial<ProjectDoc['rooms'][string]> = {}) => {
    const id = addDetectedRoom(doc, L, { x: p[0], y: p[1] }, type);
    if (!id) throw new Error(`No se pudo detectar la estancia en ${p}`);
    if (name) doc.rooms[id].name = name;
    Object.assign(doc.rooms[id], patch);
    return id;
  };
  room([2.5, 2], 'dormitorio', 'Dormitorio principal', { floor: { materialId: 'parquet-espiga', color: '#b38a5f' } });
  room([6.5, 2], 'bano', 'Baño');
  room([10, 2], 'dormitorio', 'Dormitorio 2', { floor: { materialId: 'parquet-gris', color: '#a39a90' } });
  room([6, 4.7], 'pasillo', 'Pasillo');
  room([3.5, 8], 'salon', 'Salón comedor', { floor: { materialId: 'parquet-roble', color: '#b98d62' } });
  room([9.5, 8], 'cocina', 'Cocina', { floor: { materialId: 'parquet-roble', color: '#b98d62' } });
  room([15, 3], 'garaje', 'Garaje', { floor: { materialId: 'hormigon-pulido', color: '#c9c8c4' } });
  const terrace = addPolygonRoom(doc, L, [{ x: 0, y: 11.125 }, { x: 7.2, y: 11.125 }, { x: 7.2, y: 14.2 }, { x: 0, y: 14.2 }], 'terraza', false);
  if (terrace) doc.rooms[terrace].name = 'Terraza';
  const pool = addPolygonRoom(doc, L, [{ x: 8.6, y: 12.4 }, { x: 14.6, y: 12.4 }, { x: 14.6, y: 15.4 }, { x: 8.6, y: 15.4 }], 'piscina', false);
  if (pool) doc.rooms[pool].name = 'Piscina';

  // Revestimientos del baño y pared de madera en el salón
  for (const w of Object.values(doc.walls)) {
    const f = wallFrame(w);
    const mid = add(w.start, scale(f.dir, f.length / 2));
    const inBath = (p: Vec2) => p.x > 5 && p.x < 8 && p.y > 0 && p.y < 4;
    if (inBath(add(mid, scale(f.normal, 0.3)))) w.sideA = { materialId: 'azulejo-blanco', color: '#f6f6f3' };
    if (inBath(add(mid, scale(f.normal, -0.3)))) w.sideB = { materialId: 'azulejo-blanco', color: '#f6f6f3' };
    if (Math.abs(mid.x - 7) < 0.01 && mid.y > 5.4) {
      if (add(mid, scale(f.normal, 0.3)).x < 7) w.sideA = { materialId: 'madera-paneles', color: '#a3774f' };
      else w.sideB = { materialId: 'madera-paneles', color: '#a3774f' };
    }
  }

  // Mobiliario
  const put = (id: string, x: number, y: number, rotation = 0, patch: Partial<FurnitureItem> = {}) => {
    const item = getCatalogItem(id);
    if (!item) throw new Error(`Falta ${id} en el catálogo`);
    const f = createFurniture(L, item, { x, y }, rotation, patch);
    doc.furniture[f.id] = f;
    return f;
  };
  // Dormitorio principal
  put('bed-double', 2.6, 1.15);
  put('nightstand', 1.5, 0.33);
  put('nightstand', 3.7, 0.33);
  put('table-lamp', 1.5, 0.33);
  put('table-lamp', 3.7, 0.33);
  put('wardrobe-3', 0.43, 3.1, 270);
  put('rug', 2.6, 2.5, 0, { width: 2.2, depth: 1.2 });
  put('painting', 4.92, 2.0, 90, { width: 1.0 });
  // Baño
  put('bathtub', 7.08, 0.51);
  put('toilet', 5.4, 2.1, 270);
  put('vanity', 7.71, 2.6, 90);
  put('mirror', 7.92, 2.6, 90);
  put('towel-rail', 6.3, 3.88, 180);
  // Dormitorio 2
  put('bed-single', 11.4, 1.13);
  put('desk', 9.2, 0.48);
  put('office-chair', 9.2, 1.2, 180);
  put('computer', 9.2, 0.33);
  put('wardrobe-2', 8.36, 3.2, 270);
  put('rug-round', 10.4, 2.6, 0, { width: 1.3, depth: 1.3 });
  // Pasillo
  put('shoe-cabinet', 0.6, 4.2);
  put('plant-small', 11.6, 5.1);
  put('painting', 6.0, 4.08, 0, { width: 1.2, height: 0.5 });
  // Salón comedor
  put('tv-stand', 6.73, 9.3, 90);
  const tv = tvSize(75, true);
  put('tv-55', 6.73, 9.3, 90, { name: 'Televisor 75"', params: { inches: 75 }, width: tv.w, depth: tv.d, height: tv.h });
  put('sofa-3', 3.55, 9.3, 270);
  put('coffee-table', 4.55, 9.3, 90);
  put('rug', 4.2, 9.3, 90, { width: 2.6, depth: 1.8 });
  put('armchair', 4.5, 10.35, 180, { rotation: 225 });
  put('floor-lamp', 2.3, 10.55);
  put('outdoor-dining', 2.4, 7.0, 0, { name: 'Mesa de comedor con sillas' });
  put('pendant', 2.4, 7.0);
  put('bookshelf', 1.3, 5.64, 0, { width: 1.6, params: { levels: 5, columns: 2, back: true, books: true } });
  put('plant', 6.5, 10.4);
  put('plant', 0.55, 10.45);
  put('sideboard', 5.6, 5.7);
  // Cocina
  put('fridge', 11.54, 5.8, 90);
  put('kitchen-base', 11.575, 7.01, 90, { width: 1.78 });
  put('kitchen-sink', 11.575, 8.5, 90);
  put('kitchen-hob', 11.575, 9.4, 90);
  put('kitchen-base', 11.575, 10.29, 90, { width: 1.17 });
  put('hood', 11.625, 9.4, 90);
  put('kitchen-wall', 11.7, 7.01, 90, { width: 1.78 });
  put('kitchen-island', 9.0, 8.4, 90);
  put('stool', 8.0, 7.9);
  put('stool', 8.0, 8.9);
  put('pendant', 9.0, 7.8, 0, { elevation: 1.75 });
  put('pendant', 9.0, 9.0, 0, { elevation: 1.75 });
  // Garaje
  put('car', 15, 3.1);
  put('washer', 12.6, 0.43);
  put('dryer', 13.25, 0.43);
  put('bookshelf', 17.5, 1.4, 270, { name: 'Estantería de garaje' });
  // Exterior
  put('outdoor-dining', 2.2, 12.7, 0, { name: 'Comedor exterior', materials: { primary: { materialId: 'madera-roble', color: '#8a6446' }, secondary: { materialId: 'metal-negro', color: '#2a2a2c' }, seat: { materialId: 'tela', color: '#efe9df' } } });
  put('umbrella', 2.2, 12.7);
  put('lounger', 5.4, 12.7);
  put('lounger', 6.3, 12.7);
  put('lounger', 15.8, 13.2, 270);
  put('lounger', 15.8, 14.4, 270);
  put('garden-lamp', 7.6, 11.6);
  put('garden-lamp', 14.9, 11.8);
  return doc;
}
