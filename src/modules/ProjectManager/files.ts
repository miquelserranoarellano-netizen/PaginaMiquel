/**
 * Guardar/abrir ficheros: diálogo nativo en escritorio, descarga / selector
 * de ficheros en el navegador.
 */
import type { DesktopFileFilter } from '@/electron';

/** Extensiones que admite la descarga desde una página publicada en claude.ai. */
const ARTIFACT_EXTENSIONS = new Set(['gif', 'png', 'jpg', 'jpeg', 'webp', 'txt', 'json', 'md', 'csv', 'html', 'svg', 'pdf', 'zip']);

interface ArtifactDownloads {
  save(req: { filename: string; data: string | Blob | ArrayBuffer }): Promise<{ status: string }>;
}

let artifactDownloads: Promise<ArtifactDownloads | null> | null = null;

/** Capacidad de descargas cuando la app se ejecuta como página publicada en claude.ai. */
function getArtifactDownloads(): Promise<ArtifactDownloads | null> {
  const c = (window as unknown as { claude?: { use?: (n: string) => Promise<unknown> } }).claude;
  if (!c?.use) return Promise.resolve(null);
  artifactDownloads ??= Promise.race([c.use('downloads') as Promise<ArtifactDownloads | null>, new Promise<null>((r) => setTimeout(() => r(null), 6000))]).catch(() => null);
  return artifactDownloads;
}

export const isEmbeddedPage = (): boolean => !!(window as unknown as { claude?: { use?: unknown } }).claude?.use;

export async function downloadOrSave(defaultName: string, data: string | Blob, encoding: 'utf8' | 'base64', filters: DesktopFileFilter[]): Promise<boolean> {
  const api = window.homeDesign;
  if (api) {
    const payload = typeof data === 'string' ? data : await blobToBase64(data);
    const path = await api.files.save({ defaultName, filters, data: payload, encoding: typeof data === 'string' ? encoding : 'base64' });
    return !!path;
  }
  const dl = await getArtifactDownloads();
  if (dl) {
    let name = defaultName;
    let payload: string | Blob = typeof data === 'string' && encoding === 'base64' ? base64ToBlob(data) : data;
    const ext = name.split('.').pop()?.toLowerCase() ?? '';
    if (ext === 'hdsp') name = name.replace(/\.hdsp$/i, '.hdsp.json');
    else if (!ARTIFACT_EXTENSIONS.has(ext)) {
      // Formatos 3D (GLB/GLTF) se entregan dentro de un .zip.
      const { zipSync } = await import('fflate');
      const bytes = typeof payload === 'string' ? new TextEncoder().encode(payload) : new Uint8Array(await payload.arrayBuffer());
      payload = new Blob([zipSync({ [name]: bytes })], { type: 'application/zip' });
      name = `${name}.zip`;
    }
    try {
      await dl.save({ filename: name, data: payload });
      return true;
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'declined') return false;
      throw new Error(code === 'too_large' ? 'El fichero es demasiado grande para descargarlo aquí' : 'La descarga no está disponible en esta vista');
    }
  }
  const blob = typeof data === 'string' ? (encoding === 'base64' ? base64ToBlob(data) : new Blob([data], { type: 'application/octet-stream' })) : data;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

export async function pickFile(filters: DesktopFileFilter[], encoding: 'utf8' | 'base64'): Promise<{ name: string; data: string } | null> {
  const api = window.homeDesign;
  if (api) return api.files.open({ filters, encoding });
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = filters.flatMap((f) => f.extensions.map((e) => `.${e}`)).join(',');
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const data = encoding === 'utf8' ? await file.text() : await blobToBase64(file);
      resolve({ name: file.name, data });
    };
    input.click();
  });
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const s = String(r.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

export function base64ToBlob(b64: string, type = 'application/octet-stream'): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}
