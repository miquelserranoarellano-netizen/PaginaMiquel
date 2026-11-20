/** Acciones de edición compartidas por el teclado, los paneles y la interfaz táctil. */
import type { ElementRef } from '@/modules/FloorPlan/types';
import { deleteElements } from '@/modules/FloorPlan/queries';
import { useEditorStore } from '@/store/editorStore';
import { projectApi, useProjectStore } from '@/store/projectStore';
import { toast } from './toast';

const NAMES: Record<ElementRef['kind'], [string, string]> = {
  wall: ['muro', 'muros'],
  room: ['estancia', 'estancias'],
  opening: ['hueco', 'huecos'],
  furniture: ['objeto', 'objetos'],
  dimension: ['cota', 'cotas'],
};

/** Elimina elementos y ofrece deshacerlo desde el aviso. */
export function deleteWithUndo(refs: readonly ElementRef[]): void {
  if (!refs.length) return;
  projectApi.apply((d) => deleteElements(d, refs));
  useEditorStore.getState().clearSelection();
  const kinds = new Set(refs.map((r) => r.kind));
  const what = refs.length === 1 ? `${NAMES[refs[0].kind][0][0].toUpperCase()}${NAMES[refs[0].kind][0].slice(1)} eliminado` : kinds.size === 1 ? `${refs.length} ${NAMES[refs[0].kind][1]} eliminados` : `${refs.length} elementos eliminados`;
  toast.action(what, 'Deshacer', () => useProjectStore.getState().undo());
}
