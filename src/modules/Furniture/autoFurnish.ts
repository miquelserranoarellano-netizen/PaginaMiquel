/**
 * Amueblado automático de una estancia según su tipo. Coloca los muebles
 * típicos apoyados en las paredes libres, dejando paso delante de las puertas,
 * sin tapar ventanas con muebles altos y sin chocar con lo que ya hay.
 */
import { type BBox, type Vec2, add, bboxOf, labelPoint, orientedRect, pointInPolygon, polygonArea, scale } from '@/core/geometry';
import { degToRad } from '@/core/units';
import type { FurnitureItem, ID, ProjectDoc, Room } from '@/modules/FloorPlan/types';
import { getOpeningDef } from '@/modules/DoorsAndWindows/catalog';
import { wallFrame } from '@/modules/Walls/geometry';
import { _internals } from './analysis';
import { getCatalogItem } from './catalog';
import { createFurniture } from './factory';

type SideId = 'top' | 'bottom' | 'left' | 'right';

interface Side {
  id: SideId;
  /** Rotación para que el frente del mueble mire hacia dentro. */
  rotation: number;
  /** Punto inicial y dirección a lo largo del lado. */
  origin: Vec2;
  dir: Vec2;
  /** Hacia dentro de la estancia. */
  inward: Vec2;
  length: number;
}

interface Obstacle {
  poly: Vec2[];
  /** Solo bloquea muebles cuya parte superior supere esta altura (ventanas). */
  above?: number;
}

const overlap = _internals.convexOverlap;

function sidesOf(b: BBox): Side[] {
  return [
    { id: 'top', rotation: 0, origin: { x: b.minX, y: b.minY }, dir: { x: 1, y: 0 }, inward: { x: 0, y: 1 }, length: b.maxX - b.minX },
    { id: 'bottom', rotation: 180, origin: { x: b.minX, y: b.maxY }, dir: { x: 1, y: 0 }, inward: { x: 0, y: -1 }, length: b.maxX - b.minX },
    { id: 'left', rotation: 270, origin: { x: b.minX, y: b.minY }, dir: { x: 0, y: 1 }, inward: { x: 1, y: 0 }, length: b.maxY - b.minY },
    { id: 'right', rotation: 90, origin: { x: b.maxX, y: b.minY }, dir: { x: 0, y: 1 }, inward: { x: -1, y: 0 }, length: b.maxY - b.minY },
  ];
}

class Planner {
  readonly placed: FurnitureItem[] = [];
  readonly skipped: string[] = [];
  readonly obstacles: Obstacle[] = [];
  readonly box: BBox;
  readonly sides: Side[];
  /** Lado con la puerta principal (se evita para el mueble principal). */
  readonly doorSides = new Set<SideId>();

  constructor(
    readonly doc: ProjectDoc,
    readonly room: Room,
  ) {
    this.box = bboxOf(room.points);
    this.sides = sidesOf(this.box);
    for (const f of Object.values(doc.furniture)) if (f.levelId === room.levelId && f.height > 0.03) this.obstacles.push({ poly: rectOf(f) });
    // Puertas: zona de paso de 0,9 m a ambos lados; ventanas: bloquean lo que supere el antepecho.
    for (const o of Object.values(doc.openings)) {
      const w = doc.walls[o.wallId];
      if (!w || w.levelId !== room.levelId) continue;
      const f = wallFrame(w);
      const c = add(w.start, scale(f.dir, o.offset));
      if (!nearBox(c, this.box, w.thickness / 2 + 0.3)) continue;
      const def = getOpeningDef(o.kind);
      if (def.category === 'puerta' || def.passable) {
        this.obstacles.push({ poly: orientedRect(c, o.width + 0.2, 2 * (w.thickness / 2 + 0.9), f.angle) });
        this.doorSides.add(this.nearestSide(c));
      } else this.obstacles.push({ poly: orientedRect(c, o.width + 0.1, w.thickness + 0.7, f.angle), above: o.sill });
    }
  }

  nearestSide(p: Vec2): SideId {
    const d: [SideId, number][] = [
      ['top', Math.abs(p.y - this.box.minY)],
      ['bottom', Math.abs(p.y - this.box.maxY)],
      ['left', Math.abs(p.x - this.box.minX)],
      ['right', Math.abs(p.x - this.box.maxX)],
    ];
    return d.sort((a, b) => a[1] - b[1])[0][0];
  }

  fits(f: FurnitureItem, margin = 0): boolean {
    const poly = rectOf(f, margin);
    const core = rectOf(f);
    if (!core.every((p) => pointInPolygon(p, this.room.points) || onEdge(p, this.room.points))) return false;
    const top = f.elevation + f.height;
    for (const o of this.obstacles) if ((o.above === undefined || top > o.above) && overlap(margin ? poly : core, o.poly)) return false;
    for (const p of this.placed) if (Math.min(top, p.elevation + p.height) - Math.max(f.elevation, p.elevation) > 0.02 && overlap(core, rectOf(p))) return false;
    return true;
  }

  make(catalogId: string, pos: Vec2, rotation: number, patch: Partial<FurnitureItem> = {}): FurnitureItem | null {
    const cat = getCatalogItem(catalogId);
    return cat ? createFurniture(this.room.levelId, cat, pos, rotation, patch) : null;
  }

  commit(f: FurnitureItem): FurnitureItem {
    this.placed.push(f);
    return f;
  }

  /** Apoya el mueble en un lado, probando posiciones desde `along` (o el centro) hacia fuera. */
  againstSide(catalogId: string, side: Side, opts: { along?: number; patch?: Partial<FurnitureItem> } = {}): FurnitureItem | null {
    const probe = this.make(catalogId, { x: 0, y: 0 }, side.rotation, opts.patch);
    if (!probe) return null;
    const half = probe.width / 2;
    const start = opts.along ?? side.length / 2;
    for (let k = 0; k < 120; k++) {
      const delta = (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.05;
      const u = start + delta;
      if (u - half < -0.001 || u + half > side.length + 0.001) continue;
      const pos = add(add(side.origin, scale(side.dir, u)), scale(side.inward, probe.depth / 2 + 0.01));
      const f = { ...probe, position: round(pos) };
      if (this.fits(f)) return this.commit(f);
    }
    return null;
  }

  /** Lados ordenados: sin puerta y más largos primero. */
  bestSides(exclude: SideId[] = []): Side[] {
    return this.sides.filter((s) => !exclude.includes(s.id)).sort((a, b) => Number(this.doorSides.has(a.id)) - Number(this.doorSides.has(b.id)) || b.length - a.length);
  }

  place(catalogId: string, sides: Side[], opts: { along?: number; patch?: Partial<FurnitureItem> } = {}): FurnitureItem | null {
    for (const s of sides) {
      const f = this.againstSide(catalogId, s, opts);
      if (f) return f;
    }
    this.skipped.push(getCatalogItem(catalogId)?.name ?? catalogId);
    return null;
  }

  /** Coloca un mueble exento lo más cerca posible de `target`, con paso libre alrededor. */
  free(catalogId: string, target: Vec2, rotation: number, margin = 0.6, patch: Partial<FurnitureItem> = {}): FurnitureItem | null {
    const probe = this.make(catalogId, target, rotation, patch);
    if (!probe) return null;
    const cands: Vec2[] = [];
    for (let x = this.box.minX; x <= this.box.maxX; x += 0.1) for (let y = this.box.minY; y <= this.box.maxY; y += 0.1) cands.push({ x, y });
    cands.sort((a, b) => Math.hypot(a.x - target.x, a.y - target.y) - Math.hypot(b.x - target.x, b.y - target.y));
    for (const c of cands.slice(0, 1500)) {
      const f = { ...probe, position: round(c) };
      if (this.fits(f, margin)) return this.commit(f);
    }
    this.skipped.push(probe.name);
    return null;
  }

  /** Mueble sobre otro (TV sobre su mueble, lámpara sobre mesita). */
  onTop(catalogId: string, base: FurnitureItem, patch: Partial<FurnitureItem> = {}): FurnitureItem | null {
    const f = this.make(catalogId, base.position, base.rotation, { elevation: base.elevation + base.height, ...patch });
    return f ? this.commit(f) : null;
  }

  /** Al lado de otro mueble, sobre el mismo lado (mesitas junto a la cama). */
  beside(catalogId: string, ref: FurnitureItem, side: Side, gap = 0.02): FurnitureItem[] {
    const out: FurnitureItem[] = [];
    const probe = this.make(catalogId, ref.position, side.rotation);
    if (!probe) return out;
    const u = (ref.position.x - side.origin.x) * side.dir.x + (ref.position.y - side.origin.y) * side.dir.y;
    for (const sgn of [-1, 1]) {
      const along = u + sgn * (ref.width / 2 + gap + probe.width / 2);
      if (along - probe.width / 2 < 0 || along + probe.width / 2 > side.length) continue;
      const pos = add(add(side.origin, scale(side.dir, along)), scale(side.inward, probe.depth / 2 + 0.01));
      const f = { ...probe, position: round(pos) };
      if (this.fits(f)) out.push(this.commit(f));
    }
    return out;
  }

  opposite(side: Side): Side {
    const map: Record<SideId, SideId> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };
    return this.sides.find((s) => s.id === map[side.id])!;
  }

  sideOf(f: FurnitureItem): Side {
    return this.sides.find((s) => s.rotation === f.rotation) ?? this.sides[0];
  }
}

const round = (p: Vec2): Vec2 => ({ x: Math.round(p.x * 1000) / 1000, y: Math.round(p.y * 1000) / 1000 });
const rectOf = (f: Pick<FurnitureItem, 'position' | 'width' | 'depth' | 'rotation'>, margin = 0) => orientedRect(f.position, f.width + 2 * margin, f.depth + 2 * margin, degToRad(f.rotation));
const nearBox = (p: Vec2, b: BBox, tol: number) => p.x >= b.minX - tol && p.x <= b.maxX + tol && p.y >= b.minY - tol && p.y <= b.maxY + tol && (Math.abs(p.x - b.minX) < tol || Math.abs(p.x - b.maxX) < tol || Math.abs(p.y - b.minY) < tol || Math.abs(p.y - b.maxY) < tol);
function onEdge(p: Vec2, poly: Vec2[]): boolean {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > 0 && Math.abs(cross) / len < 0.03 && p.x >= Math.min(a.x, b.x) - 0.03 && p.x <= Math.max(a.x, b.x) + 0.03 && p.y >= Math.min(a.y, b.y) - 0.03 && p.y <= Math.max(a.y, b.y) + 0.03) return true;
  }
  return false;
}

// ── Recetas por tipo de estancia ──────────────────────────────────────────
function bedroom(pl: Planner) {
  const b = pl.box;
  const short = Math.min(b.maxX - b.minX, b.maxY - b.minY);
  const bedId = short >= 2.9 && polygonArea(pl.room.points) >= 10 ? 'bed-double' : 'bed-single';
  const bed = pl.place(bedId, pl.bestSides());
  if (bed) {
    const side = pl.sideOf(bed);
    for (const n of pl.beside('nightstand', bed, side, 0.03)) pl.onTop('table-lamp', n, { elevation: n.elevation + n.height });
    pl.place('wardrobe-3', pl.bestSides([side.id])) ?? pl.place('wardrobe-2', pl.bestSides([side.id]));
    const opp = pl.opposite(side);
    pl.againstSide('ac-split', opp);
  }
}

function living(pl: Planner, withDining: boolean) {
  const sofa = pl.place('sofa-3', pl.bestSides()) ?? pl.place('sofa-2', pl.bestSides());
  if (sofa) {
    const side = pl.sideOf(sofa);
    const opp = pl.opposite(side);
    const u = (sofa.position.x - opp.origin.x) * opp.dir.x + (sofa.position.y - opp.origin.y) * opp.dir.y;
    const stand = pl.againstSide('tv-stand', opp, { along: u });
    if (stand) pl.onTop('tv-55', stand, { name: 'Televisor 55"' });
    // Mesa de centro entre el sofá y la TV
    if (stand) {
      const mid = { x: (sofa.position.x + stand.position.x) / 2, y: (sofa.position.y + stand.position.y) / 2 };
      const ct = pl.make('coffee-table', mid, sofa.rotation % 180 === 0 ? 0 : 90);
      if (ct && pl.fits(ct)) {
        pl.commit(ct);
        const rug = pl.make('rug', mid, sofa.rotation % 180 === 0 ? 0 : 90, { width: 2.4, depth: 1.7 });
        if (rug) pl.placed.push(rug);
      }
    }
    pl.beside('floor-lamp', sofa, side, 0.08).slice(0, 1);
    pl.againstSide('ac-split', pl.opposite(side), { along: 0.6 }) ?? pl.againstSide('ac-split', side, { along: 0.6 });
  }
  if (withDining) {
    const target = labelPoint(pl.room.points);
    const dining = pl.free('outdoor-dining', target, 0, 0.45, { name: 'Mesa de comedor con sillas' });
    if (dining) pl.onTop('pendant', dining, { elevation: 1.8 });
  }
  pl.place('plant', pl.bestSides().reverse(), { along: 0.35 });
}

function kitchen(pl: Planner) {
  const side = pl.bestSides()[0];
  const run: [string, number?][] = [['fridge'], ['kitchen-base', 1.2], ['kitchen-sink'], ['kitchen-hob'], ['kitchen-base', 0.8]];
  let u = 0.02;
  for (const [id, width] of run) {
    const cat = getCatalogItem(id)!;
    const w = width ?? cat.w;
    if (u + w > side.length - 0.02) break;
    const f = pl.againstSide(id, side, { along: u + w / 2, patch: width ? { width } : {} });
    if (!f) continue;
    if (id === 'kitchen-hob') pl.onTop('hood', f, { elevation: 1.6 });
    if (id === 'kitchen-base') {
      const wall = pl.make('kitchen-wall', f.position, f.rotation, { width: f.width, elevation: 1.45 });
      if (wall) {
        wall.position = round(add(f.position, scale(side.inward, -(f.depth - wall.depth) / 2)));
        pl.commit(wall);
      }
    }
    u += f.width;
  }
  const b = pl.box;
  if (Math.min(b.maxX - b.minX, b.maxY - b.minY) >= 3.4) pl.free('kitchen-island', labelPoint(pl.room.points), side.rotation % 180 === 0 ? 0 : 90, 0.8);
}

function bathroom(pl: Planner) {
  const sides = pl.bestSides();
  const long = sides[0];
  if (long.length >= 1.75 && pl.againstSide('bathtub', long, { along: long.length - 0.86 })) {
    /* bañera al fondo */
  } else pl.place('shower', sides, { along: 0.62 });
  pl.place('toilet', pl.bestSides(), { along: 0.3 });
  const vanity = pl.place('vanity', pl.bestSides());
  if (vanity) {
    const mirror = pl.make('mirror', vanity.position, vanity.rotation, { elevation: 1.05 });
    if (mirror) {
      mirror.position = round(add(vanity.position, scale(pl.sideOf(vanity).inward, -(vanity.depth - mirror.depth) / 2)));
      pl.commit(mirror);
    }
  }
  pl.place('towel-rail', pl.bestSides());
}

function office(pl: Planner) {
  const desk = pl.place('desk', pl.bestSides());
  if (desk) {
    const side = pl.sideOf(desk);
    pl.onTop('computer', desk);
    const chair = pl.make('office-chair', add(desk.position, scale(side.inward, desk.depth / 2 + 0.36)), (desk.rotation + 180) % 360);
    if (chair && pl.fits(chair)) pl.commit(chair);
  }
  pl.place('bookshelf', pl.bestSides(desk ? [pl.sideOf(desk).id] : []), { patch: { width: 1.2 } });
}

function garage(pl: Planner) {
  const b = pl.box;
  const alongY = b.maxY - b.minY >= b.maxX - b.minX;
  pl.free('car', labelPoint(pl.room.points), alongY ? 0 : 90, 0.35);
  pl.place('bookshelf', pl.bestSides(), { patch: { name: 'Estantería de garaje' } });
}

function hall(pl: Planner) {
  pl.place('console-table', pl.bestSides()) ?? pl.place('shoe-cabinet', pl.bestSides());
  pl.place('coat-rack', pl.bestSides(), { along: 0.3 });
  pl.place('plant-small', pl.bestSides().reverse(), { along: 0.2 });
}

function laundry(pl: Planner) {
  const side = pl.bestSides()[0];
  pl.againstSide('washer', side, { along: 0.32 });
  pl.againstSide('dryer', side, { along: 0.96 });
  pl.place('wall-shelves', pl.bestSides(), { patch: { width: 1.2 } });
}

function terrace(pl: Planner) {
  pl.free('outdoor-dining', labelPoint(pl.room.points), 0, 0.3, { name: 'Comedor exterior' });
  pl.place('lounger', pl.bestSides());
  pl.place('plant', pl.bestSides().reverse(), { along: 0.35 });
}

function garden(pl: Planner) {
  pl.free('tree', labelPoint(pl.room.points), 0, 0.5);
  pl.place('garden-bench', pl.bestSides());
}

export interface FurnishResult {
  added: FurnitureItem[];
  skipped: string[];
}

/** Calcula los muebles para la estancia (sin modificar el documento). */
export function planFurnishing(doc: ProjectDoc, roomId: ID): FurnishResult {
  const room = doc.rooms[roomId];
  if (!room) return { added: [], skipped: [] };
  const pl = new Planner(doc, room);
  switch (room.type) {
    case 'dormitorio':
      bedroom(pl);
      break;
    case 'salon':
      living(pl, polygonArea(room.points) >= 24);
      break;
    case 'comedor':
      living(pl, true);
      break;
    case 'cocina':
      kitchen(pl);
      break;
    case 'bano':
    case 'aseo':
      bathroom(pl);
      break;
    case 'despacho':
      office(pl);
      break;
    case 'garaje':
      garage(pl);
      break;
    case 'recibidor':
    case 'pasillo':
      hall(pl);
      break;
    case 'lavadero':
      laundry(pl);
      break;
    case 'terraza':
      terrace(pl);
      break;
    case 'jardin':
      garden(pl);
      break;
    default:
      pl.place('plant', pl.bestSides());
  }
  return { added: pl.placed, skipped: pl.skipped };
}

/** Amuebla la estancia dentro de una receta del documento. */
export function furnishRoom(doc: ProjectDoc, roomId: ID): FurnishResult {
  const r = planFurnishing(doc, roomId);
  for (const f of r.added) doc.furniture[f.id] = f;
  return r;
}
