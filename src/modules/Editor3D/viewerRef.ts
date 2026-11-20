import type { Camera, Scene, WebGLRenderer } from 'three';

export interface ViewerHandles {
  camera: Camera;
  gl: WebGLRenderer;
  scene: Scene;
  /** Controles orbitales (en el modelo 3D; no en el recorrido). */
  controls?: { target: { set(x: number, y: number, z: number): unknown }; update(): unknown; addEventListener?(type: string, fn: () => void): void; removeEventListener?(type: string, fn: () => void): void } | null;
}

let current: ViewerHandles | null = null;

export function registerViewer(v: ViewerHandles | null) {
  current = v;
}

/** Acceso a la escena 3D activa (exportación GLB, capturas, soltar muebles). */
export function getViewer(): ViewerHandles | null {
  return current;
}
