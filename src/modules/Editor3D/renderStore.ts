/** Estado del render fotorrealista (trazado de rayos) del visor 3D. */
import { create } from 'zustand';

export type RenderStatus = 'off' | 'preparing' | 'rendering' | 'done' | 'error';

interface RenderState {
  status: RenderStatus;
  /** Muestras acumuladas (más muestras = menos ruido). */
  samples: number;
  error: string | null;
  set: (p: Partial<Omit<RenderState, 'set'>>) => void;
}

export const useRenderStore = create<RenderState>()((set) => ({ status: 'off', samples: 0, error: null, set: (p) => set(p) }));

/** Muestras con las que se considera terminado (se detiene para no gastar batería). */
export const MAX_SAMPLES = 600;

export const renderActive = (s: RenderStatus) => s !== 'off';

export function startRender(): void {
  useRenderStore.getState().set({ status: 'preparing', samples: 0, error: null });
}

export function stopRender(): void {
  useRenderStore.getState().set({ status: 'off', samples: 0, error: null });
}
