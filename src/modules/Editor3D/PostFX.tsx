/**
 * Postprocesado para un acabado de presentación: oclusión ambiental (N8AO)
 * que oscurece rincones y contactos, antialiasing SMAA, tone mapping ACES y
 * una viñeta suave en el estilo estudio.
 */
import { EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

export function PostFX({ studio, walk }: { studio: boolean; walk: boolean }) {
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={walk ? 0.9 : 1.6} distanceFalloff={walk ? 0.6 : 1.2} intensity={walk ? 1.8 : 3.4} quality="medium" halfRes={!walk} color="#1d1a17" />
      <SMAA />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      {studio && !walk ? <Vignette offset={0.3} darkness={0.42} /> : <></>}
    </EffectComposer>
  );
}
