import type { LightingSettings } from '@/modules/FloorPlan/types';

/**
 * Dirección hacia el sol a partir del acimut (0° = norte = -Z, 90° = este = +X)
 * y la elevación sobre el horizonte.
 */
export function sunDirection(l: Pick<LightingSettings, 'sunAzimuth' | 'sunElevation'>): [number, number, number] {
  const az = (l.sunAzimuth * Math.PI) / 180;
  const el = (l.sunElevation * Math.PI) / 180;
  return [Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)];
}

export const isNight = (l: LightingSettings) => l.preset === 'noche';
