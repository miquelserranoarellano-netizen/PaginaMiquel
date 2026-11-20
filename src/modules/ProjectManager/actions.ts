/** Operaciones sobre la colección de proyectos (lista, duplicar, renombrar…). */
import { uid } from '@/core/ids';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import type { ProjectDoc, ProjectMeta } from '@/modules/FloorPlan/types';
import { normalizeProject } from '@/modules/FloorPlan/validation';
import { toast } from '@/modules/UI/toast';
import { getStorage } from './storage';
import { buildMeta, openDocument } from './persistence';
import { downloadOrSave, pickFile } from './files';

export async function listProjects(): Promise<ProjectMeta[]> {
  const list = await getStorage().list();
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function createProject(name = 'Mi casa', fromDoc?: ProjectDoc): Promise<void> {
  const doc = fromDoc ?? createEmptyProject(name);
  await getStorage().save(doc, await buildMeta(doc));
  openDocument(doc, { alreadySaved: true });
}

export async function duplicateProject(id: string): Promise<void> {
  const { doc } = normalizeProject(await getStorage().load(id));
  const now = Date.now();
  const copy: ProjectDoc = { ...doc, id: uid('prj'), name: `${doc.name} (copia)`, createdAt: now, updatedAt: now };
  await getStorage().save(copy, await buildMeta(copy));
  toast.success(`Se ha creado "${copy.name}"`);
}

export async function renameProject(id: string, name: string): Promise<void> {
  const { doc } = normalizeProject(await getStorage().load(id));
  const renamed = { ...doc, name, updatedAt: Date.now() };
  await getStorage().save(renamed, await buildMeta(renamed));
}

export async function deleteProject(id: string): Promise<void> {
  await getStorage().remove(id);
}

/** Exporta el proyecto completo (.hdsp, JSON) para copias de seguridad o compartirlo. */
export async function exportProjectFile(doc: ProjectDoc): Promise<void> {
  const data = JSON.stringify({ format: 'homedesign-studio', version: doc.schemaVersion, exportedAt: new Date().toISOString(), doc });
  await downloadOrSave(`${safeName(doc.name)}.hdsp`, data, 'utf8', [{ name: 'Proyecto HomeDesign', extensions: ['hdsp', 'json'] }]);
}

export async function exportStoredProject(id: string): Promise<void> {
  const { doc } = normalizeProject(await getStorage().load(id));
  await exportProjectFile(doc);
}

/** Importa un .hdsp. Si ya existe un proyecto con el mismo id se importa como copia. */
export async function importProjectFile(): Promise<ProjectDoc | null> {
  const file = await pickFile([{ name: 'Proyecto HomeDesign', extensions: ['hdsp', 'json'] }], 'utf8');
  if (!file) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(file.data);
  } catch {
    toast.error('El fichero no es un proyecto válido (JSON dañado)');
    return null;
  }
  try {
    const { doc, warnings } = normalizeProject(parsed);
    const existing = await getStorage().list();
    if (existing.some((m) => m.id === doc.id)) {
      doc.id = uid('prj');
      doc.name = `${doc.name} (importado)`;
    }
    await getStorage().save(doc, await buildMeta(doc));
    warnings.forEach((w) => toast.info(w));
    toast.success(`Proyecto "${doc.name}" importado`);
    return doc;
  } catch (e) {
    toast.error(e instanceof Error ? e.message : 'No se pudo importar el proyecto');
    return null;
  }
}

export const safeName = (s: string): string => s.replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'proyecto';
