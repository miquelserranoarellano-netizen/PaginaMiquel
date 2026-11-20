/** Copia a otro almacenamiento (cuenta, nube) los proyectos guardados en este dispositivo. */
import { normalizeProject } from '@/modules/FloorPlan/validation';
import { buildMeta } from './persistence';
import { getLocalStorage, type StorageAdapter } from './storage';

export async function countLocalProjects(): Promise<number> {
  try {
    return (await getLocalStorage().list()).length;
  } catch {
    return 0;
  }
}

/** Sube los proyectos locales que no estén ya (o estén más antiguos) en `target`. */
export async function uploadLocalProjects(target: StorageAdapter, onProgress?: (done: number, total: number) => void): Promise<{ uploaded: number; skipped: number }> {
  const local = getLocalStorage();
  const metas = await local.list();
  const existing = new Map((await target.list()).map((m) => [m.id, m.updatedAt]));
  let uploaded = 0;
  let skipped = 0;
  for (const m of metas) {
    onProgress?.(uploaded + skipped + 1, metas.length);
    if ((existing.get(m.id) ?? -1) >= m.updatedAt) {
      skipped++;
      continue;
    }
    const { doc } = normalizeProject(await local.load(m.id));
    await target.save(doc, m.thumbnail ? { ...m, name: doc.name } : await buildMeta(doc));
    uploaded++;
  }
  return { uploaded, skipped };
}
