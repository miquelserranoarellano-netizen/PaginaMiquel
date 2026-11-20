import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyProject } from '@/modules/FloorPlan/defaults';
import { addWallMerged } from '@/modules/Walls/ops';
import { useProjectStore } from './projectStore';

describe('historial (deshacer / rehacer)', () => {
  beforeEach(() => useProjectStore.getState().load(createEmptyProject()));

  it('deshace y rehace cambios', () => {
    const s = useProjectStore.getState();
    const l = Object.keys(s.doc.levels)[0];
    s.apply((d) => void addWallMerged(d, l, { x: 0, y: 0 }, { x: 3, y: 0 }));
    expect(Object.keys(useProjectStore.getState().doc.walls)).toHaveLength(1);
    useProjectStore.getState().undo();
    expect(Object.keys(useProjectStore.getState().doc.walls)).toHaveLength(0);
    useProjectStore.getState().redo();
    expect(Object.keys(useProjectStore.getState().doc.walls)).toHaveLength(1);
  });

  it('un arrastre genera una única entrada de historial', () => {
    const s = useProjectStore.getState();
    s.apply((d) => void (d.name = 'A'));
    const before = useProjectStore.getState().past.length;
    s.beginGesture();
    for (let i = 0; i < 10; i++) useProjectStore.getState().updateGesture((d) => void (d.name = `B${i}`));
    useProjectStore.getState().endGesture();
    expect(useProjectStore.getState().past.length).toBe(before + 1);
    expect(useProjectStore.getState().doc.name).toBe('B9');
    useProjectStore.getState().undo();
    expect(useProjectStore.getState().doc.name).toBe('A');
  });
});

describe('recetas', () => {
  it('ignora el valor devuelto por recetas de una sola expresión', () => {
    useProjectStore.getState().load(createEmptyProject());
    // Equivale a `set((r) => (r.name = v))` en los paneles de propiedades.
    useProjectStore.getState().apply((d) => (d.name = 'Nuevo') as unknown as void);
    expect(useProjectStore.getState().doc.name).toBe('Nuevo');
  });
});
