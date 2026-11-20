/**
 * Modelos 3D de puertas y ventanas, integrados en el hueco del muro.
 * Marco local: x a lo largo del muro, y vertical, z hacia la cara A.
 */
import { memo, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { Group, Material } from 'three';
import { add, scale } from '@/core/geometry';
import type { Level, Opening, Wall } from '@/modules/FloorPlan/types';
import { getMaterial } from '@/modules/Materials/materials3d';
import { wallFrame } from '@/modules/Walls/geometry';
import type { PickHandlers } from '@/modules/Walls/Walls3D';
import { getDoorTarget } from './doorControl';

const FW = 0.05; // ancho del perfil del marco

function Box({ p, s, m, cast = true }: { p: [number, number, number]; s: [number, number, number]; m: Material; cast?: boolean }) {
  return (
    <mesh position={p} material={m} castShadow={cast} receiveShadow>
      <boxGeometry args={s} />
    </mesh>
  );
}

/** Marco perimetral (jambas + dintel + opcionalmente travesaño inferior). */
function Frame({ w, h, depth, m, bottom }: { w: number; h: number; depth: number; m: Material; bottom?: boolean }) {
  return (
    <>
      <Box p={[-w / 2 + FW / 2, h / 2, 0]} s={[FW, h, depth]} m={m} />
      <Box p={[w / 2 - FW / 2, h / 2, 0]} s={[FW, h, depth]} m={m} />
      <Box p={[0, h - FW / 2, 0]} s={[w - 2 * FW, FW, depth]} m={m} />
      {bottom && <Box p={[0, FW / 2, 0]} s={[w - 2 * FW, FW, depth]} m={m} />}
    </>
  );
}

/** Hoja abatible con pivote en la bisagra. sign: dirección de giro. */
function SwingLeaf({ id, hingeX, width, height, sign, children }: { id: string; hingeX: number; width: number; height: number; sign: number; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const cur = useRef(0);
  useFrame((_, dt) => {
    const target = getDoorTarget(id);
    if (Math.abs(target - cur.current) < 1e-3 && ref.current?.userData.done) return;
    cur.current += (target - cur.current) * Math.min(1, dt * 4);
    if (ref.current) {
      ref.current.rotation.y = sign * cur.current * (Math.PI / 2) * 0.95;
      ref.current.userData.done = Math.abs(target - cur.current) < 1e-3;
    }
  });
  const dir = hingeX < 0 ? 1 : -1;
  return (
    <group ref={ref} position={[hingeX, 0, 0]}>
      <group position={[(dir * width) / 2, height / 2, 0]}>{children}</group>
    </group>
  );
}

function SlidingPanel({ id, distance, axis = 'x', children }: { id: string; distance: number; axis?: 'x' | 'y'; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const cur = useRef(0);
  useFrame((_, dt) => {
    const target = getDoorTarget(id);
    cur.current += (target - cur.current) * Math.min(1, dt * 3);
    if (ref.current) ref.current.position[axis] = cur.current * distance;
  });
  return <group ref={ref}>{children}</group>;
}

function Handle({ x, y, m }: { x: number; y: number; m: Material }) {
  return (
    <>
      <Box p={[x, y, 0.035]} s={[0.12, 0.02, 0.02]} m={m} cast={false} />
      <Box p={[x, y, -0.035]} s={[0.12, 0.02, 0.02]} m={m} cast={false} />
    </>
  );
}

function OpeningBody({ o, wall, clipY }: { o: Opening; wall: Wall; clipY?: number }) {
  const mo = { clipY };
  const frame = getMaterial(o.frame, mo);
  const panel = getMaterial(o.panel, mo);
  const metal = getMaterial({ materialId: 'acero', color: '#a7adb3' }, mo);
  const glass = getMaterial({ materialId: 'vidrio', color: '#7f97a3' }, mo);
  const stone = getMaterial({ materialId: 'marmol-blanco', color: '#e7e4de' }, mo);
  const t = wall.thickness;
  const depth = t + 0.02;
  const w = o.width;
  const h = o.height;
  const lw = w - 2 * FW;
  const lh = h - FW - 0.01;
  const swingSign = o.swing === 'a' ? 1 : -1;
  const threshold = o.sill < 0.01 && <Box p={[0, 0.006, 0]} s={[w, 0.012, t + 0.01]} m={stone} cast={false} />;

  switch (o.kind) {
    case 'door':
    case 'entrance-door': {
      const hingeX = o.hinge === 'left' ? -w / 2 + FW : w / 2 - FW;
      const sign = (o.hinge === 'left' ? -1 : 1) * swingSign;
      const thick = o.kind === 'entrance-door' ? 0.06 : 0.04;
      return (
        <>
          <Frame w={w} h={h} depth={depth} m={frame} />
          {threshold}
          <SwingLeaf id={o.id} hingeX={hingeX} width={lw} height={lh} sign={sign}>
            <Box p={[0, 0, 0]} s={[lw, lh, thick]} m={panel} />
            {o.kind === 'entrance-door' && <Box p={[(o.hinge === 'left' ? 1 : -1) * (lw / 2 - 0.1), 0, 0]} s={[0.03, 0.8, thick + 0.08]} m={metal} cast={false} />}
            {o.kind === 'door' && <Handle x={(o.hinge === 'left' ? 1 : -1) * (lw / 2 - 0.09)} y={-lh / 2 + 1.0} m={metal} />}
          </SwingLeaf>
        </>
      );
    }
    case 'double-door':
    case 'french-window': {
      const glassy = o.kind === 'french-window';
      const half = lw / 2;
      const leaf = (sideSign: number) => (
        <>
          {glassy ? (
            <>
              <Box p={[0, 0, 0]} s={[half, lh, 0.012]} m={glass} cast={false} />
              <Box p={[-half / 2 + 0.03, 0, 0]} s={[0.06, lh, 0.05]} m={frame} />
              <Box p={[half / 2 - 0.03, 0, 0]} s={[0.06, lh, 0.05]} m={frame} />
              <Box p={[0, lh / 2 - 0.03, 0]} s={[half, 0.06, 0.05]} m={frame} />
              <Box p={[0, -lh / 2 + 0.05, 0]} s={[half, 0.1, 0.05]} m={frame} />
            </>
          ) : (
            <Box p={[0, 0, 0]} s={[half, lh, 0.04]} m={panel} />
          )}
          <Handle x={sideSign * (half / 2 - 0.08)} y={-lh / 2 + 1.0} m={metal} />
        </>
      );
      return (
        <>
          <Frame w={w} h={h} depth={depth} m={frame} />
          {threshold}
          <SwingLeaf id={o.id} hingeX={-w / 2 + FW} width={half} height={lh} sign={-swingSign}>
            {leaf(1)}
          </SwingLeaf>
          <SwingLeaf id={o.id} hingeX={w / 2 - FW} width={half} height={lh} sign={swingSign}>
            {leaf(-1)}
          </SwingLeaf>
        </>
      );
    }
    case 'sliding-door':
    case 'sliding-window': {
      const glassy = o.kind === 'sliding-window';
      const pw = lw / 2 + 0.03;
      const pane = (x: number, z: number) => (
        <group position={[x, lh / 2, z]}>
          {glassy ? (
            <>
              <Box p={[0, 0, 0]} s={[pw, lh, 0.012]} m={glass} cast={false} />
              <Box p={[-pw / 2 + 0.03, 0, 0]} s={[0.06, lh, 0.04]} m={frame} />
              <Box p={[pw / 2 - 0.03, 0, 0]} s={[0.06, lh, 0.04]} m={frame} />
              <Box p={[0, lh / 2 - 0.03, 0]} s={[pw, 0.06, 0.04]} m={frame} />
              <Box p={[0, -lh / 2 + 0.03, 0]} s={[pw, 0.06, 0.04]} m={frame} />
            </>
          ) : (
            <Box p={[0, 0, 0]} s={[pw, lh, 0.035]} m={panel} />
          )}
        </group>
      );
      return (
        <>
          <Frame w={w} h={h} depth={depth} m={frame} bottom={glassy} />
          {!glassy && threshold}
          {pane(lw / 4, -0.025)}
          <SlidingPanel id={o.id} distance={lw / 2 - 0.02}>
            {pane(-lw / 4, 0.025)}
          </SlidingPanel>
        </>
      );
    }
    case 'garage-door': {
      const grooves = Math.max(3, Math.round(lh / 0.5));
      return (
        <>
          <Frame w={w} h={h} depth={depth} m={frame} />
          {threshold}
          <SlidingPanel id={o.id} distance={lh * 0.9} axis="y">
            <Box p={[0, lh / 2, -t / 4]} s={[lw, lh, 0.05]} m={panel} />
            {Array.from({ length: grooves - 1 }, (_, i) => (
              <Box key={i} p={[0, (lh / grooves) * (i + 1), -t / 4 + 0.027]} s={[lw, 0.015, 0.006]} m={frame} cast={false} />
            ))}
          </SlidingPanel>
        </>
      );
    }
    default: {
      // Ventanas: marco, vidrio, parteluz y vierteaguas.
      const twoLeaves = o.kind === 'window';
      return (
        <>
          <Frame w={w} h={h} depth={0.07} m={frame} bottom />
          <Box p={[0, h / 2, 0]} s={[lw, h - 2 * FW, 0.012]} m={glass} cast={false} />
          {twoLeaves && <Box p={[0, h / 2, 0]} s={[0.05, h - 2 * FW, 0.06]} m={frame} />}
          {o.sill > 0.05 ? <Box p={[0, -0.015, 0]} s={[w + 0.06, 0.03, t + 0.08]} m={stone} /> : threshold}
        </>
      );
    }
  }
}

const OpeningModel = memo(function OpeningModel({ o, wall, elevation, clipY, selected, pick }: { o: Opening; wall: Wall; elevation: number; clipY?: number; selected: boolean; pick: (kind: 'opening', id: string) => PickHandlers }) {
  const f = wallFrame(wall);
  const c = add(wall.start, scale(f.dir, o.offset));
  const body = useMemo(() => <OpeningBody o={o} wall={wall} clipY={clipY} />, [o, wall, clipY]);
  return (
    <group position={[c.x, elevation + o.sill, c.y]} rotation={[0, -f.angle, 0]} userData={{ ref: { kind: 'opening', id: o.id } }} {...pick('opening', o.id)}>
      {body}
      {selected && (
        <mesh position={[0, o.height / 2, 0]}>
          <boxGeometry args={[o.width + 0.04, o.height + 0.04, wall.thickness + 0.06]} />
          <meshBasicMaterial visible={false} />
          <Edges color="#2563eb" lineWidth={2} />
        </mesh>
      )}
    </group>
  );
});

export const Openings3D = memo(function Openings3D({ openings, walls, level, cut, selectedIds, pick }: { openings: Opening[]; walls: Record<string, Wall>; level: Level; cut?: number; selectedIds: Set<string>; pick: (kind: 'opening', id: string) => PickHandlers }) {
  return (
    <group name="huecos">
      {openings.map((o) => {
        const w = walls[o.wallId];
        if (!w || (cut !== undefined && o.sill >= cut)) return null;
        return <OpeningModel key={o.id} o={o} wall={w} elevation={level.elevation} clipY={cut !== undefined ? level.elevation + cut : undefined} selected={selectedIds.has(o.id)} pick={pick} />;
      })}
    </group>
  );
});
