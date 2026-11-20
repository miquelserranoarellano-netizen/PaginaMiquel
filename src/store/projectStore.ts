/**
 * Store del documento: única fuente de verdad del proyecto + historial.
 *
 * - apply(recipe): cambio puntual con entrada de historial.
 * - Gestos (arrastres): beginGesture() guarda el estado base, updateGesture()
 *   aplica la receta SIEMPRE sobre ese estado base (permite deltas absolutos
 *   desde el inicio del arrastre) y endGesture() apila una sola entrada.
 */
import { create } from 'zustand';
import { produce, type Draft } from 'immer';
import type { ProjectDoc } from '@/modules/FloorPlan/types';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';

export type Recipe = (draft: Draft<ProjectDoc>) => void;

const HISTORY_LIMIT = 200;

interface ProjectState {
  doc: ProjectDoc;
  past: ProjectDoc[];
  future: ProjectDoc[];
  gestureBase: ProjectDoc | null;
  /** Se incrementa con cada cambio del documento (autoguardado). */
  revision: number;
  apply: (recipe: Recipe) => void;
  /** Cambio sin historial (p. ej. renombrar desde la lista de proyectos). */
  applySilently: (recipe: Recipe) => void;
  beginGesture: () => void;
  updateGesture: (recipe: Recipe) => void;
  endGesture: () => void;
  cancelGesture: () => void;
  undo: () => void;
  redo: () => void;
  load: (doc: ProjectDoc) => void;
}

function pushPast(past: ProjectDoc[], doc: ProjectDoc): ProjectDoc[] {
  const next = past.length >= HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT + 1) : past.slice();
  next.push(doc);
  return next;
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  doc: createEmptyProject(),
  past: [],
  future: [],
  gestureBase: null,
  revision: 0,

  apply: (recipe) => {
    const { doc, past, gestureBase } = get();
    if (gestureBase) {
      // Durante un gesto los cambios puntuales se integran en el gesto.
      const next = produce(doc, recipe);
      if (next !== doc) set((s) => ({ doc: next, gestureBase: produce(s.gestureBase!, recipe), revision: s.revision + 1 }));
      return;
    }
    const next = produce(doc, recipe);
    if (next === doc) return;
    set((s) => ({ doc: next, past: pushPast(past, doc), future: [], revision: s.revision + 1 }));
  },

  applySilently: (recipe) => {
    const { doc } = get();
    const next = produce(doc, recipe);
    if (next === doc) return;
    set((s) => ({
      doc: next,
      past: s.past.map((d) => produce(d, recipe)),
      future: s.future.map((d) => produce(d, recipe)),
      revision: s.revision + 1,
    }));
  },

  beginGesture: () => {
    if (get().gestureBase) return;
    set({ gestureBase: get().doc });
  },

  updateGesture: (recipe) => {
    const base = get().gestureBase;
    if (!base) return;
    const next = produce(base, recipe);
    set((s) => ({ doc: next, revision: s.revision + 1 }));
  },

  endGesture: () => {
    const { gestureBase, doc, past } = get();
    if (!gestureBase) return;
    if (gestureBase === doc) {
      set({ gestureBase: null });
      return;
    }
    set({ gestureBase: null, past: pushPast(past, gestureBase), future: [] });
  },

  cancelGesture: () => {
    const { gestureBase } = get();
    if (!gestureBase) return;
    set((s) => ({ doc: gestureBase, gestureBase: null, revision: s.revision + 1 }));
  },

  undo: () => {
    const { past, doc, future, gestureBase } = get();
    if (gestureBase || !past.length) return;
    const prev = past[past.length - 1];
    set((s) => ({ doc: prev, past: past.slice(0, -1), future: [doc, ...future].slice(0, HISTORY_LIMIT), revision: s.revision + 1 }));
  },

  redo: () => {
    const { past, doc, future, gestureBase } = get();
    if (gestureBase || !future.length) return;
    const [next, ...rest] = future;
    set((s) => ({ doc: next, past: pushPast(past, doc), future: rest, revision: s.revision + 1 }));
  },

  load: (doc) => set((s) => ({ doc, past: [], future: [], gestureBase: null, revision: s.revision + 1 })),
}));

/** Acceso directo fuera de React. */
export const projectApi = {
  get doc() {
    return useProjectStore.getState().doc;
  },
  apply: (r: Recipe) => useProjectStore.getState().apply(r),
  beginGesture: () => useProjectStore.getState().beginGesture(),
  updateGesture: (r: Recipe) => useProjectStore.getState().updateGesture(r),
  endGesture: () => useProjectStore.getState().endGesture(),
  cancelGesture: () => useProjectStore.getState().cancelGesture(),
};
