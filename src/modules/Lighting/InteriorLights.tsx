import type { FurnitureItem, Level, Room } from '@/modules/FloorPlan/types';

/** Luces de techo automáticas (fase 5). */
export function RoomLights(_props: { rooms: Room[]; level: Level; showCeilings: boolean }) {
  return null;
}

/** Luces de lámparas del catálogo (fase 5). */
export function FurnitureLights(_props: { items: FurnitureItem[]; level: Level }) {
  return null;
}
