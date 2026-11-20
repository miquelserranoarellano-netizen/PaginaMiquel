import { Box, Trash2 } from 'lucide-react';
import { uid } from '@/core/ids';
import type { FurnitureItem } from '@/modules/FloorPlan/types';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { insertionPoint } from './placementActions';

/** Modelos GLB/GLTF ya importados en el proyecto: se pueden volver a colocar. */
export function ImportedModels() {
  const assets = useProjectStore((s) => s.doc.assets);
  const furniture = useProjectStore((s) => s.doc.furniture);
  const list = Object.values(assets);
  if (!list.length) return null;
  const place = (assetId: string) => {
    const template = Object.values(projectApi.doc.furniture).find((f) => f.assetId === assetId);
    const ed = useEditorStore.getState();
    const item: FurnitureItem = {
      id: uid('furn'),
      levelId: ed.activeLevelId,
      catalogId: 'imported',
      name: template?.name ?? assets[assetId].name.replace(/\.(glb|gltf)$/i, ''),
      position: insertionPoint(),
      rotation: 0,
      elevation: 0,
      width: template?.width ?? 1,
      depth: template?.depth ?? 1,
      height: template?.height ?? 1,
      materials: {},
      assetId,
    };
    projectApi.apply((d) => {
      d.furniture[item.id] = item;
    });
    ed.select([{ kind: 'furniture', id: item.id }]);
  };
  return (
    <div className="border-b border-slate-100 px-3 py-2">
      <div className="mb-1.5 text-[12.5px] font-medium text-slate-700">Modelos importados</div>
      <ul className="space-y-1">
        {list.map((a) => {
          const uses = Object.values(furniture).filter((f) => f.assetId === a.id).length;
          return (
            <li key={a.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-2 py-1.5 text-[12px]">
              <Box size={14} className="text-slate-400" />
              <button type="button" className="min-w-0 flex-1 truncate text-left hover:text-accent-700" title="Colocar otra copia" onClick={() => place(a.id)}>
                {a.name}
              </button>
              <span className="text-[11px] text-slate-400">{(a.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                type="button"
                title={uses ? 'Se está usando en el proyecto' : 'Eliminar del proyecto'}
                disabled={uses > 0}
                className="text-slate-400 hover:text-red-600 disabled:opacity-30"
                onClick={() => projectApi.apply((d) => void delete d.assets[a.id])}
              >
                <Trash2 size={13} />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
