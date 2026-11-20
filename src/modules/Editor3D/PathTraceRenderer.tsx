/**
 * Render fotorrealista por trazado de rayos (three-gpu-pathtracer): calcula la
 * luz rebotada, las sombras suaves y los reflejos reales, acumulando muestras
 * mientras la cámara está quieta. Se monta solo mientras el render está activo
 * y deja la escena exactamente como estaba al salir.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  CubeCamera,
  HalfFloatType,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  WebGLCubeRenderTarget,
  type Material,
  type Object3D,
  type Texture,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { WebGLPathTracer } from 'three-gpu-pathtracer';
import type { RenderStyle } from '@/store/editorStore';
import type { SceneBounds } from './sceneBounds';
import { MAX_SAMPLES, useRenderStore } from './renderStore';

const materialsOf = (o: Object3D): Material[] => {
  const m = (o as Mesh).material as Material | Material[] | undefined;
  return !m ? [] : Array.isArray(m) ? m : [m];
};

/** Objetos que el trazador no sabe dibujar (o que no deben salir en la imagen). */
function unsupported(o: Object3D): boolean {
  if (o.userData.helper && (o as Mesh).isMesh) {
    // El terreno con textura (estilo entorno) sí se dibuja; el que solo recibe sombras, no.
    return materialsOf(o).some((m) => (m as { isShadowMaterial?: boolean }).isShadowMaterial || !m.visible);
  }
  if ((o as Mesh).isMesh) return materialsOf(o).some((m) => (m as { isShaderMaterial?: boolean }).isShaderMaterial || !m.visible);
  const l = o as unknown as { isHemisphereLight?: boolean; isAmbientLight?: boolean };
  return l.isHemisphereLight === true || l.isAmbientLight === true;
}

export function PathTraceRenderer({ style, bounds }: { style: RenderStyle; bounds: SceneBounds }) {
  const { gl, scene, camera, controls } = useThree();
  const tracer = useRef<WebGLPathTracer | null>(null);
  const lastReported = useRef(-1);

  useEffect(() => {
    let cancelled = false;
    const undo: (() => void)[] = [];

    const run = async () => {
      const ctx = gl.getContext();
      if (!ctx.getExtension('EXT_color_buffer_float')) throw new Error('Este dispositivo no permite el render realista (falta soporte de texturas de coma flotante).');
      const { WebGLPathTracer } = await import('three-gpu-pathtracer');
      if (cancelled) return;

      // 1) Ocultar lo que el trazador no admite y recordar cómo estaba.
      scene.traverse((o) => {
        if (o.visible && unsupported(o)) {
          o.visible = false;
          undo.push(() => (o.visible = true));
        }
      });

      // 1a) El trazador no admite mallas con varios materiales (los muros llevan cuatro:
      //     caras, jambas y remate): se sustituyen por una malla por material.
      const multi: Mesh[] = [];
      scene.traverse((o) => {
        const mesh = o as Mesh;
        if (mesh.isMesh && mesh.visible && Array.isArray(mesh.material) && mesh.parent) multi.push(mesh);
      });
      for (const mesh of multi) {
        const parent = mesh.parent!;
        const geo = mesh.geometry;
        const mats = mesh.material as Material[];
        for (const g of geo.groups) {
          const mat = mats[g.materialIndex ?? 0];
          if (!mat || !mat.visible || g.count <= 0) continue;
          const part = new BufferGeometry();
          if (geo.index) {
            for (const [name, attr] of Object.entries(geo.attributes)) part.setAttribute(name, attr);
            part.setIndex(new BufferAttribute(geo.index.array.slice(g.start, g.start + g.count), 1));
          } else {
            for (const [name, attr] of Object.entries(geo.attributes)) {
              const a = attr as BufferAttribute;
              part.setAttribute(name, new BufferAttribute(a.array.slice(g.start * a.itemSize, (g.start + g.count) * a.itemSize), a.itemSize, a.normalized));
            }
          }
          const piece = new Mesh(part, mat);
          piece.position.copy(mesh.position);
          piece.quaternion.copy(mesh.quaternion);
          piece.scale.copy(mesh.scale);
          piece.name = `${mesh.name} (render)`;
          parent.add(piece);
          undo.push(() => parent.remove(piece));
        }
        mesh.visible = false;
        undo.push(() => (mesh.visible = true));
      }

      // 1b) El trazador no usa los mapas de relieve: se quitan mientras dura el render
      //     para no ocupar memoria de vídeo (cada textura es una capa más).
      const seen = new Set<Material>();
      scene.traverse((o) => {
        for (const m of materialsOf(o)) {
          const mm = m as Material & { bumpMap?: Texture | null };
          if (seen.has(m) || !mm.bumpMap) continue;
          seen.add(m);
          const bump = mm.bumpMap;
          mm.bumpMap = null;
          undo.push(() => {
            mm.bumpMap = bump;
          });
        }
      });

      // 2) Suelo mate (en estudio) que recibe sombras y luz rebotada.
      const [cx, , cz] = bounds.center;
      if (style === 'estudio') {
        const geo = new PlaneGeometry(600, 600);
        geo.rotateX(-Math.PI / 2);
        const ground = new Mesh(geo, new MeshStandardMaterial({ color: '#3b3d41', roughness: 0.96, metalness: 0 }));
        ground.position.set(cx, -0.035, cz);
        ground.name = 'suelo-render';
        scene.add(ground);
        undo.push(() => {
          scene.remove(ground);
          geo.dispose();
          (ground.material as Material).dispose();
        });
      }

      // 3) Entorno: el mismo «estudio» que usa el visor, como cubo (el trazador no lee PMREM).
      const cubeRT = new WebGLCubeRenderTarget(256, { type: HalfFloatType });
      const room = new RoomEnvironment();
      new CubeCamera(0.1, 100, cubeRT).update(gl, room);
      room.dispose();
      const prevEnv = scene.environment;
      const prevBg = scene.background;
      const prevEnvIntensity = scene.environmentIntensity;
      scene.environment = cubeRT.texture as unknown as Texture;
      // Sin las luces de relleno del visor, el entorno aporta toda la luz ambiente.
      scene.environmentIntensity = prevEnvIntensity * (style === 'estudio' ? 1.45 : 1.3);
      scene.background = style === 'estudio' ? new Color('#3c3e42') : new Color('#bcd3ea');
      undo.push(() => {
        scene.environment = prevEnv;
        scene.background = prevBg;
        scene.environmentIntensity = prevEnvIntensity;
        cubeRT.dispose();
      });

      // 4) Trazador.
      const t = new WebGLPathTracer(gl);
      t.bounces = 6;
      t.transmissiveBounces = 4;
      t.filterGlossyFactor = 0.5;
      t.renderDelay = 0;
      t.fadeDuration = 0;
      t.minSamples = 1;
      t.dynamicLowRes = true;
      t.lowResScale = 0.35;
      t.tiles.set(2, 2);
      // Texturas a 512 px: suficiente para el render y mucho menos memoria (también en móviles).
      t.textureSize.set(512, 512);
      t.setScene(scene, camera);
      if (cancelled) {
        t.dispose();
        return;
      }
      tracer.current = t;
      useRenderStore.getState().set({ status: 'rendering', samples: 0 });
    };

    run().catch((e: unknown) => {
      if (!cancelled) useRenderStore.getState().set({ status: 'error', error: e instanceof Error ? e.message : String(e) });
    });

    return () => {
      cancelled = true;
      tracer.current?.dispose();
      tracer.current = null;
      for (const fn of undo.reverse()) fn();
    };
    // Se prepara una vez por sesión de render (al cambiar el proyecto se sale del render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Al mover la cámara se empieza a acumular de nuevo.
  useEffect(() => {
    const c = controls as unknown as { addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void } | null;
    if (!c?.addEventListener) return;
    const onChange = () => {
      tracer.current?.updateCamera();
      const st = useRenderStore.getState();
      if (st.status === 'done') st.set({ status: 'rendering' });
    };
    c.addEventListener('change', onChange);
    return () => c.removeEventListener?.('change', onChange);
  }, [controls]);

  useFrame(() => {
    const t = tracer.current;
    if (!t) {
      // Mientras se prepara se sigue viendo la escena normal.
      gl.render(scene, camera);
      return;
    }
    const st = useRenderStore.getState();
    t.pausePathTracing = t.samples >= MAX_SAMPLES;
    t.renderSample();
    const s = Math.floor(t.samples);
    if (s !== lastReported.current) {
      lastReported.current = s;
      st.set({ samples: s, status: s >= MAX_SAMPLES ? 'done' : 'rendering' });
    }
  }, 1);

  return null;
}
