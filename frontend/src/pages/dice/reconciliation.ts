import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import {
  ArenaLayout,
  ArenaPoint,
  isWorldPositionInsideArena,
  worldToNormalized,
} from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';
import { SettledPlacement } from './rollModel';

export function collectChangedPlacements(
  layout: ArenaLayout,
  activeDieIds: ReadonlySet<string>,
  baseline: Readonly<Record<string, NormalizedTablePosition>>,
  worldPositions: ReadonlyMap<string, ArenaPoint>,
): SettledPlacement[] {
  return [...worldPositions].flatMap(([dieId, worldPosition]) => {
    const previous = baseline[dieId];
    if (!previous) {
      return [];
    }
    const position = worldToNormalized(layout, worldPosition);
    const distance = Math.hypot(
      previous.u - position.u,
      previous.v - position.v,
    );
    return activeDieIds.has(dieId) ||
      distance >= DICE_TABLE_CONFIG.reconciliation.positionTolerance
      ? [{ dieId, position }]
      : [];
  });
}

export function shouldSnapReconciliation(
  layout: ArenaLayout,
  position: ArenaPoint,
): boolean {
  return !isWorldPositionInsideArena(layout, position);
}
