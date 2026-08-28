import { describe, expect, it } from 'vitest';
import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import { createArenaLayout, normalizedToWorld } from './arenaLayout';
import {
  collectChangedPlacements,
  shouldSnapReconciliation,
} from './reconciliation';

describe('table reconciliation', () => {
  it('always reports rolled dice and only existing dice displaced enough', () => {
    const layout = createArenaLayout(0.5);
    const baseline = {
      rolling: new NormalizedTablePosition({ u: 0.25, v: 0.3 }),
      still: new NormalizedTablePosition({ u: 0.5, v: 0.5 }),
      displaced: new NormalizedTablePosition({ u: 0.7, v: 0.6 }),
    };
    const placements = collectChangedPlacements(
      layout,
      new Set(['rolling']),
      baseline,
      new Map([
        ['rolling', normalizedToWorld(layout, baseline.rolling)],
        ['still', normalizedToWorld(layout, baseline.still)],
        ['displaced', normalizedToWorld(layout, { u: 0.82, v: 0.6 })],
      ]),
    );
    expect(placements.map(({ dieId }) => dieId).sort())
      .toEqual(['displaced', 'rolling']);
  });

  it('snaps only outside the playable quadrilateral', () => {
    const layout = createArenaLayout(0.5);
    expect(shouldSnapReconciliation(
      layout,
      normalizedToWorld(layout, { u: 0.1, v: 0.9 }),
    )).toBe(false);
    const edge = normalizedToWorld(layout, { u: 0, v: 0.5 });
    expect(shouldSnapReconciliation(layout, { x: edge.x - 2, z: edge.z }))
      .toBe(true);
  });
});
