import { memo, useEffect, useMemo } from 'react';
import { Line } from '@react-three/drei';
import type { Level, Room } from '@/modules/FloorPlan/types';
import { getMaterial } from '@/modules/Materials/materials3d';
import type { PickHandlers } from '@/modules/Walls/Walls3D';
import { buildSlabGeometry } from './slab';

const CEILING_THICKNESS = 0.06;

const RoomSlabs = memo(function RoomSlabs({ room, level, showCeiling, selected, pick }: { room: Room; level: Level; showCeiling: boolean; selected: boolean; pick: (kind: 'room', id: string) => PickHandlers }) {
  // Suelo: en planta baja casi sin espesor (sobre el terreno); en plantas altas, forjado completo.
  const floorThickness = level.order === 0 && level.elevation <= 0.01 ? 0.04 : level.slabThickness;
  const isWater = room.floor.materialId === 'agua';
  const floorTop = level.elevation + (isWater ? 0.012 : 0.002);
  const floorGeo = useMemo(() => buildSlabGeometry(room.points, floorTop, isWater ? 0.02 : floorThickness), [room.points, floorTop, floorThickness, isWater]);
  const ceilingY = level.elevation + (room.ceilingHeight ?? level.height);
  const ceilGeo = useMemo(() => (room.hasCeiling ? buildSlabGeometry(room.points, ceilingY + CEILING_THICKNESS, CEILING_THICKNESS) : null), [room.points, ceilingY, room.hasCeiling]);
  useEffect(() => () => floorGeo.dispose(), [floorGeo]);
  useEffect(() => () => ceilGeo?.dispose(), [ceilGeo]);
  const floorMats = useMemo(() => {
    const f = getMaterial(room.floor);
    return [f, getMaterial(room.ceiling), getMaterial({ materialId: 'hormigon-visto', color: '#b9b8b3' })];
  }, [room.floor, room.ceiling]);
  const ceilMats = useMemo(() => {
    const c = getMaterial(room.ceiling);
    return [getMaterial({ materialId: 'hormigon-visto', color: '#d0cfca' }), c, c];
  }, [room.ceiling]);
  const outline = useMemo(() => [...room.points, room.points[0]].map((p) => [p.x, floorTop + 0.01, p.y] as [number, number, number]), [room.points, floorTop]);
  return (
    <group userData={{ ref: { kind: 'room', id: room.id } }}>
      <mesh geometry={floorGeo} material={floorMats} receiveShadow castShadow={level.order > 0} {...pick('room', room.id)} />
      {ceilGeo && showCeiling && <mesh geometry={ceilGeo} material={ceilMats} castShadow receiveShadow />}
      {selected && <Line points={outline} color="#2563eb" lineWidth={3} dashed dashSize={0.25} gapSize={0.12} />}
    </group>
  );
});

export const Rooms3D = memo(function Rooms3D({ rooms, level, showCeilings, selectedIds, pick }: { rooms: Room[]; level: Level; showCeilings: boolean; selectedIds: Set<string>; pick: (kind: 'room', id: string) => PickHandlers }) {
  return (
    <group name="estancias">
      {rooms.map((r) => (
        <RoomSlabs key={r.id} room={r} level={level} showCeiling={showCeilings} selected={selectedIds.has(r.id)} pick={pick} />
      ))}
    </group>
  );
});
