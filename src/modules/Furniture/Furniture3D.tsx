/**
 * Muebles en 3D: piezas paramétricas del catálogo o modelos GLB/GLTF importados.
 */
import { memo, Suspense, use, useMemo } from 'react';
import { Edges } from '@react-three/drei';
import { Box3, BoxGeometry, ConeGeometry, CylinderGeometry, type BufferGeometry, type Group, type Mesh, SphereGeometry, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { degToRad } from '@/core/units';
import type { Asset, FurnitureItem, Level } from '@/modules/FloorPlan/types';
import { getMaterial } from '@/modules/Materials/materials3d';
import type { PickHandlers } from '@/modules/Walls/Walls3D';
import { getCatalogItem } from './catalog';
import type { Part } from './types';
import { loadAssetModel } from './gltf';

const UNIT = {
  box: new BoxGeometry(1, 1, 1),
  cyl: new CylinderGeometry(0.5, 0.5, 1, 28),
  sphere: new SphereGeometry(0.5, 24, 16),
  cone: new ConeGeometry(0.5, 1, 28),
};

const rounded = new Map<string, BufferGeometry>();
function roundedBox(w: number, h: number, d: number, r: number): BufferGeometry {
  const radius = Math.max(0.001, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius.toFixed(3)}`;
  let g = rounded.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, radius);
    if (rounded.size > 800) rounded.clear();
    rounded.set(key, g);
  }
  return g;
}

function PartMesh({ part, item }: { part: Part; item: FurnitureItem }) {
  const cat = getCatalogItem(item.catalogId);
  const ref = item.materials[part.m] ?? cat?.slots[part.m] ?? { materialId: 'plastico', color: '#cccccc' };
  const material = getMaterial(ref);
  const isRounded = part.s === 'rbox';
  const geometry = isRounded ? roundedBox(part.d[0], part.d[1], part.d[2], part.radius ?? 0.03) : UNIT[part.s === 'cyl' ? 'cyl' : part.s === 'sphere' ? 'sphere' : part.s === 'cone' ? 'cone' : 'box'];
  const emissive = ref.materialId === 'luz';
  return (
    <mesh
      geometry={geometry}
      material={material}
      position={part.p}
      rotation={part.r ?? [0, 0, 0]}
      scale={isRounded ? [1, 1, 1] : part.d}
      castShadow={!emissive}
      receiveShadow
    />
  );
}

function CatalogModel({ item }: { item: FurnitureItem }) {
  const cat = getCatalogItem(item.catalogId);
  const parts = useMemo(() => (cat ? cat.build(item.width, item.depth, item.height) : []), [cat, item.width, item.depth, item.height]);
  return (
    <>
      {parts.map((p, i) => (
        <PartMesh key={i} part={p} item={item} />
      ))}
    </>
  );
}

function AssetModelInner({ item, asset }: { item: FurnitureItem; asset: Asset }) {
  const scene = use(loadAssetModel(asset.id, asset.dataUrl)) as Group;
  const obj = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const wrapper = { clone, size, center };
    return wrapper;
  }, [scene]);
  const sx = item.width / Math.max(1e-6, obj.size.x);
  const sy = item.height / Math.max(1e-6, obj.size.y);
  const sz = item.depth / Math.max(1e-6, obj.size.z);
  return (
    <group scale={[sx, sy, sz]}>
      <primitive object={obj.clone} position={[-obj.center.x, -obj.center.y + obj.size.y / 2, -obj.center.z]} />
    </group>
  );
}

function AssetModel({ item, asset }: { item: FurnitureItem; asset: Asset }) {
  return (
    <Suspense
      fallback={
        <mesh position={[0, item.height / 2, 0]}>
          <boxGeometry args={[item.width, item.height, item.depth]} />
          <meshStandardMaterial color="#cbd5e1" wireframe />
        </mesh>
      }
    >
      <AssetModelInner item={item} asset={asset} />
    </Suspense>
  );
}

export const FurnitureModel = memo(function FurnitureModel({ item, level, asset, selected, pick }: { item: FurnitureItem; level: Level; asset?: Asset; selected: boolean; pick: (kind: 'furniture', id: string) => PickHandlers }) {
  return (
    <group
      position={[item.position.x, level.elevation + item.elevation, item.position.y]}
      rotation={[0, -degToRad(item.rotation), 0]}
      userData={{ ref: { kind: 'furniture', id: item.id } }}
      name={item.name}
      {...pick('furniture', item.id)}
    >
      {item.assetId && asset ? <AssetModel item={item} asset={asset} /> : <CatalogModel item={item} />}
      {selected && (
        <mesh position={[0, item.height / 2, 0]} userData={{ helper: true }}>
          <boxGeometry args={[item.width + 0.02, item.height + 0.02, item.depth + 0.02]} />
          <meshBasicMaterial visible={false} />
          <Edges color="#2563eb" lineWidth={2} />
        </mesh>
      )}
    </group>
  );
});

export const Furniture3D = memo(function Furniture3D({ items, level, assets, selectedIds, pick }: { items: FurnitureItem[]; level: Level; assets: Record<string, Asset>; selectedIds: Set<string>; pick: (kind: 'furniture', id: string) => PickHandlers }) {
  return (
    <group name="muebles">
      {items.map((f) => (
        <FurnitureModel key={f.id} item={f} level={level} asset={f.assetId ? assets[f.assetId] : undefined} selected={selectedIds.has(f.id)} pick={pick} />
      ))}
    </group>
  );
});
