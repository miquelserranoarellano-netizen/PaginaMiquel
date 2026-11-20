import { create } from 'zustand';

/** Estado del recorrido para el HUD (se actualiza ~10 veces por segundo). */
interface WalkState {
  x: number;
  z: number;
  yaw: number;
  locked: boolean;
  roomName: string | null;
  set: (p: Partial<Omit<WalkState, 'set'>>) => void;
}

export const useWalkStore = create<WalkState>()((set) => ({
  x: 0,
  z: 0,
  yaw: 0,
  locked: false,
  roomName: null,
  set: (p) => set(p),
}));

/** Petición de teletransporte (cambio de planta o "empezar aquí"). */
export const walkRequests = { teleport: null as null | { x: number; z: number; yaw?: number } };
