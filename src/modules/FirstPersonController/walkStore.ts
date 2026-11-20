import { create } from 'zustand';

/** Estado del recorrido para el HUD (se actualiza ~10 veces por segundo). */
interface WalkState {
  x: number;
  z: number;
  yaw: number;
  locked: boolean;
  roomName: string | null;
  /** El visitante ya ha tocado la pantalla (oculta la ayuda en táctil). */
  interacted: boolean;
  set: (p: Partial<Omit<WalkState, 'set'>>) => void;
}

export const useWalkStore = create<WalkState>()((set) => ({
  x: 0,
  z: 0,
  yaw: 0,
  locked: false,
  roomName: null,
  interacted: false,
  set: (p) => set(p),
}));

/** Petición de teletransporte (cambio de planta o "empezar aquí"). */
export const walkRequests = { teleport: null as null | { x: number; z: number; yaw?: number } };

/** Entrada del joystick táctil: x derecha, y hacia atrás (−1 = adelante), up para la cámara libre. */
export const walkInput = { x: 0, y: 0, up: 0 };
