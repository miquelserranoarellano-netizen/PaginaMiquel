/**
 * Controlador en primera persona: WASD + ratón (pointer lock), colisiones con
 * muros y muebles, apertura automática de puertas y modo de cámara libre.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { PerspectiveCamera } from 'three';
import { distance } from '@/core/geometry';
import { getOpeningDef } from '@/modules/DoorsAndWindows/catalog';
import { resetDoorTargets, setDoorTarget } from '@/modules/DoorsAndWindows/doorControl';
import { wallFrame } from '@/modules/Walls/geometry';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { EYE_HEIGHT, buildColliders, moveWithCollisions } from './collision';
import { roomAt, spawnPoint } from './spawn';
import { useWalkStore, walkInput, walkRequests } from './walkStore';

const WALK_SPEED = 1.5;
const RUN_SPEED = 3.2;
const FLY_SPEED = 4;
const LOOK_SENS = 0.0022;
const DOOR_RADIUS = 1.7;

export function WalkController() {
  const { camera, gl } = useThree();
  const doc = useProjectStore((s) => s.doc);
  const levelId = useEditorStore((s) => s.activeLevelId);
  const free = useEditorStore((s) => s.walkFreeCamera);
  const level = doc.levels[levelId];
  const walls = doc.walls;
  const openingsAll = doc.openings;
  const furniture = doc.furniture;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const colliders = useMemo(() => buildColliders(doc, levelId), [walls, openingsAll, furniture, levelId]);
  const doors = useMemo(
    () =>
      Object.values(openingsAll)
        .filter((o) => o.levelId === levelId && getOpeningDef(o.kind).passable)
        .map((o) => {
          const w = walls[o.wallId];
          if (!w) return null;
          const f = wallFrame(w);
          return { id: o.id, x: w.start.x + f.dir.x * o.offset, z: w.start.y + f.dir.y * o.offset };
        })
        .filter((d): d is { id: string; x: number; z: number } => !!d),
    [openingsAll, walls, levelId],
  );

  const st = useRef({ x: 0, z: 0, y: EYE_HEIGHT, yaw: 0, pitch: 0, vx: 0, vz: 0, vy: 0, bob: 0, keys: new Set<string>(), hudT: 0, skip: 0 });

  // Posición inicial y cambio de planta.
  useEffect(() => {
    const ed = useEditorStore.getState();
    const sel = ed.selection.find((s) => s.kind === 'room')?.id;
    const sp = spawnPoint(useProjectStore.getState().doc, levelId, sel);
    Object.assign(st.current, { x: sp.pos.x, z: sp.pos.y, yaw: sp.yaw, pitch: -0.05, vx: 0, vz: 0, y: (level?.elevation ?? 0) + EYE_HEIGHT });
  }, [levelId, level?.elevation]);

  // Cámara: campo de visión más amplio en primera persona.
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    const prevFov = cam.fov;
    cam.fov = 72;
    cam.near = 0.05;
    cam.updateProjectionMatrix();
    cam.rotation.order = 'YXZ';
    return () => {
      cam.fov = prevFov;
      cam.rotation.order = 'XYZ';
      cam.updateProjectionMatrix();
      resetDoorTargets();
    };
  }, [camera]);

  // Ratón y teclado.
  useEffect(() => {
    const dom = gl.domElement;
    const s = st.current;
    const look = (dx: number, dy: number) => {
      // Chromium puede enviar saltos enormes justo al bloquear el ratón: se descartan.
      if (s.skip > 0) {
        s.skip--;
        return;
      }
      if (Math.abs(dx) > 250 || Math.abs(dy) > 250) return;
      s.yaw -= dx * LOOK_SENS;
      s.pitch = Math.max(-1.5, Math.min(1.5, s.pitch - dy * LOOK_SENS));
    };
    // Ratón: clic para bloquear el puntero. Dedo (o ratón sin bloqueo): arrastrar para mirar.
    let lastType = 'mouse';
    let drag: { id: number; x: number; y: number; touch: boolean } | null = null;
    const onClick = () => {
      if (lastType === 'mouse' && document.pointerLockElement !== dom) {
        const req = dom.requestPointerLock?.() as unknown as Promise<void> | undefined;
        req?.catch?.(() => undefined);
      }
    };
    const onLockChange = () => {
      const locked = document.pointerLockElement === dom;
      if (locked) s.skip = 2;
      useWalkStore.getState().set({ locked });
    };
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === dom) look(e.movementX, e.movementY);
    };
    const onDown = (e: PointerEvent) => {
      lastType = e.pointerType;
      if (e.pointerType !== 'mouse') useWalkStore.getState().set({ interacted: true });
      if (document.pointerLockElement === dom || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY, touch: e.pointerType !== 'mouse' };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id || document.pointerLockElement === dom) return;
      const k = drag.touch ? 2.6 : 1.4;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      s.yaw -= dx * LOOK_SENS * k;
      s.pitch = Math.max(-1.5, Math.min(1.5, s.pitch - dy * LOOK_SENS * k));
    };
    const onUp = (e: PointerEvent) => {
      if (drag && e.pointerId === drag.id) drag = null;
    };
    const typing = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      return !!t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA');
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (typing(e) || e.ctrlKey || e.metaKey) return;
      s.keys.add(e.code);
      if (e.code === 'KeyF') useEditorStore.getState().setWalkFreeCamera(!useEditorStore.getState().walkFreeCamera);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => s.keys.delete(e.code);
    const onBlur = () => s.keys.clear();
    dom.style.touchAction = 'none';
    dom.addEventListener('click', onClick);
    dom.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerlockchange', onLockChange);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      dom.removeEventListener('click', onClick);
      dom.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerlockchange', onLockChange);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      if (document.pointerLockElement === dom) document.exitPointerLock();
      useWalkStore.getState().set({ locked: false });
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(0.05, rawDt);
    const s = st.current;
    const k = s.keys;
    const floorY = (level?.elevation ?? 0) + EYE_HEIGHT;

    if (walkRequests.teleport) {
      s.x = walkRequests.teleport.x;
      s.z = walkRequests.teleport.z;
      if (walkRequests.teleport.yaw !== undefined) s.yaw = walkRequests.teleport.yaw;
      s.y = floorY;
      walkRequests.teleport = null;
    }

    // Dirección deseada en el plano horizontal.
    let ix = 0;
    let iz = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) iz -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) iz += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) ix -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) ix += 1;
    // Joystick táctil (analógico): se suma al teclado.
    ix += walkInput.x;
    iz += walkInput.y;
    const len = Math.max(1, Math.hypot(ix, iz));
    ix /= len;
    iz /= len;
    const sin = Math.sin(s.yaw);
    const cos = Math.cos(s.yaw);
    // Adelante = (-sin, -cos); derecha = (cos, -sin)
    const wx = -iz * -sin + ix * cos;
    const wz = -iz * -cos + ix * -sin;
    const run = k.has('ShiftLeft') || k.has('ShiftRight') || Math.hypot(walkInput.x, walkInput.y) > 0.92;

    if (free) {
      const speed = FLY_SPEED * (run ? 2.5 : 1);
      // En cámara libre W/S siguen la inclinación de la mirada.
      const fwd = -iz;
      const cp = Math.cos(s.pitch);
      s.x += (fwd * -sin * cp + ix * cos) * speed * dt;
      s.z += (fwd * -cos * cp + ix * -sin) * speed * dt;
      let vy = fwd * Math.sin(s.pitch);
      if (k.has('Space') || k.has('KeyE')) vy += 1;
      if (k.has('KeyQ') || k.has('ControlLeft') || k.has('KeyC')) vy -= 1;
      vy += walkInput.up;
      s.y = Math.max(0.2, s.y + vy * speed * dt);
    } else {
      const speed = run ? RUN_SPEED : WALK_SPEED;
      // Aceleración suave.
      const a = Math.min(1, dt * 10);
      s.vx += (wx * speed - s.vx) * a;
      s.vz += (wz * speed - s.vz) * a;
      const next = moveWithCollisions({ x: s.x, y: s.z }, { x: s.vx * dt, y: s.vz * dt }, colliders);
      const moving = Math.hypot(s.vx, s.vz) > 0.2;
      s.bob = moving ? s.bob + dt * (run ? 11 : 8) : s.bob * 0.9;
      s.x = next.x;
      s.z = next.y;
      // Vuelve suavemente a la altura de los ojos (tras la cámara libre).
      const bobY = moving ? Math.sin(s.bob) * 0.025 : 0;
      s.y += (floorY + bobY - s.y) * Math.min(1, dt * 8);
    }

    camera.position.set(s.x, s.y, s.z);
    camera.rotation.set(s.pitch, s.yaw, 0, 'YXZ');

    // Puertas automáticas.
    for (const d of doors) setDoorTarget(d.id, Math.abs(s.y - floorY) < 1.2 && distance({ x: d.x, y: d.z }, { x: s.x, y: s.z }) < DOOR_RADIUS ? 1 : 0);

    // HUD a ~10 Hz.
    s.hudT += rawDt;
    if (s.hudT > 0.1) {
      s.hudT = 0;
      const room = roomAt(useProjectStore.getState().doc, levelId, { x: s.x, y: s.z });
      useWalkStore.getState().set({ x: s.x, z: s.z, yaw: s.yaw, roomName: room?.name ?? null });
    }
  });

  return null;
}
