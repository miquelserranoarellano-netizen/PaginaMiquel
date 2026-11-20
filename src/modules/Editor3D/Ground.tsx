import { useEffect, useMemo } from 'react';
import { Grid } from '@react-three/drei';
import { PlaneGeometry } from 'three';
import type { ProjectSettings } from '@/modules/FloorPlan/types';
import { getMaterial } from '@/modules/Materials/materials3d';
import type { SceneBounds } from './sceneBounds';

/** Terreno alrededor de la vivienda (o una cuadrícula si está desactivado). */
export function Ground({ settings, bounds }: { settings: ProjectSettings; bounds: SceneBounds }) {
  const size = Math.max(120, bounds.radius * 12);
  const geo = useMemo(() => {
    const g = new PlaneGeometry(size, size);
    g.rotateX(-Math.PI / 2);
    // UV en metros para que la textura se repita a escala real.
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * size, uv.getY(i) * size);
    return g;
  }, [size]);
  useEffect(() => () => geo.dispose(), [geo]);
  const [cx, , cz] = bounds.center;
  if (!settings.showGround) {
    return <Grid position={[cx, -0.005, cz]} args={[200, 200]} cellSize={1} sectionSize={5} cellColor="#cbd5e1" sectionColor="#94a3b8" fadeDistance={120} infiniteGrid />;
  }
  return <mesh geometry={geo} material={getMaterial(settings.ground)} position={[cx, -0.03, cz]} receiveShadow name="terreno" userData={{ helper: true }} />;
}
