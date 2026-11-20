import { describe, expect, it } from 'vitest';
import { createSampleHouse } from './sampleHouse';
import { decodeDoc, encodeDoc } from './claudeStorage';

describe('guardado en la cuenta de Claude', () => {
  it('comprime y trocea el proyecto sin perder datos', async () => {
    const doc = createSampleHouse();
    const parts = await encodeDoc(doc);
    expect(parts.every((p) => p.length <= 200_000)).toBe(true);
    expect(parts.join('').length).toBeLessThan(JSON.stringify(doc).length / 3);
    expect(await decodeDoc(parts)).toEqual(JSON.parse(JSON.stringify(doc)));
  });

  it('parte en varios documentos los proyectos grandes', async () => {
    const doc = createSampleHouse();
    // Un modelo importado (datos poco comprimibles) de ~600 KB.
    let seed = 12345;
    const rnd = () => ((seed ^= seed << 13), (seed ^= seed >>> 17), (seed ^= seed << 5), (seed >>> 0) % 89);
    const noise = Array.from({ length: 600_000 }, () => String.fromCharCode(33 + rnd())).join('');
    doc.assets = { a1: { id: 'a1', name: 'modelo.glb', mime: 'model/gltf-binary', dataUrl: noise, size: noise.length } };
    const parts = await encodeDoc(doc);
    expect(parts.length).toBeGreaterThan(1);
    expect(((await decodeDoc(parts)) as typeof doc).assets.a1.dataUrl).toBe(noise);
  });
});
