/**
 * Miniaturas 3D de la biblioteca, renderizadas bajo demanda con un único
 * renderizador fuera de pantalla y guardadas en memoria.
 */
import { useEffect, useState } from 'react';
import { ACESFilmicToneMapping, Box3, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import type { CatalogItem } from './types';
import { buildCatalogObject } from './buildObject';

const W = 192;
const H = 144;
const cache = new Map<string, string>();
const listeners = new Map<string, Set<(url: string) => void>>();
const queue: CatalogItem[] = [];
let renderer: WebGLRenderer | null = null;
let failed = false;
let scheduled = false;

function setup() {
  if (renderer || failed) return renderer;
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
  } catch {
    failed = true;
    renderer = null;
  }
  return renderer;
}

function renderItem(item: CatalogItem): string | null {
  const r = setup();
  if (!r) return null;
  const scene = new Scene();
  scene.add(new HemisphereLight('#ffffff', '#b9b2a6', 1.6));
  const sun = new DirectionalLight('#ffffff', 2.2);
  sun.position.set(3, 6, 4);
  scene.add(sun);
  const obj = buildCatalogObject(item, item.w, item.d, item.h);
  scene.add(obj);
  const box = new Box3().setFromObject(obj);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const radius = Math.max(0.05, size.length() / 2);
  const camera = new PerspectiveCamera(30, W / H, 0.01, 200);
  const dir = new Vector3(1, 0.85, 1.5).normalize();
  camera.position.copy(center).addScaledVector(dir, (radius / Math.sin((15 * Math.PI) / 180)) * 1.02);
  camera.lookAt(center);
  r.render(scene, camera);
  return r.domElement.toDataURL('image/png');
}

function pump() {
  scheduled = false;
  const start = performance.now();
  while (queue.length && performance.now() - start < 24) {
    const item = queue.shift()!;
    if (cache.has(item.id)) continue;
    const url = renderItem(item);
    if (!url) {
      queue.length = 0;
      return;
    }
    cache.set(item.id, url);
    listeners.get(item.id)?.forEach((fn) => fn(url));
    listeners.delete(item.id);
  }
  if (queue.length) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (ric) ric(pump);
  else setTimeout(pump, 16);
}

/** Miniatura 3D del elemento (undefined mientras se genera o si no hay WebGL). */
export function useThumbnail(item: CatalogItem): string | undefined {
  const [url, setUrl] = useState(() => cache.get(item.id));
  useEffect(() => {
    if (cache.has(item.id)) {
      setUrl(cache.get(item.id));
      return;
    }
    if (failed) return;
    const set = listeners.get(item.id) ?? new Set();
    set.add(setUrl);
    listeners.set(item.id, set);
    if (!queue.includes(item)) queue.push(item);
    schedule();
    return () => {
      listeners.get(item.id)?.delete(setUrl);
    };
  }, [item]);
  return url;
}
