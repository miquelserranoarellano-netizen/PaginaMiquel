/**
 * Dibujo completo de una planta (estancias, muros, huecos, muebles, cotas y
 * etiquetas). Se usa en el editor y para exportar PNG/PDF y miniaturas.
 */
import { memo, useMemo } from 'react';
import type { ID, ProjectDoc } from '@/modules/FloorPlan/types';
import { Rooms2D, RoomLabels } from '@/modules/Rooms/Rooms2D';
import { Walls2D, WallLabels } from '@/modules/Walls/Walls2D';
import { Openings2D } from '@/modules/DoorsAndWindows/Opening2D';
import { Furniture2D } from '@/modules/Furniture/Furniture2D';
import { Dimensions2D } from './Dimensions2D';

export interface PlanDrawingOptions {
  wallLengths: boolean;
  roomLabels: boolean;
  furniture: boolean;
  dimensions: boolean;
}

export function useLevelCollections(doc: ProjectDoc, levelId: ID) {
  const walls = useMemo(() => Object.values(doc.walls).filter((w) => w.levelId === levelId), [doc.walls, levelId]);
  const rooms = useMemo(() => Object.values(doc.rooms).filter((r) => r.levelId === levelId), [doc.rooms, levelId]);
  const openings = useMemo(() => Object.values(doc.openings).filter((o) => o.levelId === levelId), [doc.openings, levelId]);
  const furniture = useMemo(() => Object.values(doc.furniture).filter((f) => f.levelId === levelId), [doc.furniture, levelId]);
  const dims = useMemo(() => Object.values(doc.dimensions).filter((d) => d.levelId === levelId), [doc.dimensions, levelId]);
  return { walls, rooms, openings, furniture, dims };
}

export const PlanDrawing = memo(function PlanDrawing({ doc, levelId, zoom, options }: { doc: ProjectDoc; levelId: ID; zoom: number; options: PlanDrawingOptions }) {
  const { walls, rooms, openings, furniture, dims } = useLevelCollections(doc, levelId);
  return (
    <g>
      <Rooms2D rooms={rooms} />
      {options.furniture && <Furniture2D items={furniture} />}
      <Walls2D walls={walls} openings={openings} />
      <Openings2D openings={openings} walls={doc.walls} />
      {options.dimensions && <Dimensions2D dims={dims} zoom={zoom} />}
      {options.roomLabels && <RoomLabels rooms={rooms} zoom={zoom} />}
      {options.wallLengths && <WallLabels walls={walls} zoom={zoom} />}
    </g>
  );
});

/** Planta inferior en gris claro como referencia para dibujar encima. */
export const UnderlayDrawing = memo(function UnderlayDrawing({ doc, levelId }: { doc: ProjectDoc; levelId: ID }) {
  const walls = useMemo(() => Object.values(doc.walls).filter((w) => w.levelId === levelId), [doc.walls, levelId]);
  const openings = useMemo(() => Object.values(doc.openings).filter((o) => o.levelId === levelId), [doc.openings, levelId]);
  return (
    <g opacity={0.35} pointerEvents="none">
      <Walls2D walls={walls} openings={openings} fill="#94a3b8" />
    </g>
  );
});
