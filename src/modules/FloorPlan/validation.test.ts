import { describe, expect, it } from 'vitest';
import { createEmptyProject } from './defaults';
import { createWall } from './factory';
import { ProjectFormatError, normalizeProject } from './validation';

describe('validación de proyectos', () => {
  it('rechaza ficheros que no son proyectos', () => {
    expect(() => normalizeProject('hola')).toThrow(ProjectFormatError);
    expect(() => normalizeProject({ foo: 1 })).toThrow(ProjectFormatError);
  });

  it('descarta elementos dañados sin perder el resto', () => {
    const doc = createEmptyProject('Prueba');
    const l = Object.keys(doc.levels)[0];
    const w = createWall(l, { x: 0, y: 0 }, { x: 4, y: 0 }, doc.settings);
    const raw = JSON.parse(JSON.stringify(doc));
    raw.walls[w.id] = w;
    raw.walls.roto = { id: 'roto', start: { x: 'a' } };
    raw.openings.huerfano = { id: 'huerfano', wallId: 'no-existe' };
    const { doc: out, warnings } = normalizeProject(raw);
    expect(Object.keys(out.walls)).toEqual([w.id]);
    expect(Object.keys(out.openings)).toHaveLength(0);
    expect(warnings.join(' ')).toMatch(/descartado 2/);
  });

  it('acepta el formato exportado { doc } y completa valores por defecto', () => {
    const doc = createEmptyProject('Exportado');
    const raw = JSON.parse(JSON.stringify({ format: 'homedesign-studio', doc }));
    delete raw.doc.lighting;
    const { doc: out } = normalizeProject(raw);
    expect(out.name).toBe('Exportado');
    expect(out.lighting.preset).toBe('mediodia');
  });
});
