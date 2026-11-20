/**
 * Parámetros de muebles configurables y utilidades de cálculo
 * (televisores por pulgadas, estanterías por baldas y módulos).
 */
import type { CatalogItem, ParamValues, Size3 } from './types';

export function defaultParams(cat: CatalogItem | undefined): ParamValues {
  const out: ParamValues = {};
  for (const p of cat?.params ?? []) out[p.key] = p.default;
  return out;
}

/** Parámetros efectivos: valores guardados + valores por defecto del catálogo. */
export function resolveParams(cat: CatalogItem | undefined, values: ParamValues | undefined): ParamValues {
  return { ...defaultParams(cat), ...(values ?? {}) };
}

export const pnum = (p: ParamValues, key: string, def: number): number => (typeof p[key] === 'number' ? (p[key] as number) : def);
export const pint = (p: ParamValues, key: string, def: number, min = 1, max = 99): number => Math.min(max, Math.max(min, Math.round(pnum(p, key, def))));
export const pbool = (p: ParamValues, key: string, def: boolean): boolean => (typeof p[key] === 'boolean' ? (p[key] as boolean) : def);

// ── Televisores ───────────────────────────────────────────────────────────
const INCH = 0.0254;
const DIAG_169 = Math.sqrt(16 * 16 + 9 * 9);
export const TV_BEZEL = 0.012;
export const TV_STAND_H = 0.07;
export const STANDARD_TV_SIZES = [24, 32, 40, 43, 50, 55, 58, 65, 70, 75, 77, 83, 85, 98, 100];

/** Medidas de la pantalla 16:9 (m) para una diagonal en pulgadas. */
export function tvScreen(inches: number): { w: number; h: number; diag: number } {
  return { w: (inches * 16 * INCH) / DIAG_169, h: (inches * 9 * INCH) / DIAG_169, diag: inches * INCH };
}

export function tvSize(inches: number, withStand: boolean): Size3 {
  const s = tvScreen(inches);
  const w = s.w + 2 * TV_BEZEL;
  const h = s.h + 2 * TV_BEZEL + (withStand ? TV_STAND_H : 0);
  return { w: round3(w), h: round3(h), d: withStand ? round3(Math.max(0.2, Math.min(0.38, w * 0.2))) : 0.05 };
}

export function inchesFromWidth(width: number): number {
  return Math.max(24, Math.min(110, Math.round(((width - 2 * TV_BEZEL) * DIAG_169) / (16 * INCH))));
}

/** Tamaño estándar más próximo para una distancia de visión (≈ 1,4 × diagonal en 4K). */
export function suggestedInches(distance: number): number {
  const ideal = distance / 1.4 / INCH;
  return STANDARD_TV_SIZES.reduce((best, s) => (Math.abs(s - ideal) < Math.abs(best - ideal) ? s : best), STANDARD_TV_SIZES[0]);
}

// ── Estanterías ───────────────────────────────────────────────────────────
export const SHELF_T = 0.025;

export interface ShelfLayout {
  levels: number;
  columns: number;
  /** Altura libre de cada hueco (m). */
  clearHeight: number;
  /** Ancho libre de cada hueco (m). */
  clearWidth: number;
  /** Metros lineales de balda útiles. */
  linearMeters: number;
}

export function shelfLayout(w: number, h: number, levels: number, columns: number, t = SHELF_T): ShelfLayout {
  const clearHeight = Math.max(0, (h - t * (levels + 1)) / levels);
  const clearWidth = Math.max(0, (w - t * (columns + 1)) / columns);
  return { levels, columns, clearHeight, clearWidth, linearMeters: clearWidth * columns * levels };
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;
