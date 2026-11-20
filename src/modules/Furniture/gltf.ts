/**
 * Carga de modelos GLB/GLTF importados por el usuario. Los modelos se guardan
 * dentro del proyecto (data URL) para que el proyecto sea autocontenido.
 */
import { Box3, type Group, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const cache = new Map<string, Promise<Group>>();

export function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function parseModel(data: ArrayBuffer): Promise<Group> {
  return new Promise((resolve, reject) => {
    new GLTFLoader().parse(
      data,
      '',
      (gltf) => resolve(gltf.scene),
      (err) => reject(err instanceof Error ? err : new Error('No se pudo leer el modelo')),
    );
  });
}

/** Carga (con caché por id de recurso) la escena de un modelo importado. */
export function loadAssetModel(assetId: string, dataUrl: string): Promise<Group> {
  let p = cache.get(assetId);
  if (!p) {
    p = parseModel(dataUrlToArrayBuffer(dataUrl));
    cache.set(assetId, p);
    p.catch(() => cache.delete(assetId));
  }
  return p;
}

/** Tamaño del modelo en metros; si parece estar en centímetros/milímetros se reescala. */
export function measureModel(scene: Group): { w: number; d: number; h: number; unitScale: number } {
  const size = new Box3().setFromObject(scene).getSize(new Vector3());
  let unitScale = 1;
  const max = Math.max(size.x, size.y, size.z);
  if (max > 300) unitScale = 0.001;
  else if (max > 30) unitScale = 0.01;
  return { w: Math.max(0.05, size.x * unitScale), d: Math.max(0.05, size.z * unitScale), h: Math.max(0.05, size.y * unitScale), unitScale };
}

export function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error('Error al leer el fichero'));
    r.readAsDataURL(file);
  });
}
