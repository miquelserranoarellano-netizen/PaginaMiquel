import { create } from 'zustand';

export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error' | 'idle';

interface SaveState {
  status: SaveStatus;
  lastSavedAt: number | null;
  error: string | null;
  set: (p: Partial<Omit<SaveState, 'set'>>) => void;
}

export const useSaveStore = create<SaveState>()((set) => ({
  status: 'idle',
  lastSavedAt: null,
  error: null,
  set: (p) => set(p),
}));
