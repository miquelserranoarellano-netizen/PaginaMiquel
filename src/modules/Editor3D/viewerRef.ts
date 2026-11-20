import type { Camera, Scene, WebGLRenderer } from 'three';

export interface ViewerHandles {
  camera: Camera;
  gl: WebGLRenderer;
  scene: Scene;
}

let current: ViewerHandles | null = null;

export function registerViewer(v: ViewerHandles | null) {
  current = v;
}

/** Acceso a la escena 3D activa (exportación GLB, capturas, soltar muebles). */
export function getViewer(): ViewerHandles | null {
  return current;
}
