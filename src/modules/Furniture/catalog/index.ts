/**
 * Catálogo de muebles y objetos, organizado por categorías (un fichero por
 * grupo). Cada elemento se construye con piezas paramétricas a partir de su
 * ancho, fondo y alto (ver parts.ts y ../types.ts).
 */
import type { CatalogItem, FurnitureCategory } from '../types';
import { SEATING } from './seating';
import { TABLES } from './tables';
import { BEDS } from './beds';
import { STORAGE } from './storage';
import { WORK } from './work';
import { MEDIA } from './media';
import { APPLIANCES } from './appliances';
import { KITCHEN } from './kitchen';
import { BATHROOM } from './bathroom';
import { LIGHTING } from './lighting';
import { DECOR } from './decor';
import { OUTDOOR } from './outdoor';
import { CLIMATE } from './climate';
import { STRUCTURE } from './structure';

export const CATALOG: CatalogItem[] = [
  ...SEATING,
  ...TABLES,
  ...BEDS,
  ...STORAGE,
  ...WORK,
  ...MEDIA,
  ...APPLIANCES,
  ...KITCHEN,
  ...BATHROOM,
  ...LIGHTING,
  ...DECOR,
  ...OUTDOOR,
  ...CLIMATE,
  ...STRUCTURE,
];

export const CATALOG_BY_ID = new Map(CATALOG.map((c) => [c.id, c]));

export function getCatalogItem(id: string): CatalogItem | undefined {
  return CATALOG_BY_ID.get(id);
}

export const CATEGORY_ORDER: FurnitureCategory[] = [
  'sofas',
  'mesas',
  'sillas',
  'camas',
  'armarios',
  'escritorios',
  'televisores',
  'electrodomesticos',
  'cocina',
  'sanitarios',
  'duchas',
  'lamparas',
  'decoracion',
  'climatizacion',
  'exterior',
  'estructura',
];
