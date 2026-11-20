import { useEffect } from 'react';
import { type ElementRef, COLLECTION } from '@/modules/FloorPlan/types';
import { duplicateElements, translateElements } from '@/modules/FloorPlan/queries';
import { deleteWithUndo } from './actions';
import { toast } from './toast';
import { saveNow } from '@/modules/ProjectManager/persistence';
import { normalizeDeg } from '@/core/units';
import { type ToolId, useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';

const TOOL_KEYS: Record<string, ToolId> = { v: 'select', w: 'wall', h: 'room-rect', y: 'room-poly', u: 'room-detect', m: 'measure' };

let clipboard: ElementRef[] = [];
let pasteCount = 0;

/** Atajos de teclado globales del editor. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      const ed = useEditorStore.getState();
      if (ed.screen !== 'editor') return;
      const ps = useProjectStore.getState();
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        ps.undo();
        return;
      }
      if (mod && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        ps.redo();
        return;
      }
      if (mod && key === 's') {
        e.preventDefault();
        void saveNow();
        return;
      }
      if (ed.view === 'walk') {
        // El recorrido gestiona su propio teclado; solo se permiten cambios de vista.
        if (e.key === '1') ed.setView('2d');
        if (e.key === '2') ed.setView('3d');
        return;
      }

      const sel = ed.selection.filter((r) => !!projectApi.doc[COLLECTION[r.kind]][r.id]);
      if (mod && key === 'a' && ed.view === '2d') {
        e.preventDefault();
        const doc = projectApi.doc;
        const refs: ElementRef[] = [];
        for (const kind of ['wall', 'room', 'opening', 'furniture', 'dimension'] as const)
          for (const el of Object.values(doc[COLLECTION[kind]])) if (el.levelId === ed.activeLevelId) refs.push({ kind, id: el.id });
        ed.select(refs);
        return;
      }
      if (mod && key === 'c' && sel.length) {
        clipboard = sel;
        pasteCount = 0;
        return;
      }
      if (mod && key === 'v' && clipboard.length) {
        e.preventDefault();
        pasteCount++;
        let out: ElementRef[] = [];
        const refs = clipboard.filter((r) => !!projectApi.doc[COLLECTION[r.kind]][r.id]);
        if (!refs.length) {
          toast.info('Lo que copiaste ya no existe en el proyecto');
          return;
        }
        projectApi.apply((d) => {
          out = duplicateElements(d, refs, { x: 0.5 * pasteCount, y: 0.5 * pasteCount });
        });
        ed.select(out);
        return;
      }
      if (mod && key === 'd' && sel.length) {
        e.preventDefault();
        let out: ElementRef[] = [];
        projectApi.apply((d) => {
          out = duplicateElements(d, sel, { x: 0.5, y: 0.5 });
        });
        ed.select(out);
        return;
      }
      if (mod) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && sel.length) {
        e.preventDefault();
        deleteWithUndo(sel);
        return;
      }
      if (e.key === '?') {
        ed.setHelpOpen(true);
        return;
      }
      if (e.key === 'Escape') {
        if (ed.tool !== 'select') ed.setTool('select');
        else ed.clearSelection();
        return;
      }
      if (e.key === '1') return ed.setView('2d');
      if (e.key === '2') return ed.setView('3d');
      if (e.key === '3') return ed.setView('walk');

      if (key === 'r' && sel.some((r) => r.kind === 'furniture')) {
        projectApi.apply((d) => {
          for (const r of sel) if (r.kind === 'furniture') d.furniture[r.id].rotation = normalizeDeg(d.furniture[r.id].rotation + (e.shiftKey ? 15 : 90));
        });
        return;
      }
      if (e.key.startsWith('Arrow') && sel.length) {
        e.preventDefault();
        const step = (e.shiftKey ? 10 : 1) * (ed.gridSize || 0.05);
        const delta = { x: e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, y: e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0 };
        projectApi.apply((d) => translateElements(d, sel, delta));
        return;
      }
      if (ed.view !== '2d') return;
      if (key === 'f') return ed.requestFit();
      if (key === 'd') return ed.setOpeningKind('door');
      if (key === 'n') return ed.setOpeningKind('window');
      if (TOOL_KEYS[key]) {
        ed.setLeftTab('tools');
        ed.setTool(TOOL_KEYS[key]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
