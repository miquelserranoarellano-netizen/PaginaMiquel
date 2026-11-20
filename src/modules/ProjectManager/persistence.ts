/**
 * Ciclo de vida del proyecto abierto: abrir, autoguardado con debounce,
 * guardado manual y guardado al cerrar la aplicación.
 */
import type { ProjectDoc, ProjectMeta } from '@/modules/FloorPlan/types';
import { sortedLevels, summarize } from '@/modules/FloorPlan/queries';
import { normalizeProject } from '@/modules/FloorPlan/validation';
import { toast } from '@/modules/UI/toast';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';
import { getStorage } from './storage';
import { useSaveStore } from './saveStore';
import { renderThumbnail } from './thumbnail';

const AUTOSAVE_DELAY = 1500;
let timer: ReturnType<typeof setTimeout> | null = null;
let savedRevision = -1;
let saving: Promise<void> | null = null;

export async function buildMeta(doc: ProjectDoc, withThumbnail = true): Promise<ProjectMeta> {
  const s = summarize(doc);
  let thumbnail: string | undefined;
  if (withThumbnail) {
    try {
      thumbnail = await renderThumbnail(doc);
    } catch {
      thumbnail = undefined;
    }
  }
  return { id: doc.id, name: doc.name, createdAt: doc.createdAt, updatedAt: doc.updatedAt, thumbnail, area: Math.round(s.usefulArea * 100) / 100, rooms: s.rooms };
}

/** Guarda inmediatamente el proyecto abierto. */
export async function saveNow(): Promise<boolean> {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (saving) await saving;
  const { doc, revision } = useProjectStore.getState();
  if (revision === savedRevision && useSaveStore.getState().status === 'saved') return true;
  const st = useSaveStore.getState();
  st.set({ status: 'saving' });
  const stamped: ProjectDoc = { ...doc, updatedAt: Date.now() };
  saving = (async () => {
    const meta = await buildMeta(stamped);
    await getStorage().save(stamped, meta);
  })();
  try {
    await saving;
    savedRevision = revision;
    const dirty = useProjectStore.getState().revision !== revision;
    useSaveStore.getState().set({ status: dirty ? 'dirty' : 'saved', lastSavedAt: Date.now(), error: null });
    if (dirty) scheduleSave();
    return true;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    useSaveStore.getState().set({ status: 'error', error: msg });
    toast.error(`No se pudo guardar el proyecto: ${msg}`);
    return false;
  } finally {
    saving = null;
  }
}

function scheduleSave() {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void saveNow();
  }, AUTOSAVE_DELAY);
}

/** Abre un documento en el editor. */
export function openDocument(doc: ProjectDoc, opts: { alreadySaved?: boolean } = {}) {
  const ps = useProjectStore.getState();
  ps.load(doc);
  savedRevision = opts.alreadySaved ? useProjectStore.getState().revision : -1;
  const ed = useEditorStore.getState();
  ed.setActiveLevel(sortedLevels(doc)[0].id);
  ed.clearSelection();
  ed.setTool('select');
  ed.setView('2d');
  ed.requestFit();
  ed.setScreen('editor');
  useSaveStore.getState().set({ status: opts.alreadySaved ? 'saved' : 'dirty', error: null });
  if (!opts.alreadySaved) scheduleSave();
}

export async function openProjectById(id: string): Promise<boolean> {
  try {
    const raw = await getStorage().load(id);
    const { doc, warnings } = normalizeProject(raw);
    openDocument(doc, { alreadySaved: warnings.length === 0 });
    warnings.forEach((w) => toast.info(w));
    return true;
  } catch (e) {
    toast.error(`No se pudo abrir el proyecto: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

/** Cierra el editor guardando antes los cambios pendientes. */
export async function closeProject(): Promise<void> {
  if (useSaveStore.getState().status !== 'saved') await saveNow();
  useEditorStore.getState().setScreen('projects');
}

let installed = false;

/** Instala el autoguardado (una sola vez). */
export function installAutosave() {
  if (installed) return;
  installed = true;
  useProjectStore.subscribe((s, prev) => {
    if (s.revision === prev.revision || s.doc === prev.doc) return;
    if (useEditorStore.getState().screen !== 'editor') return;
    if (s.revision === savedRevision) return;
    useSaveStore.getState().set({ status: 'dirty' });
    // Durante un arrastre se espera a soltar.
    if (!s.gestureBase) scheduleSave();
  });
  useProjectStore.subscribe((s, prev) => {
    if (prev.gestureBase && !s.gestureBase && useSaveStore.getState().status === 'dirty') scheduleSave();
  });
  window.addEventListener('beforeunload', (e) => {
    if (useEditorStore.getState().screen === 'editor' && useSaveStore.getState().status === 'dirty') {
      void saveNow();
      e.preventDefault();
    }
  });
  const api = window.homeDesign;
  if (api) {
    const openPending = async () => {
      const file = await api.takePendingFile();
      if (!file) return;
      const { importProjectText } = await import('./actions');
      if (useEditorStore.getState().screen === 'editor') await saveNow();
      const doc = await importProjectText(file.data);
      if (doc) openDocument(doc, { alreadySaved: true });
    };
    void openPending();
    api.onFileAvailable(() => void openPending());
  }
  window.homeDesign?.onBeforeClose(async () => {
    if (useEditorStore.getState().screen === 'editor' && useSaveStore.getState().status !== 'saved') await saveNow();
  });
}
