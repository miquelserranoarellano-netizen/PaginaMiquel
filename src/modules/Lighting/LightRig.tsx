/**
 * Iluminación global: sol con sombras, luz de cielo (hemisférica), fondo
 * (cielo procedural o fondo de estudio), entorno para reflejos y exposición.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { CanvasTexture, Color, PMREMGenerator, SRGBColorSpace, type DirectionalLight, type Object3D, type Texture } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { LightingSettings } from '@/modules/FloorPlan/types';
import type { SceneBounds } from '@/modules/Editor3D/sceneBounds';
import type { RenderStyle } from '@/store/editorStore';
import { isNight, sunDirection } from './sun';

/** Fondo de estudio: degradado radial gris (como las presentaciones de arquitectura). */
function studioBackground(night: boolean): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  // Gris carbón con el centro algo más claro, como las presentaciones de archviz.
  const grad = g.createRadialGradient(256, 200, 20, 256, 290, 430);
  if (night) {
    grad.addColorStop(0, '#3a3f49');
    grad.addColorStop(1, '#0f1116');
  } else {
    grad.addColorStop(0, '#6a6c70');
    grad.addColorStop(0.45, '#4d4f53');
    grad.addColorStop(1, '#232427');
  }
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export function LightRig({ lighting, bounds, style }: { lighting: LightingSettings; bounds: SceneBounds; style: RenderStyle }) {
  const { gl, scene } = useThree();
  const sun = useRef<DirectionalLight>(null);
  const target = useRef<Object3D>(null);
  const night = isNight(lighting);
  const studio = style === 'estudio';
  // En estudio el sol se gira para la vista de maqueta: llega desde detrás a la derecha y
  // las sombras caen hacia el espectador, como en un render de presentación. Los ajustes
  // de orientación y altura siguen funcionando (se aplican sobre esa posición).
  const dir = studio && !night ? sunDirection({ sunAzimuth: (lighting.sunAzimuth - 125 + 720) % 360, sunElevation: Math.min(75, Math.max(22, lighting.sunElevation - 12)) }) : sunDirection(lighting);
  const [cx, , cz] = bounds.center;
  const r = bounds.radius + 4;

  // Entorno (reflejos y luz de relleno suave) generado localmente, sin descargas.
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

  const backdrop = useMemo(() => (studio ? studioBackground(night) : null), [studio, night]);
  useEffect(() => () => backdrop?.dispose(), [backdrop]);

  useEffect(() => {
    scene.environmentIntensity = night ? 0.08 : studio ? 0.62 : 0.42;
    gl.toneMappingExposure = lighting.exposure * (night ? 1.15 : 1);
    scene.background = backdrop ?? (night ? new Color('#0b1324') : null);
  }, [gl, scene, night, studio, backdrop, lighting.exposure]);

  useEffect(() => {
    if (sun.current && target.current) sun.current.target = target.current;
  });

  const sunPos = useMemo<[number, number, number]>(() => [cx + dir[0] * r * 2, Math.max(1, dir[1] * r * 2), cz + dir[2] * r * 2], [cx, cz, dir, r]);
  const skyColor = night ? '#33415c' : studio ? '#fbfaf7' : '#cfe3ff';
  const groundColor = night ? '#0c0f14' : studio ? '#a79c8d' : '#8b7f6c';
  const shadowSize = 4096;
  // En estudio el relleno es algo menor para que las sombras del sol se lean (como en un render).
  const ambient = lighting.ambientIntensity * (studio && !night ? 1.05 : 1);

  return (
    <>
      {!night && !studio && <Sky distance={4500} sunPosition={[dir[0], Math.max(0.02, dir[1]), dir[2]]} turbidity={lighting.preset === 'atardecer' ? 8 : 4} rayleigh={lighting.preset === 'atardecer' ? 3 : 1.2} mieCoefficient={0.005} mieDirectionalG={0.85} />}
      {night && !studio && <Stars radius={300} depth={60} count={2500} factor={4} fade speed={0} />}
      <hemisphereLight args={[skyColor, groundColor, ambient]} />
      <ambientLight intensity={ambient * 0.25} />
      <object3D ref={target} position={[cx, 0, cz]} />
      <directionalLight
        ref={sun}
        position={sunPos}
        intensity={lighting.sunIntensity * (studio && !night ? 1.05 : 1)}
        color={lighting.sunColor}
        castShadow={lighting.shadows}
        shadow-mapSize={[shadowSize, shadowSize]}
        shadow-bias={-0.00025}
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
