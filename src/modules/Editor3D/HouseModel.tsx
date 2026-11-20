/**
 * Modelo 3D completo generado a partir del documento: muros, suelos, techos,
 * huecos y muebles de cada planta. Se reconstruye automáticamente al cambiar el plano.
 */
import { memo, useCallback, useMemo } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import { COLLECTION, type ElementKind, type Level, type ProjectDoc } from '@/modules/FloorPlan/types';
import { sortedLevels } from '@/modules/FloorPlan/queries';
import { Walls3D, type PickHandlers } from '@/modules/Walls/Walls3D';
import { Rooms3D } from '@/modules/Rooms/Rooms3D';
import { Openings3D } from '@/modules/DoorsAndWindows/Openings3D';
import { Furniture3D } from '@/modules/Furniture/Furniture3D';
import { RoomLights, FurnitureLights } from '@/modules/Lighting/InteriorLights';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { beginFurnitureDrag } from './drag3d';

type Pick = (kind: ElementKind, id: string) => PickHandlers;

const LevelModel = memo(function LevelModel({ doc, level, cut, showCeilings, showFurniture, selectedIds, pick, lightsOn }: { doc: ProjectDoc; level: Level; cut?: number; showCeilings: boolean; showFurniture: boolean; selectedIds: Set<string>; pick: Pick; lightsOn: boolean }) {
  const walls = useMemo(() => Object.values(doc.walls).filter((w) => w.levelId === level.id), [doc.walls, level.id]);
  const rooms = useMemo(() => Object.values(doc.rooms).filter((r) => r.levelId === level.id), [doc.rooms, level.id]);
  const openings = useMemo(() => Object.values(doc.openings).filter((o) => o.levelId === level.id), [doc.openings, level.id]);
  const furniture = useMemo(() => Object.values(doc.furniture).filter((f) => f.levelId === level.id), [doc.furniture, level.id]);
  return (
    <group name={level.name} userData={{ levelId: level.id }}>
      <Walls3D walls={walls} openings={openings} level={level} cut={cut} selectedIds={selectedIds} pick={pick as never} />
      <Rooms3D rooms={rooms} level={level} showCeilings={showCeilings} selectedIds={selectedIds} pick={pick as never} />
      <Openings3D openings={openings} walls={doc.walls} level={level} cut={cut} selectedIds={selectedIds} pick={pick as never} />
      {showFurniture && <Furniture3D items={furniture} level={level} assets={doc.assets} selectedIds={selectedIds} pick={pick as never} />}
      {lightsOn && <RoomLights rooms={rooms} level={level} showCeilings={showCeilings} />}
      {lightsOn && showFurniture && <FurnitureLights items={furniture} level={level} />}
    </group>
  );
});

export function HouseModel({ mode }: { mode: '3d' | 'walk' }) {
  const doc = useProjectStore((s) => s.doc);
  const selection = useEditorStore((s) => s.selection);
  const activeLevelId = useEditorStore((s) => s.activeLevelId);
  const view3d = useEditorStore((s) => s.view3d);
  const selectedIds = useMemo(() => new Set(mode === '3d' ? selection.map((s) => s.id) : []), [selection, mode]);

  const pick = useCallback<Pick>(
    (kind, id) => ({
      onClick: (e: ThreeEvent<MouseEvent>) => {
        if (mode !== '3d') return;
        e.stopPropagation();
        if (e.delta > 4) return; // fue un arrastre de cámara
        const ed = useEditorStore.getState();
        const el = useProjectStore.getState().doc[COLLECTION[kind]][id];
        if (el && el.levelId !== ed.activeLevelId) ed.setActiveLevel(el.levelId);
        if (e.shiftKey) ed.toggleSelect({ kind, id });
        else ed.select([{ kind, id }]);
      },
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        if (mode !== '3d') return;
        e.stopPropagation();
        document.body.style.cursor = kind === 'furniture' ? 'grab' : 'pointer';
      },
      onPointerOut: () => {
        document.body.style.cursor = '';
      },
      ...(kind === 'furniture'
        ? {
            onPointerDown: (e: ThreeEvent<PointerEvent>) => {
              if (mode !== '3d' || e.button !== 0) return;
              const ed = useEditorStore.getState();
              if (!ed.selection.some((s) => s.id === id)) return;
              e.stopPropagation();
              beginFurnitureDrag(id, e);
            },
          }
        : {}),
    }),
    [mode],
  );

  const levels = sortedLevels(doc);
  const active = doc.levels[activeLevelId] ?? levels[0];
  const visible = mode === '3d' && view3d.upToActiveLevel ? levels.filter((l) => l.order <= active.order) : levels;
  const lightsOn = doc.lighting.interiorOn && doc.lighting.interiorIntensity > 0;
  return (
    <group name="vivienda">
      {visible.map((l) => {
        const isTop = l.id === visible[visible.length - 1].id;
        const showCeilings = mode === 'walk' ? true : view3d.showCeilings || !isTop;
        const cut = mode === '3d' && view3d.cutaway && isTop ? 1.2 : undefined;
        return <LevelModel key={l.id} doc={doc} level={l} cut={cut} showCeilings={showCeilings && !cut} showFurniture={view3d.showFurniture || mode === 'walk'} selectedIds={selectedIds} pick={pick} lightsOn={lightsOn} />;
      })}
    </group>
  );
}
