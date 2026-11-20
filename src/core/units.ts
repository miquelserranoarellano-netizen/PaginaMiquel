const nf = (digits: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const nf2 = nf(2);
const nf1 = nf(1);
const nf0 = nf(0);

/** 3,45 m */
export const formatLength = (m: number, digits = 2): string => `${(digits === 2 ? nf2 : digits === 1 ? nf1 : nf0).format(m)} m`;
/** 12,30 m² */
export const formatArea = (m2: number): string => `${nf2.format(m2)} m²`;
export const formatNumber = (n: number, digits = 2): string => nf(digits).format(n);
export const formatCm = (m: number): string => `${nf0.format(m * 100)} cm`;
export const formatDegrees = (deg: number): string => `${nf0.format(deg)}°`;

/**
 * Interpreta un texto de longitud introducido por el usuario y devuelve metros.
 * Acepta "3.5", "3,5", "350cm", "3500 mm", "3.5m". Devuelve null si no es válido.
 */
export function parseLength(input: string): number | null {
  const s = input.trim().toLowerCase().replace(',', '.').replace(/\s+/g, '');
  const m = s.match(/^(-?\d*\.?\d+)(mm|cm|m)?$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!Number.isFinite(value)) return null;
  switch (m[2]) {
    case 'mm':
      return value / 1000;
    case 'cm':
      return value / 100;
    default:
      return value;
  }
}

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const degToRad = (d: number): number => (d * Math.PI) / 180;
export const radToDeg = (r: number): number => (r * 180) / Math.PI;
export const normalizeDeg = (d: number): number => ((d % 360) + 360) % 360;
