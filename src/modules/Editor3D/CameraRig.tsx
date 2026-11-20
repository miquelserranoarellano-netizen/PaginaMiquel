/**
 * Cámara orbital con transiciones suaves entre vistas predefinidas
 * (exterior, cenital, interior).
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
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

function presetFor(mode: 'exterior' | 'top' | 'interior', b: SceneBounds): { pos: Vector3; target: Vector3 } | null {
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
  const dir = new Vector3(0.75, 0.8, 1.15).normalize();
  return { pos: new Vector3(cx, cy, cz).addScaledVector(dir, b.radius * 2.4), target: new Vector3(cx, Math.min(1.2, cy), cz) };
}

export function CameraRig({ bounds }: { bounds: SceneBounds }) {
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const tween = useRef<Tween | null>(null);
  const request = useEditorStore((s) => s.cameraRequest);
  const first = useRef(true);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  useEffect(() => {
    const preset = presetFor(first.current ? 'exterior' : request.mode, boundsRef.current);
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
