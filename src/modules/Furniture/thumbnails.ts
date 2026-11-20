/**
 * Miniaturas 3D de la biblioteca, renderizadas bajo demanda con un único
 * renderizador fuera de pantalla y guardadas en memoria. El renderizador
 * (three.js) se carga solo cuando hace falta la primera miniatura.
 */
import { useEffect, useState } from 'react';
import type { CatalogItem } from './types';

type Render = (item: CatalogItem) => string | null;
const cache = new Map<string, string>();
const listeners = new Map<string, Set<(url: string) => void>>();
const queue: CatalogItem[] = [];
let renderItem: Render | null = null;
let loading = false;
let failed = false;
let scheduled = false;

function pump() {
  scheduled = false;
  if (!renderItem) {
    if (loading) return;
    loading = true;
    import('./thumbnailRenderer')
      .then((m) => {
        renderItem = m.renderItem;
        schedule();
      })
      .catch(() => {
        failed = true;
        queue.length = 0;
      })
      .finally(() => (loading = false));
    return;
  }
  const start = performance.now();
  while (queue.length && performance.now() - start < 24) {
    const item = queue.shift()!;
    if (cache.has(item.id)) continue;
    const url = renderItem(item);
    if (!url) {
      failed = true;
      queue.length = 0;
      return;
    }
    cache.set(item.id, url);
    listeners.get(item.id)?.forEach((fn) => fn(url));
    listeners.delete(item.id);
  }
  if (queue.length) schedule();
}

function schedule() {
  if (scheduled) return;
  scheduled = true;
  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback;
  if (ric) ric(pump);
  else setTimeout(pump, 16);
}

/** Miniatura 3D del elemento (undefined mientras se genera o si no hay WebGL). */
export function useThumbnail(item: CatalogItem): string | undefined {
  const [url, setUrl] = useState(() => cache.get(item.id));
  useEffect(() => {
    if (cache.has(item.id)) {
      setUrl(cache.get(item.id));
      return;
    }
    if (failed) return;
    const set = listeners.get(item.id) ?? new Set();
    set.add(setUrl);
    listeners.set(item.id, set);
    if (!queue.includes(item)) queue.push(item);
    schedule();
    return () => {
      listeners.get(item.id)?.delete(setUrl);
    };
  }, [item]);
  return url;
}
