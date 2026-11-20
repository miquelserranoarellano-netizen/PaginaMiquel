/**
 * Visor 3D (modelo orbital y recorrido interior). Se carga bajo demanda.
 */
import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { PCFSoftShadowMap, Plane, Raycaster, Vector2, Vector3 } from 'three';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { LightRig } from '@/modules/Lighting/LightRig';
import { WalkController } from '@/modules/FirstPersonController/WalkController';
import { WalkHud } from '@/modules/FirstPersonController/WalkHud';
import { DRAG_MIME } from '@/modules/Editor2D/PlanCanvas';
import { addFurnitureAtViewCenter } from '@/modules/Furniture/placementActions';
import { HouseModel } from './HouseModel';
import { Ground } from './Ground';
import { CameraRig } from './CameraRig';
import { DragBridge } from './DragBridge';
import { ViewerToolbar } from './ViewerToolbar';
import { sceneBounds } from './sceneBounds';
import { getViewer } from './viewerRef';

export default function Viewer3D() {
  const view = useEditorStore((s) => s.view);
  const doc = useProjectStore((s) => s.doc);
  const walls = doc.walls;
  const rooms = doc.rooms;
  const levels = doc.levels;
  // Los límites solo dependen de la geometría, no de cada cambio de material.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bounds = useMemo(() => sceneBounds(doc), [walls, rooms, levels]);
  const mode = view === 'walk' ? 'walk' : '3d';

  const onDrop = (e: React.DragEvent) => {
    const id = e.dataTransfer.getData(DRAG_MIME);
    const v = getViewer();
    if (!id || !v) return;
    e.preventDefault();
    const rect = v.gl.domElement.getBoundingClientRect();
    const ndc = new Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new Raycaster();
    ray.setFromCamera(ndc, v.camera);
    const ed = useEditorStore.getState();
    const level = useProjectStore.getState().doc.levels[ed.activeLevelId];
    const hit = new Vector3();
    if (!ray.ray.intersectPlane(new Plane(new Vector3(0, 1, 0), -(level?.elevation ?? 0)), hit)) return;
    addFurnitureAtViewCenter(id, { x: Math.round(hit.x * 100) / 100, y: Math.round(hit.z * 100) / 100 });
  };

  return (
    <div
      className="relative h-full w-full bg-slate-200"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={onDrop}
    >
      <Canvas
        shadows={{ type: PCFSoftShadowMap }}
        dpr={[1, 2]}
        gl={{ antialias: true, preserveDrawingBuffer: true }}
        onCreated={({ gl }) => {
          gl.localClippingEnabled = true;
        }}
        camera={{ fov: mode === 'walk' ? 70 : 45, near: 0.05, far: 3000, position: [15, 12, 18] }}
        onPointerMissed={(e) => {
          if (mode === '3d' && e.button === 0) useEditorStore.getState().clearSelection();
        }}
      >
        <Suspense fallback={null}>
          <LightRig lighting={doc.lighting} bounds={bounds} />
          <Ground settings={doc.settings} bounds={bounds} />
          <HouseModel mode={mode} />
        </Suspense>
        {mode === '3d' ? <CameraRig key="orbit" bounds={bounds} /> : <WalkController key="walk" />}
        <DragBridge />
      </Canvas>
      {mode === '3d' ? <ViewerToolbar /> : <WalkHud />}
    </div>
  );
}
