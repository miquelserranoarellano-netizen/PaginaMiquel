/**
 * Renderizador de miniaturas de la biblioteca (three.js). Se carga bajo
 * demanda desde thumbnails.ts para no incluir el motor 3D en el arranque.
 */
import { ACESFilmicToneMapping, Box3, DirectionalLight, HemisphereLight, PerspectiveCamera, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three';
import type { CatalogItem } from './types';
import { buildCatalogObject } from './buildObject';

const W = 192;
const H = 144;
let renderer: WebGLRenderer | null = null;
let failed = false;

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

export function renderItem(item: CatalogItem): string | null {
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

