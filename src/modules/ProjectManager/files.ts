/**
 * Guardar/abrir ficheros: diálogo nativo en escritorio, descarga / selector
 * de ficheros en el navegador.
 */
import type { DesktopFileFilter } from '@/electron';

export async function downloadOrSave(defaultName: string, data: string | Blob, encoding: 'utf8' | 'base64', filters: DesktopFileFilter[]): Promise<boolean> {
  const api = window.homeDesign;
  if (api) {
    const payload = typeof data === 'string' ? data : await blobToBase64(data);
    const path = await api.files.save({ defaultName, filters, data: payload, encoding: typeof data === 'string' ? encoding : 'base64' });
    return !!path;
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
