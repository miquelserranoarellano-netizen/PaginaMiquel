/**
 * Iluminación global: sol con sombras, luz de cielo (hemisférica), cielo
 * procedural, entorno para reflejos y exposición.
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { Color, PMREMGenerator, type DirectionalLight, type Object3D } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { useRef } from 'react';
import type { LightingSettings } from '@/modules/FloorPlan/types';
import type { SceneBounds } from '@/modules/Editor3D/sceneBounds';
import { isNight, sunDirection } from './sun';

export function LightRig({ lighting, bounds }: { lighting: LightingSettings; bounds: SceneBounds }) {
  const { gl, scene } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const target = useRef<Object3D>(null);
  const night = isNight(lighting);
  const dir = sunDirection(lighting);
  const [cx, , cz] = bounds.center;
  const r = bounds.radius + 4;

  // Entorno (reflejos suaves) generado localmente, sin descargas.
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  useEffect(() => {
    scene.environmentIntensity = night ? 0.06 : 0.38;
    gl.toneMappingExposure = lighting.exposure * (night ? 1.15 : 1);
    scene.background = night ? new Color('#0b1324') : null;
  }, [gl, scene, night, lighting.exposure]);

  useEffect(() => {
    if (sun.current && target.current) sun.current.target = target.current;
  });

  const sunPos = useMemo<[number, number, number]>(() => [cx + dir[0] * r * 2, Math.max(1, dir[1] * r * 2), cz + dir[2] * r * 2], [cx, cz, dir, r]);
  const skyColor = night ? '#33415c' : '#cfe3ff';
  const groundColor = night ? '#0c0f14' : '#8b7f6c';
  const shadowSize = Math.min(4096, bounds.radius > 18 ? 4096 : 2048);

  return (
    <>
      {!night && <Sky distance={4500} sunPosition={[dir[0], Math.max(0.02, dir[1]), dir[2]]} turbidity={lighting.preset === 'atardecer' ? 8 : 4} rayleigh={lighting.preset === 'atardecer' ? 3 : 1.2} mieCoefficient={0.005} mieDirectionalG={0.85} />}
      {night && <Stars radius={300} depth={60} count={2500} factor={4} fade speed={0} />}
      <hemisphereLight args={[skyColor, groundColor, lighting.ambientIntensity]} />
      <ambientLight intensity={lighting.ambientIntensity * 0.25} />
      <object3D ref={target} position={[cx, 0, cz]} />
      <directionalLight
        ref={sun}
        position={sunPos}
        intensity={lighting.sunIntensity}
        color={lighting.sunColor}
        castShadow={lighting.shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-r}
        shadow-camera-right={r}
        shadow-camera-top={r}
        shadow-camera-bottom={-r}
        shadow-camera-near={0.5}
        shadow-camera-far={r * 5}
      />
    </>
  );
}
