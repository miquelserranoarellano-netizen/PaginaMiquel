import { useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';
import { useProjectStore } from '@/store/projectStore';

/**
 * Si la planta activa deja de existir (por ejemplo, al deshacer la creación de
 * una planta), se activa la primera para que el editor nunca quede vacío.
 */
export function useLevelGuard() {
  const levels = useProjectStore((s) => s.doc.levels);
  const active = useEditorStore((s) => s.activeLevelId);
  useEffect(() => {
    if (levels[active]) return;
    const first = Object.values(levels).sort((a, b) => a.order - b.order)[0];
    if (first) useEditorStore.getState().setActiveLevel(first.id);
  }, [levels, active]);
}
