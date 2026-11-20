import { memo, useEffect, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import type { Level, Opening, Wall } from '@/modules/FloorPlan/types';
import { getMaterial } from '@/modules/Materials/materials3d';
import { buildWallPieces, computeFootprints, wallFrame, type WallFootprint } from './geometry';
import { buildWallGeometry } from './wallMesh';

export interface PickHandlers {
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerOver: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut: (e: ThreeEvent<PointerEvent>) => void;
}

const fpKey = (fp: WallFootprint) => fp.polygon.map((p) => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join(';');

const WallMesh = memo(function WallMesh({
  wall,
  footprint,
  openings,
  elevation,
  cut,
  selected,
  pick,
}: {
  wall: Wall;
  footprint: WallFootprint;
  openings: Opening[];
  elevation: number;
  cut?: number;
  selected: boolean;
  pick: (kind: 'wall', id: string) => PickHandlers;
}) {
  const key = fpKey(footprint);
  const geometry = useMemo(
    () => buildWallGeometry(buildWallPieces(wall, footprint, openings), wallFrame(wall), elevation, cut),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [wall, key, openings, elevation, cut],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);
  // La coronación (y la base) se pinta siempre en blanco mate, como en las maquetas.
  const materials = useMemo(() => [getMaterial(wall.sideA), getMaterial(wall.sideB), getMaterial(wall.sideA), getMaterial(WALL_CAP)], [wall.sideA, wall.sideB]);
  return (
    <mesh geometry={geometry} material={materials} castShadow receiveShadow userData={{ ref: { kind: 'wall', id: wall.id } }} {...pick('wall', wall.id)}>
      {selected && <Edges threshold={20} color="#2563eb" lineWidth={2} />}
    </mesh>
  );
});

export const Walls3D = memo(function Walls3D({
  walls,
  openings,
  level,
  cut,
  selectedIds,
  pick,
}: {
  walls: Wall[];
  openings: Opening[];
  level: Level;
  cut?: number;
  selectedIds: Set<string>;
  pick: (kind: 'wall', id: string) => PickHandlers;
}) {
  const fps = useMemo(() => computeFootprints(walls), [walls]);
  const byWall = useMemo(() => {
    const m = new Map<string, Opening[]>();
    for (const o of openings) {
      if (!m.has(o.wallId)) m.set(o.wallId, []);
      m.get(o.wallId)!.push(o);
    }
    return m;
  }, [openings]);
  return (
    <group name="muros">
      {walls.map((w) => (
        <WallMesh key={w.id} wall={w} footprint={fps.get(w.id)!} openings={byWall.get(w.id) ?? EMPTY} elevation={level.elevation} cut={cut} selected={selectedIds.has(w.id)} pick={pick} />
      ))}
    </group>
  );
});

const EMPTY: Opening[] = [];
const WALL_CAP = { materialId: 'pintura', color: '#f2f1ee' };
