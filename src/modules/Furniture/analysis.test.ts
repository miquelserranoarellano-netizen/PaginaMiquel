import { describe, expect, it } from 'vitest';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { createOpening } from '@/modules/FloorPlan/factory';
import { addRectRoom } from '@/modules/Rooms/ops';
import { addWallMerged } from '@/modules/Walls/ops';
import { analyzeFurniture } from './analysis';
import { getCatalogItem } from './catalog';
import { createFurniture } from './factory';
import { inchesFromWidth, shelfLayout, suggestedInches, tvScreen, tvSize } from './params';

describe('televisores por pulgadas', () => {
  it('calcula las medidas de una pantalla 16:9', () => {
    const s = tvScreen(55);
    expect(s.w).toBeCloseTo(1.2176, 3);
    expect(s.h).toBeCloseTo(0.6849, 3);
    expect(inchesFromWidth(tvSize(65, false).w)).toBe(65);
  });

  it('sugiere un tamaño estándar para la distancia', () => {
    expect(suggestedInches(2.0)).toBe(55);
    expect(suggestedInches(3.4)).toBe(98);
  });

  it('la configuración por defecto deriva las medidas del catálogo', () => {
    const doc = createEmptyProject();
    const l = Object.keys(doc.levels)[0];
    const tv = createFurniture(l, getCatalogItem('tv-65-wall')!, { x: 0, y: 0 });
    expect(tv.params?.inches).toBe(65);
    expect(tv.width).toBeCloseTo(tvScreen(65).w + 0.024, 3);
  });
});

describe('análisis de colocación', () => {
  const build = () => {
    const doc = createEmptyProject();
    const l = Object.keys(doc.levels)[0];
    addRectRoom(doc, l, { x: 0, y: 0 }, { x: 6, y: 5 }, 'salon', true);
    return { doc, l };
  };

  it('evalúa la distancia entre la TV y el sofá', () => {
    const { doc, l } = build();
    // Mueble de TV contra el muro izquierdo (frente hacia +x) y TV encima.
    const stand = createFurniture(l, getCatalogItem('tv-stand')!, { x: 0.31, y: 2.5 }, 270);
    const tv = createFurniture(l, getCatalogItem('tv-55')!, { x: 0.31, y: 2.5 }, 270);
    const sofa = createFurniture(l, getCatalogItem('sofa-3')!, { x: 2.5, y: 2.5 }, 90);
    for (const f of [stand, tv, sofa]) doc.furniture[f.id] = f;
    const a = analyzeFurniture(doc, tv);
    expect(a.viewing).toBeDefined();
    expect(a.findings.some((f) => f.level === 'ok' && /Tamaño ideal/.test(f.title))).toBe(true);
    expect(a.findings.some((f) => /Cabe en mueble de tv/i.test(f.title))).toBe(true);
    // Con 100" a la misma distancia la pantalla resulta demasiado grande.
    const big = { ...tv, params: { inches: 100 }, width: tvSize(100, true).w };
    expect(analyzeFurniture(doc, big).findings.some((f) => /demasiado grande/.test(f.title))).toBe(true);
  });

  it('detecta que tapa una ventana y que sobrepasa el techo', () => {
    const { doc, l } = build();
    const wall = Object.values(doc.walls).find((w) => Math.abs(w.start.y) < 1e-6 && Math.abs(w.end.y) < 1e-6)!;
    const win = createOpening(l, wall.id, 'window', 3);
    doc.openings[win.id] = win;
    const shelf = createFurniture(l, getCatalogItem('bookshelf')!, { x: 3, y: 0.1 + 0.175 }, 0, { height: 3 });
    doc.furniture[shelf.id] = shelf;
    const titles = analyzeFurniture(doc, shelf).findings.map((f) => f.title).join(' | ');
    expect(titles).toMatch(/Tapa ventana/);
    expect(titles).toMatch(/Sobrepasa el techo/);
  });

  it('calcula la capacidad de una estantería', () => {
    const l = shelfLayout(1.0, 2.0, 5, 1);
    expect(l.clearHeight).toBeCloseTo((2 - 0.025 * 6) / 5, 5);
    expect(l.linearMeters).toBeCloseTo(5 * 0.95, 5);
    const doc = createEmptyProject();
    const lv = Object.keys(doc.levels)[0];
    addWallMerged(doc, lv, { x: -5, y: -5 }, { x: 5, y: -5 });
    const shelf = createFurniture(lv, getCatalogItem('bookshelf')!, { x: 0, y: 0 }, 0, { width: 1.2, params: { levels: 5, columns: 1, back: true, books: true } });
    doc.furniture[shelf.id] = shelf;
    const a = analyzeFurniture(doc, shelf);
    expect(a.facts.find((f) => f.label === 'Capacidad aprox.')?.value).toMatch(/libros/);
    expect(a.findings.some((f) => /sin apoyo intermedio/.test(f.title))).toBe(true);
  });
});
