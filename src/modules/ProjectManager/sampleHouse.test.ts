import { describe, expect, it } from 'vitest';
import { summarize } from '@/modules/FloorPlan/queries';
import { normalizeProject } from '@/modules/FloorPlan/validation';
import { createSampleHouse } from './sampleHouse';

describe('casa de ejemplo', () => {
  it('se genera completa y es válida', () => {
    const doc = createSampleHouse();
    const s = summarize(doc);
    expect(s.rooms).toBe(9);
    expect(s.openings).toBeGreaterThanOrEqual(17);
    expect(s.usefulArea).toBeGreaterThan(100);
    const { warnings } = normalizeProject(JSON.parse(JSON.stringify(doc)));
    expect(warnings).toHaveLength(0);
  });
});
