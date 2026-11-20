/**
 * Biblioteca de materiales. Cada material describe un patrón procedural
 * (ver textures.ts), un color base editable y propiedades PBR.
 * Los elementos del proyecto referencian materiales por id: { materialId, color }.
 */
export type MaterialPattern =
  | 'paint'
  | 'plain'
  | 'plaster'
  | 'parquet'
  | 'herringbone'
  | 'marble'
  | 'tiles'
  | 'smalltiles'
  | 'hydraulic'
  | 'concrete'
  | 'brick'
  | 'stone'
  | 'wood'
  | 'panels'
  | 'grass'
  | 'deck'
  | 'gravel'
  | 'fabric'
  | 'metal'
  | 'glass'
  | 'emissive'
  | 'water';

export type MaterialCategory = 'suelo' | 'pared' | 'madera' | 'piedra' | 'metal' | 'vidrio' | 'tela' | 'exterior' | 'general';

export interface MaterialDef {
  id: string;
  name: string;
  categories: MaterialCategory[];
  pattern: MaterialPattern;
  /** Color base por defecto (el usuario puede cambiarlo). */
  color: string;
  /** Color secundario (juntas, vetas, motivos). */
  color2?: string;
  /** Tamaño real, en metros, que cubre una repetición de la textura. */
  tileSize: number;
  roughness: number;
  metalness: number;
  opacity?: number;
  emissive?: boolean;
}

export const MATERIALS: MaterialDef[] = [
  // ── Suelos ─────────────────────────────────────────────
  { id: 'parquet-roble', name: 'Parquet roble', categories: ['suelo', 'madera'], pattern: 'parquet', color: '#b8875a', tileSize: 1.6, roughness: 0.55, metalness: 0 },
  { id: 'parquet-nogal', name: 'Parquet nogal', categories: ['suelo', 'madera'], pattern: 'parquet', color: '#6e4a2f', tileSize: 1.6, roughness: 0.5, metalness: 0 },
  { id: 'parquet-gris', name: 'Parquet roble gris', categories: ['suelo', 'madera'], pattern: 'parquet', color: '#a39a90', tileSize: 1.6, roughness: 0.6, metalness: 0 },
  { id: 'parquet-espiga', name: 'Parquet espiga', categories: ['suelo', 'madera'], pattern: 'herringbone', color: '#a87a4f', tileSize: 1.2, roughness: 0.5, metalness: 0 },
  { id: 'marmol-blanco', name: 'Mármol blanco', categories: ['suelo', 'pared', 'piedra'], pattern: 'marble', color: '#eeece8', color2: '#8f979e', tileSize: 1.2, roughness: 0.12, metalness: 0 },
  { id: 'marmol-negro', name: 'Mármol negro', categories: ['suelo', 'pared', 'piedra'], pattern: 'marble', color: '#202124', color2: '#c9c9c9', tileSize: 1.2, roughness: 0.12, metalness: 0 },
  { id: 'travertino', name: 'Travertino', categories: ['suelo', 'pared', 'piedra'], pattern: 'marble', color: '#d9c6a5', color2: '#b39b78', tileSize: 1.2, roughness: 0.35, metalness: 0 },
  { id: 'ceramica-blanca', name: 'Cerámica blanca 60×60', categories: ['suelo', 'pared'], pattern: 'tiles', color: '#efeeea', color2: '#cdc9c1', tileSize: 1.2, roughness: 0.25, metalness: 0 },
  { id: 'ceramica-gris', name: 'Cerámica gris 60×60', categories: ['suelo', 'pared'], pattern: 'tiles', color: '#8e9092', color2: '#6f7173', tileSize: 1.2, roughness: 0.3, metalness: 0 },
  { id: 'ceramica-beige', name: 'Gres beige 60×60', categories: ['suelo', 'exterior'], pattern: 'tiles', color: '#cbbba3', color2: '#a99a84', tileSize: 1.2, roughness: 0.45, metalness: 0 },
  { id: 'hidraulica', name: 'Baldosa hidráulica', categories: ['suelo'], pattern: 'hydraulic', color: '#e2dacb', color2: '#4f7385', tileSize: 0.4, roughness: 0.4, metalness: 0 },
  { id: 'hormigon-pulido', name: 'Hormigón pulido', categories: ['suelo', 'pared', 'exterior'], pattern: 'concrete', color: '#a5a49f', tileSize: 2.5, roughness: 0.35, metalness: 0 },
  { id: 'moqueta', name: 'Moqueta', categories: ['suelo', 'tela'], pattern: 'fabric', color: '#85878b', tileSize: 0.5, roughness: 1, metalness: 0 },
  // ── Exterior ───────────────────────────────────────────
  { id: 'cesped', name: 'Césped', categories: ['exterior', 'suelo'], pattern: 'grass', color: '#5d8c39', tileSize: 2, roughness: 1, metalness: 0 },
  { id: 'tarima-exterior', name: 'Tarima exterior', categories: ['exterior', 'suelo', 'madera'], pattern: 'deck', color: '#8a6446', tileSize: 1.4, roughness: 0.7, metalness: 0 },
  { id: 'grava', name: 'Grava', categories: ['exterior', 'suelo'], pattern: 'gravel', color: '#bdb6a8', tileSize: 1, roughness: 1, metalness: 0 },
  { id: 'piedra-exterior', name: 'Losa de piedra', categories: ['exterior', 'suelo', 'piedra'], pattern: 'stone', color: '#b5ad9f', tileSize: 2, roughness: 0.8, metalness: 0 },
  { id: 'agua', name: 'Agua (piscina)', categories: ['exterior'], pattern: 'water', color: '#3a95b8', tileSize: 2, roughness: 0.05, metalness: 0.1, opacity: 0.75 },
  // ── Paredes ────────────────────────────────────────────
  { id: 'pintura', name: 'Pintura lisa', categories: ['pared', 'general'], pattern: 'paint', color: '#f3f1ec', tileSize: 1, roughness: 0.92, metalness: 0 },
  { id: 'estuco', name: 'Estuco', categories: ['pared'], pattern: 'plaster', color: '#ece5d8', tileSize: 1.5, roughness: 0.75, metalness: 0 },
  { id: 'ladrillo', name: 'Ladrillo visto', categories: ['pared', 'exterior'], pattern: 'brick', color: '#a5563a', color2: '#d4ccc0', tileSize: 1, roughness: 0.85, metalness: 0 },
  { id: 'ladrillo-blanco', name: 'Ladrillo pintado', categories: ['pared'], pattern: 'brick', color: '#ebe8e2', color2: '#d3cfc8', tileSize: 1, roughness: 0.85, metalness: 0 },
  { id: 'piedra', name: 'Mampostería de piedra', categories: ['pared', 'exterior', 'piedra'], pattern: 'stone', color: '#9a9284', tileSize: 1.4, roughness: 0.9, metalness: 0 },
  { id: 'hormigon-visto', name: 'Hormigón visto', categories: ['pared', 'exterior'], pattern: 'concrete', color: '#9c9b97', tileSize: 2.5, roughness: 0.8, metalness: 0 },
  { id: 'madera-paneles', name: 'Paneles de madera', categories: ['pared', 'madera'], pattern: 'panels', color: '#a3774f', tileSize: 1.2, roughness: 0.6, metalness: 0 },
  { id: 'azulejo-blanco', name: 'Azulejo blanco', categories: ['pared'], pattern: 'smalltiles', color: '#f6f6f3', color2: '#d2d0cb', tileSize: 0.6, roughness: 0.15, metalness: 0 },
  { id: 'azulejo-verde', name: 'Azulejo verde', categories: ['pared'], pattern: 'smalltiles', color: '#6f9a8d', color2: '#e6e4de', tileSize: 0.6, roughness: 0.15, metalness: 0 },
  { id: 'azulejo-azul', name: 'Azulejo azul', categories: ['pared'], pattern: 'smalltiles', color: '#3e6a8f', color2: '#e6e4de', tileSize: 0.6, roughness: 0.15, metalness: 0 },
  // ── Maderas (puertas, muebles) ─────────────────────────
  { id: 'madera-roble', name: 'Madera de roble', categories: ['madera', 'general'], pattern: 'wood', color: '#b98a59', tileSize: 1, roughness: 0.55, metalness: 0 },
  { id: 'madera-nogal', name: 'Madera de nogal', categories: ['madera', 'general'], pattern: 'wood', color: '#5f3f29', tileSize: 1, roughness: 0.5, metalness: 0 },
  { id: 'madera-clara', name: 'Madera de haya', categories: ['madera', 'general'], pattern: 'wood', color: '#d8b48a', tileSize: 1, roughness: 0.55, metalness: 0 },
  { id: 'lacado', name: 'Lacado', categories: ['madera', 'general'], pattern: 'plain', color: '#f4f4f1', tileSize: 1, roughness: 0.35, metalness: 0 },
  // ── Metales ────────────────────────────────────────────
  { id: 'aluminio', name: 'Aluminio', categories: ['metal', 'general'], pattern: 'metal', color: '#c4c7cb', tileSize: 1, roughness: 0.35, metalness: 0.85 },
  { id: 'acero', name: 'Acero inoxidable', categories: ['metal', 'general'], pattern: 'metal', color: '#a7adb3', tileSize: 1, roughness: 0.25, metalness: 0.9 },
  { id: 'metal-negro', name: 'Metal negro mate', categories: ['metal', 'general'], pattern: 'plain', color: '#2a2a2c', tileSize: 1, roughness: 0.5, metalness: 0.6 },
  { id: 'laton', name: 'Latón', categories: ['metal', 'general'], pattern: 'metal', color: '#c9a24f', tileSize: 1, roughness: 0.3, metalness: 0.9 },
  { id: 'cromo', name: 'Cromo', categories: ['metal', 'general'], pattern: 'plain', color: '#e3e6e9', tileSize: 1, roughness: 0.08, metalness: 1 },
  // ── Vidrio ─────────────────────────────────────────────
  { id: 'vidrio', name: 'Vidrio', categories: ['vidrio'], pattern: 'glass', color: '#cfe5ee', tileSize: 1, roughness: 0.05, metalness: 0, opacity: 0.22 },
  { id: 'vidrio-mate', name: 'Vidrio mate', categories: ['vidrio'], pattern: 'glass', color: '#e8eef0', tileSize: 1, roughness: 0.6, metalness: 0, opacity: 0.6 },
  // ── Tejidos y otros ────────────────────────────────────
  { id: 'tela', name: 'Tela', categories: ['tela', 'general'], pattern: 'fabric', color: '#8d9095', tileSize: 0.4, roughness: 0.95, metalness: 0 },
  { id: 'terciopelo', name: 'Terciopelo', categories: ['tela', 'general'], pattern: 'fabric', color: '#3f5f57', tileSize: 0.3, roughness: 0.9, metalness: 0 },
  { id: 'cuero', name: 'Cuero', categories: ['tela', 'general'], pattern: 'plain', color: '#6b4430', tileSize: 1, roughness: 0.55, metalness: 0 },
  { id: 'plastico', name: 'Plástico', categories: ['general'], pattern: 'plain', color: '#e9e9e7', tileSize: 1, roughness: 0.45, metalness: 0 },
  { id: 'porcelana', name: 'Porcelana sanitaria', categories: ['general'], pattern: 'plain', color: '#fbfbfa', tileSize: 1, roughness: 0.12, metalness: 0 },
  { id: 'pantalla', name: 'Pantalla', categories: ['general'], pattern: 'plain', color: '#0c0e12', tileSize: 1, roughness: 0.15, metalness: 0.2 },
  { id: 'luz', name: 'Emisor de luz', categories: ['general'], pattern: 'emissive', color: '#fff1d6', tileSize: 1, roughness: 0.5, metalness: 0, emissive: true },
  { id: 'vegetal', name: 'Hojas', categories: ['exterior', 'general'], pattern: 'plain', color: '#4d7a35', tileSize: 1, roughness: 0.8, metalness: 0 },
  { id: 'tierra', name: 'Tierra', categories: ['exterior', 'general'], pattern: 'plain', color: '#5a4332', tileSize: 1, roughness: 1, metalness: 0 },
  { id: 'colchon', name: 'Textil blanco', categories: ['tela', 'general'], pattern: 'fabric', color: '#f1eee8', tileSize: 0.4, roughness: 0.95, metalness: 0 },
];

const byId = new Map(MATERIALS.map((m) => [m.id, m]));

export function getMaterialDef(id: string): MaterialDef {
  return byId.get(id) ?? byId.get('pintura')!;
}

export function materialsForCategory(cat: MaterialCategory | 'todos'): MaterialDef[] {
  return cat === 'todos' ? MATERIALS : MATERIALS.filter((m) => m.categories.includes(cat));
}

/** Paleta de colores sugeridos en los selectores. */
export const COLOR_SWATCHES = [
  '#ffffff', '#f3f1ec', '#e9e2d4', '#d6cbb8', '#b8a58b', '#8a7a64', '#5c5146',
  '#e8ecef', '#c9d1d6', '#9aa5ad', '#6b7780', '#3f474d', '#222426', '#0f1011',
  '#e7efe4', '#b9cdb0', '#7f9f72', '#4f6f45', '#e3edf3', '#a9c4d6', '#5f88a8',
  '#2f4f6e', '#f3e1d6', '#e0a98c', '#b86b4b', '#7a3e2a', '#f6ead0', '#e2c27a',
];
