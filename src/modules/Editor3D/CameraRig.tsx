/**
 * Cámara orbital con transiciones suaves entre vistas predefinidas
 * (exterior, cenital, interior).
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { type PerspectiveCamera, Vector3 } from 'three';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { bboxOf, labelPoint, polygonArea } from '@/core/geometry';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import type { SceneBounds } from './sceneBounds';

interface Tween {
  fromPos: Vector3;
  toPos: Vector3;
  fromTarget: Vector3;
  toTarget: Vector3;
  t: number;
}

function presetFor(mode: 'exterior' | 'top' | 'interior', b: SceneBounds, studio: boolean): { pos: Vector3; target: Vector3 } | null {
  const [cx, cy, cz] = b.center;
  if (mode === 'top') return { pos: new Vector3(cx, b.maxY + b.radius * 2.6, cz + 0.01), target: new Vector3(cx, 0, cz) };
  if (mode === 'interior') {
    const ed = useEditorStore.getState();
    const doc = projectApi.doc;
    const sel = ed.selection.find((s) => s.kind === 'room');
    const room =
      (sel && doc.rooms[sel.id]) ||
      Object.values(doc.rooms)
        .filter((r) => r.levelId === ed.activeLevelId)
        .sort((a, c) => polygonArea(c.points) - polygonArea(a.points))[0];
    if (!room) return null;
    const level = doc.levels[room.levelId];
    const lp = labelPoint(room.points);
    const bb = bboxOf(room.points);
    const y = (level?.elevation ?? 0) + 1.6;
    // Desde una esquina mirando en diagonal hacia la contraria.
    const pos = new Vector3(lp.x + (bb.minX - lp.x) * 0.72, y, lp.y + (bb.maxY - lp.y) * 0.72);
    const target = new Vector3(lp.x + (bb.maxX - lp.x) * 0.6, y - 0.35, lp.y + (bb.minY - lp.y) * 0.6);
    return { pos, target };
  }
  // Vista alta desde delante a la izquierda, como una maqueta.
  const dir = studio ? new Vector3(-0.72, 1.18, 1.05).normalize() : new Vector3(0.75, 0.8, 1.15).normalize();
  return { pos: new Vector3(cx, cy, cz).addScaledVector(dir, b.radius * (studio ? 3.35 : 2.4)), target: new Vector3(cx, Math.min(1.2, cy), cz) };
}

export function CameraRig({ bounds, studio }: { bounds: SceneBounds; studio: boolean }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const tween = useRef<Tween | null>(null);
  const request = useEditorStore((s) => s.cameraRequest);
  const first = useRef(true);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;
  const studioRef = useRef(studio);
  studioRef.current = studio;

  // Óptica: cerrada en estudio (aspecto de maqueta) y gran angular en la vista interior.
  const interior = request.mode === 'interior' && request.n > 0;
  const targetFov = interior ? 64 : studio ? 32 : 45;
  const fovTween = useRef<{ from: number; to: number; t: number } | null>(null);
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    if (first.current) {
      cam.fov = targetFov;
      cam.updateProjectionMatrix();
    } else fovTween.current = { from: cam.fov, to: targetFov, t: 0 };
  }, [camera, targetFov]);

  useEffect(() => {
    const preset = presetFor(first.current ? 'exterior' : request.mode, boundsRef.current, studioRef.current);
    if (!preset) return;
    if (first.current) {
      first.current = false;
      camera.position.copy(preset.pos);
      controls.current?.target.copy(preset.target);
      controls.current?.update();
      return;
    }
    if (request.mode === 'interior') useEditorStore.getState().setView3d({ showCeilings: true, cutaway: false });
    tween.current = { fromPos: camera.position.clone(), toPos: preset.pos, fromTarget: controls.current?.target.clone() ?? new Vector3(), toTarget: preset.target, t: 0 };
  }, [request, camera]);

  useFrame((_, dt) => {
    const ft = fovTween.current;
    if (ft) {
      const cam = camera as PerspectiveCamera;
      ft.t = Math.min(1, ft.t + dt / 0.7);
      cam.fov = ft.from + (ft.to - ft.from) * ft.t;
      cam.updateProjectionMatrix();
      if (ft.t >= 1) fovTween.current = null;
    }
    const tw = tween.current;
    if (!tw || !controls.current) return;
    tw.t = Math.min(1, tw.t + dt / 0.7);
    const k = tw.t < 0.5 ? 2 * tw.t * tw.t : 1 - Math.pow(-2 * tw.t + 2, 2) / 2;
    camera.position.lerpVectors(tw.fromPos, tw.toPos, k);
    controls.current.target.lerpVectors(tw.fromTarget, tw.toTarget, k);
    controls.current.update();
    if (tw.t >= 1) tween.current = null;
  });

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.12} minDistance={0.3} maxDistance={400} zoomToCursor screenSpacePanning />;
}
