/**
 * Estado de la interfaz (no forma parte del documento ni del historial):
 * vista activa, herramienta, selección, planta activa, opciones de visualización.
 */
import { create } from 'zustand';
import type { ElementRef, ID, OpeningKind, RoomType, Vec2 } from '@/modules/FloorPlan/types';

export type ViewMode = '2d' | '3d' | 'walk';
export type ToolId = 'select' | 'pan' | 'wall' | 'room-rect' | 'room-poly' | 'room-detect' | 'opening' | 'measure' | 'furniture';
export type Screen = 'projects' | 'editor';
export type LeftTab = 'tools' | 'library';

export interface Viewport2D {
  /** Centro visible en coordenadas del plano (m). */
  cx: number;
  cy: number;
  /** Píxeles por metro. */
  zoom: number;
}

export type RenderStyle = 'estudio' | 'exterior';

export interface View3DOptions {
  /** Estudio: fondo gris de presentación (maqueta). Exterior: cielo y terreno. */
  style: RenderStyle;
  /** Alta: oclusión ambiental y antialiasing de postproceso. */
  quality: 'alta' | 'normal';
  showCeilings: boolean;
  /** Muros cortados a media altura (vista de maqueta). */
  cutaway: boolean;
  /** Mostrar solo hasta la planta activa. */
  upToActiveLevel: boolean;
  showFurniture: boolean;
}

export interface PlanDisplay {
  grid: boolean;
  wallLengths: boolean;
  roomLabels: boolean;
  furniture: boolean;
  dimensions: boolean;
  lowerLevel: boolean;
}

interface EditorState {
  screen: Screen;
  view: ViewMode;
  tool: ToolId;
  leftTab: LeftTab;
  roomType: RoomType;
  openingKind: OpeningKind;
  /** Elemento del catálogo pendiente de colocar (herramienta "furniture"). */
  placingCatalogId: string | null;
  createWallsWithRoom: boolean;
  selection: ElementRef[];
  hover: ElementRef | null;
  activeLevelId: ID;
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  plan: PlanDisplay;
  view3d: View3DOptions;
  viewport: Viewport2D;
  cursor: Vec2 | null;
  /** Medida en curso (herramientas) para la barra de estado. */
  liveMeasure: string | null;
  /** Petición de encuadre del plano (se incrementa). */
  fitRequest: number;
  /** Petición de cámara 3D. */
  cameraRequest: { mode: 'exterior' | 'top' | 'interior'; n: number };
  walkFreeCamera: boolean;

  setScreen: (s: Screen) => void;
  setView: (v: ViewMode) => void;
  setTool: (t: ToolId) => void;
  setLeftTab: (t: LeftTab) => void;
  setRoomType: (t: RoomType) => void;
  setOpeningKind: (k: OpeningKind) => void;
  startPlacing: (catalogId: string) => void;
  setCreateWallsWithRoom: (v: boolean) => void;
  select: (refs: ElementRef[]) => void;
  toggleSelect: (ref: ElementRef) => void;
  clearSelection: () => void;
  setHover: (ref: ElementRef | null) => void;
  setActiveLevel: (id: ID) => void;
  setGridSize: (n: number) => void;
  setSnapToGrid: (v: boolean) => void;
  setSnapToObjects: (v: boolean) => void;
  setPlan: (p: Partial<PlanDisplay>) => void;
  setView3d: (p: Partial<View3DOptions>) => void;
  setViewport: (v: Viewport2D) => void;
  setCursor: (p: Vec2 | null) => void;
  setLiveMeasure: (s: string | null) => void;
  requestFit: () => void;
  requestCamera: (mode: 'exterior' | 'top' | 'interior') => void;
  setWalkFreeCamera: (v: boolean) => void;
}

const PREFS_KEY = 'homedesign.prefs.v1';

type Prefs = Pick<EditorState, 'gridSize' | 'snapToGrid' | 'snapToObjects' | 'plan' | 'view3d' | 'createWallsWithRoom'>;

function loadPrefs(): Partial<Prefs> {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
  } catch {
    return {};
  }
}

const prefs = loadPrefs();

export const useEditorStore = create<EditorState>()((set) => ({
  screen: 'projects',
  view: '2d',
  tool: 'select',
  leftTab: 'tools',
  roomType: 'salon',
  openingKind: 'door',
  placingCatalogId: null,
  createWallsWithRoom: prefs.createWallsWithRoom ?? true,
  selection: [],
  hover: null,
  activeLevelId: '',
  gridSize: prefs.gridSize ?? 0.1,
  snapToGrid: prefs.snapToGrid ?? true,
  snapToObjects: prefs.snapToObjects ?? true,
  plan: { grid: true, wallLengths: true, roomLabels: true, furniture: true, dimensions: true, lowerLevel: true, ...prefs.plan },
  view3d: { style: 'estudio', quality: 'alta', showCeilings: false, cutaway: false, upToActiveLevel: true, showFurniture: true, ...prefs.view3d },
  viewport: { cx: 5, cy: 4, zoom: 60 },
  cursor: null,
  liveMeasure: null,
  fitRequest: 0,
  cameraRequest: { mode: 'exterior', n: 0 },
  walkFreeCamera: false,

  setScreen: (screen) => set({ screen }),
  setView: (view) => set({ view, hover: null }),
  setTool: (tool) => set((s) => ({ tool, placingCatalogId: tool === 'furniture' ? s.placingCatalogId : null, liveMeasure: null })),
  setLeftTab: (leftTab) => set({ leftTab }),
  setRoomType: (roomType) => set({ roomType }),
  setOpeningKind: (openingKind) => set({ openingKind, tool: 'opening' }),
  startPlacing: (catalogId) => set({ placingCatalogId: catalogId, tool: 'furniture' }),
  setCreateWallsWithRoom: (createWallsWithRoom) => set({ createWallsWithRoom }),
  select: (selection) => set({ selection }),
  toggleSelect: (ref) =>
    set((s) => {
      const exists = s.selection.some((r) => r.id === ref.id);
      return { selection: exists ? s.selection.filter((r) => r.id !== ref.id) : [...s.selection, ref] };
    }),
  clearSelection: () => set({ selection: [] }),
  setHover: (hover) => set({ hover }),
  setActiveLevel: (activeLevelId) => set({ activeLevelId, selection: [] }),
  setGridSize: (gridSize) => set({ gridSize }),
  setSnapToGrid: (snapToGrid) => set({ snapToGrid }),
  setSnapToObjects: (snapToObjects) => set({ snapToObjects }),
  setPlan: (p) => set((s) => ({ plan: { ...s.plan, ...p } })),
  setView3d: (p) => set((s) => ({ view3d: { ...s.view3d, ...p } })),
  setViewport: (viewport) => set({ viewport }),
  setCursor: (cursor) => set({ cursor }),
  setLiveMeasure: (liveMeasure) => set({ liveMeasure }),
  requestFit: () => set((s) => ({ fitRequest: s.fitRequest + 1 })),
  requestCamera: (mode) => set((s) => ({ cameraRequest: { mode, n: s.cameraRequest.n + 1 } })),
  setWalkFreeCamera: (walkFreeCamera) => set({ walkFreeCamera }),
}));

// Persistencia de preferencias de la interfaz.
useEditorStore.subscribe((s, prev) => {
  if (
    s.gridSize === prev.gridSize &&
    s.snapToGrid === prev.snapToGrid &&
    s.snapToObjects === prev.snapToObjects &&
    s.plan === prev.plan &&
    s.view3d === prev.view3d &&
    s.createWallsWithRoom === prev.createWallsWithRoom
  )
    return;
  try {
    const p: Prefs = {
      gridSize: s.gridSize,
      snapToGrid: s.snapToGrid,
      snapToObjects: s.snapToObjects,
      plan: s.plan,
      view3d: s.view3d,
      createWallsWithRoom: s.createWallsWithRoom,
    };
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* almacenamiento no disponible: se ignora */
  }
});
