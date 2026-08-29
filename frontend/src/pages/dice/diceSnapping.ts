import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import {
  ArenaLayout,
  clampNormalizedPosition,
  isWorldPositionInsideArena,
  normalizedToWorld,
  worldToNormalized,
} from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';
import type { TableDie } from './tableModel';

export type SnapDie = Pick<TableDie, 'dieId' | 'mode' | 'position'>;

const DIRECTIONS = [
  { x: -1, z: 0 },
  { x: 1, z: 0 },
  { x: 0, z: -1 },
  { x: 0, z: 1 },
] as const;
const POSITION_EPSILON = 1e-7;

export function snapReleasedDiePosition(
  layout: ArenaLayout,
  movingDieId: string,
  releasedPosition: NormalizedTablePosition,
  dice: readonly SnapDie[],
): NormalizedTablePosition {
  const settledDice = dice
    .filter((die) => die.dieId !== movingDieId && die.mode === 'settled')
    .map((die) => normalizedToWorld(layout, die.position));
  const releasedWorld = normalizedToWorld(layout, releasedPosition);
  const dieSize = DICE_TABLE_CONFIG.die.size;
  const captureDistance = dieSize * DICE_TABLE_CONFIG.die.snapCaptureRatio;
  let bestTarget: { x: number; z: number; distance: number } | undefined;

  for (const anchor of settledDice) {
    for (const direction of DIRECTIONS) {
      const target = {
        x: anchor.x + direction.x * dieSize,
        z: anchor.z + direction.z * dieSize,
      };
      if (!isWorldPositionInsideArena(layout, target)) {
        continue;
      }

      const overlaps = settledDice.some((other) =>
        Math.abs(other.x - target.x) < dieSize - POSITION_EPSILON &&
        Math.abs(other.z - target.z) < dieSize - POSITION_EPSILON,
      );
      if (overlaps) {
        continue;
      }

      const distance = Math.hypot(
        releasedWorld.x - target.x,
        releasedWorld.z - target.z,
      );
      if (distance <= captureDistance + POSITION_EPSILON &&
          (!bestTarget || distance < bestTarget.distance - POSITION_EPSILON)) {
        bestTarget = { ...target, distance };
      }
    }
  }

  return bestTarget
    ? clampNormalizedPosition(worldToNormalized(layout, bestTarget))
    : releasedPosition;
}
