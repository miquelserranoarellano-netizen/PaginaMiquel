/**
 * Arrastre de muebles en 3D sobre el plano del suelo de su planta.
 */
import { Plane, Raycaster, Vector2, Vector3, type Camera } from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { roundTo } from '@/core/geometry';
import { projectApi } from '@/store/projectStore';
import { useEditorStore } from '@/store/editorStore';

interface DragContext {
  camera: Camera;
  dom: HTMLElement;
  setControlsEnabled: (v: boolean) => void;
}

let ctx: DragContext | null = null;

export function registerDragContext(c: DragContext | null) {
  ctx = c;
}

export function beginFurnitureDrag(id: string, e: ThreeEvent<PointerEvent>) {
  if (!ctx) return;
  const doc = projectApi.doc;
  const item = doc.furniture[id];
  const level = item && doc.levels[item.levelId];
  if (!item || !level) return;
  const c = ctx;
  const plane = new Plane(new Vector3(0, 1, 0), -level.elevation);
  const hit = new Vector3();
  if (!e.ray.intersectPlane(plane, hit)) return;
  const offset = { x: item.position.x - hit.x, y: item.position.y - hit.z };
  const raycaster = new Raycaster();
  const ndc = new Vector2();
  let moved = false;
  c.setControlsEnabled(false);
  document.body.style.cursor = 'grabbing';

  const onMove = (ev: PointerEvent) => {
    const rect = c.dom.getBoundingClientRect();
    ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -((ev.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, c.camera);
    if (!raycaster.ray.intersectPlane(plane, hit)) return;
    if (!moved) {
      moved = true;
      projectApi.beginGesture();
    }
    const grid = ev.altKey ? 0 : Math.min(0.05, useEditorStore.getState().gridSize);
    const x = grid ? roundTo(hit.x + offset.x, grid) : hit.x + offset.x;
    const y = grid ? roundTo(hit.z + offset.y, grid) : hit.z + offset.y;
    projectApi.updateGesture((d) => {
      d.furniture[id].position = { x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000 };
    });
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    if (moved) projectApi.endGesture();
    c.setControlsEnabled(true);
    document.body.style.cursor = '';
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}
