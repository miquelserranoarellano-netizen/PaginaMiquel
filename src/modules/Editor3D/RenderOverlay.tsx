/** Panel del render fotorrealista: progreso, guardar la imagen y salir. */
import { Download, Loader2, X } from 'lucide-react';
import { Button } from '@/modules/UI/controls';
import { toast } from '@/modules/UI/toast';
import { downloadOrSave } from '@/modules/ProjectManager/files';
import { safeName } from '@/modules/ProjectManager/actions';
import { projectApi } from '@/store/projectStore';
import { getViewer } from './viewerRef';
import { MAX_SAMPLES, stopRender, useRenderStore } from './renderStore';

async function saveRender(vignette: boolean) {
  const v = getViewer();
  if (!v) return;
  const src = v.gl.domElement;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext('2d')!;
  g.drawImage(src, 0, 0);
  if (vignette) {
    // Viñeta suave, como en las presentaciones de arquitectura.
    const grad = g.createRadialGradient(c.width / 2, c.height * 0.45, Math.min(c.width, c.height) * 0.3, c.width / 2, c.height / 2, Math.max(c.width, c.height) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.38)');
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
  }
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, 'image/png'));
  if (!blob) return void toast.error('No se pudo crear la imagen');
  if (await downloadOrSave(`${safeName(projectApi.doc.name)} - render.png`, blob, 'base64', [{ name: 'Imagen PNG', extensions: ['png'] }])) toast.success('Render guardado');
}

export function RenderOverlay({ studio }: { studio: boolean }) {
  const { status, samples, error } = useRenderStore();
  if (status === 'off') return null;
  const pct = Math.min(100, Math.round((samples / MAX_SAMPLES) * 100));
  return (
    <div className="absolute left-1/2 top-3 z-10 flex max-w-[calc(100%-1.5rem)] -translate-x-1/2 items-center gap-2 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 shadow-lg backdrop-blur max-[900px]:top-14">
      {status === 'error' ? (
        <span className="text-[12.5px] text-red-600">{error}</span>
      ) : (
        <>
          {status !== 'done' && <Loader2 size={15} className="shrink-0 animate-spin text-accent-600" />}
          <div className="min-w-0">
            <div className="text-[12.5px] font-semibold text-slate-800">{status === 'preparing' ? 'Preparando el render realista…' : status === 'done' ? 'Render terminado' : 'Render realista'}</div>
            {status !== 'preparing' && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-accent-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="whitespace-nowrap text-[11px] text-slate-500">{samples} muestras</span>
              </div>
            )}
          </div>
          <Button variant="primary" disabled={status === 'preparing' || samples < 1} onClick={() => void saveRender(studio)} title="Guardar la imagen en PNG">
            <Download size={14} /> <span className="max-[480px]:hidden">Guardar imagen</span>
          </Button>
        </>
      )}
      <Button onClick={stopRender} title="Salir del render">
        <X size={14} /> <span className="max-[480px]:hidden">Salir</span>
      </Button>
    </div>
  );
}
