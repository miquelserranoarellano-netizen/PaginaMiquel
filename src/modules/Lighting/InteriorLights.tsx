/**
 * Luces interiores: luz de techo automática por estancia y luces de las
 * lámparas del catálogo. Se limita el número total para mantener el rendimiento.
 */
import { memo, useMemo } from 'react';
import { bboxOf, labelPoint, polygonArea, rotate } from '@/core/geometry';
import { degToRad } from '@/core/units';
import type { FurnitureItem, Level, Room } from '@/modules/FloorPlan/types';
import { getCatalogItem } from '@/modules/Furniture/catalog';
import { getMaterial } from '@/modules/Materials/materials3d';
import { useProjectStore } from '@/store/projectStore';
import { getRoomType } from '@/modules/Rooms/roomTypes';

export const MAX_ROOM_LIGHTS = 14;
export const MAX_LAMP_LIGHTS = 12;
const BASE_CANDELA = 9;

const fixtureMat = () => getMaterial({ materialId: 'luz', color: '#fff4dc' });

export const RoomLights = memo(function RoomLights({ rooms, level, showCeilings }: { rooms: Room[]; level: Level; showCeilings: boolean }) {
  const lighting = useProjectStore((s) => s.doc.lighting);
  const lights = useMemo(
    () =>
      rooms
        .filter((r) => r.ceilingLight && r.hasCeiling && !getRoomType(r.type).exterior)
        .slice(0, MAX_ROOM_LIGHTS)
        .map((r) => {
          const p = labelPoint(r.points);
          const b = bboxOf(r.points);
          const area = polygonArea(r.points);
          const y = level.elevation + (r.ceilingHeight ?? level.height);
          return { id: r.id, p, y, reach: Math.max(4, Math.hypot(b.maxX - b.minX, b.maxY - b.minY) * 1.1), power: Math.sqrt(Math.max(4, area) / 12) };
        }),
    [rooms, level.elevation, level.height],
  );
  const k = lighting.interiorIntensity;
  return (
    <group name="luces-techo">
      {lights.map((l) => (
        <group key={l.id} position={[l.p.x, l.y, l.p.y]}>
          <pointLight position={[0, -0.35, 0]} intensity={BASE_CANDELA * l.power * k} distance={l.reach} decay={1.6} color="#ffe6c2" />
          {showCeilings && (
            <mesh position={[0, -0.012, 0]} material={fixtureMat()} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.16, 0.16, 0.02, 24]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
});

export const FurnitureLights = memo(function FurnitureLights({ items, level }: { items: FurnitureItem[]; level: Level }) {
  const lighting = useProjectStore((s) => s.doc.lighting);
  const lights = useMemo(() => {
    const out: { id: string; x: number; y: number; z: number; intensity: number; color: string; distance: number }[] = [];
    for (const f of items) {
      const cat = getCatalogItem(f.catalogId);
      if (!cat?.light || !f.light?.on) continue;
      const off = rotate({ x: 0, y: 0 }, degToRad(f.rotation));
      out.push({
        id: f.id,
        x: f.position.x + off.x,
        y: level.elevation + f.elevation + cat.light.y * f.height,
        z: f.position.y + off.y,
        intensity: cat.light.intensity * f.light.intensity,
        color: f.light.color,
        distance: cat.light.distance,
      });
      if (out.length >= MAX_LAMP_LIGHTS) break;
    }
    return out;
  }, [items, level.elevation]);
  const k = lighting.interiorIntensity;
  return (
    <group name="luces-lamparas">
      {lights.map((l) => (
        <pointLight key={l.id} position={[l.x, l.y, l.z]} intensity={BASE_CANDELA * 0.8 * l.intensity * k} distance={l.distance} decay={1.7} color={l.color} />
      ))}
    </group>
  );
});
