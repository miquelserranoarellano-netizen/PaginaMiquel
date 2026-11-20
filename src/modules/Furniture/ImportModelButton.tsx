import { useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { uid } from '@/core/ids';
import type { Asset, FurnitureItem } from '@/modules/FloorPlan/types';
import { Button } from '@/modules/UI/controls';
import { toast } from '@/modules/UI/toast';
import { useEditorStore } from '@/store/editorStore';
import { projectApi } from '@/store/projectStore';
import { insertionPoint } from './placementActions';

const MAX_SIZE = 60 * 1024 * 1024;

/** Importa un modelo GLB/GLTF externo y lo coloca en la planta activa. */
export function ImportModelButton() {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onFile = async (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith('.glb') && !name.endsWith('.gltf')) return toast.error('Formato no admitido. Usa ficheros .glb o .gltf');
    if (file.size > MAX_SIZE) return toast.error('El modelo supera los 60 MB');
    setBusy(true);
    try {
      const buffer = await file.arrayBuffer();
      const { fileToDataUrl, measureModel, parseModel } = await import('./gltf');
      const scene = await parseModel(buffer);
      const dims = measureModel(scene);
      const dataUrl = await fileToDataUrl(new Blob([buffer], { type: name.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json' }));
      const asset: Asset = { id: uid('asset'), name: file.name, mime: name.endsWith('.glb') ? 'model/gltf-binary' : 'model/gltf+json', dataUrl, size: file.size };
      const ed = useEditorStore.getState();
      const item: FurnitureItem = {
        id: uid('furn'),
        levelId: ed.activeLevelId,
        catalogId: 'imported',
        name: file.name.replace(/\.(glb|gltf)$/i, ''),
        position: insertionPoint(),
        rotation: 0,
        elevation: 0,
        width: Math.round(dims.w * 1000) / 1000,
        depth: Math.round(dims.d * 1000) / 1000,
        height: Math.round(dims.h * 1000) / 1000,
        materials: {},
        assetId: asset.id,
      };
      projectApi.apply((d) => {
        d.assets[asset.id] = asset;
        d.furniture[item.id] = item;
      });
      ed.select([{ kind: 'furniture', id: item.id }]);
      toast.success(`Modelo "${item.name}" importado (${item.width.toFixed(2)} × ${item.depth.toFixed(2)} × ${item.height.toFixed(2)} m)`);
    } catch (e) {
      console.error(e);
      toast.error('No se pudo importar el modelo. Si es un .gltf con ficheros externos, conviértelo a .glb.');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };

  return (
    <>
      <input ref={input} type="file" accept=".glb,.gltf,model/gltf-binary,model/gltf+json" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
      <Button className="w-full" disabled={busy} onClick={() => input.current?.click()} title="Modelos 3D externos en formato GLB o GLTF (con recursos incrustados)">
        <Upload size={14} /> {busy ? 'Importando…' : 'Importar modelo GLB / GLTF'}
      </Button>
    </>
  );
}
