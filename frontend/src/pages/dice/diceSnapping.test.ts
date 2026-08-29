import { describe, expect, it } from 'vitest';
import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import {
  ArenaPoint,
  createArenaLayout,
  normalizedToWorld,
  worldToNormalized,
} from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';
import { snapReleasedDiePosition, SnapDie } from './diceSnapping';

const layout = createArenaLayout(0.5);

function normalized(point: ArenaPoint): NormalizedTablePosition {
  return worldToNormalized(layout, point);
}

function die(
  dieId: string,
  point: ArenaPoint,
  mode: SnapDie['mode'] = 'settled',
): SnapDie {
  return { dieId, mode, position: normalized(point) };
}

function expectWorldPosition(
  actual: NormalizedTablePosition,
  expected: ArenaPoint,
) {
  const world = normalizedToWorld(layout, actual);
  expect(world.x).toBeCloseTo(expected.x);
  expect(world.z).toBeCloseTo(expected.z);
}

describe('snapReleasedDiePosition', () => {
  it.each([
    { target: { x: -1, z: 0 }, release: { x: -0.76, z: 0.08 } },
    { target: { x: 1, z: 0 }, release: { x: 0.76, z: -0.08 } },
    { target: { x: 0, z: -1 }, release: { x: 0.08, z: -0.76 } },
    { target: { x: 0, z: 1 }, release: { x: -0.08, z: 0.76 } },
  ])('snaps to the exact $target side slot', ({ target, release }) => {
    const snapped = snapReleasedDiePosition(
      layout,
      'moving',
      normalized(release),
      [die('anchor', { x: 0, z: 0 })],
    );
    expectWorldPosition(snapped, target);
  });

  it('includes the capture boundary and ignores positions beyond it', () => {
    const captureDistance = DICE_TABLE_CONFIG.die.size *
      DICE_TABLE_CONFIG.die.snapCaptureRatio;
    const anchor = die('anchor', { x: 0, z: 0 });
    const boundary = { x: 1 + captureDistance, z: 0 };
    const outside = { x: boundary.x + 0.01, z: 0 };

    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized(boundary),
      [anchor],
    ), { x: 1, z: 0 });
    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized(outside),
      [anchor],
    ), outside);
  });

  it('chooses the nearest valid target with stable input-order tie breaking', () => {
    const anchors = [
      die('first', { x: 0, z: 0 }),
      die('second', { x: 2.2, z: 0 }),
    ];
    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized({ x: 1.15, z: 0 }),
      anchors,
    ), { x: 1.2, z: 0 });

    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized({ x: 1.1, z: 0 }),
      anchors,
    ), { x: 1, z: 0 });
  });

  it('rejects occupied and out-of-bounds side slots', () => {
    const occupiedRelease = { x: 1.1, z: 0 };
    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized(occupiedRelease),
      [
        die('anchor', { x: 0, z: 0 }),
        die('occupant', { x: 1, z: 0 }),
      ],
    ), occupiedRelease);

    const edgeRelease = normalizedToWorld(layout, { u: 0, v: 0.5 });
    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized(edgeRelease),
      [die('edge-anchor', { x: edgeRelease.x + 0.8, z: edgeRelease.z })],
    ), edgeRelease);
  });

  it('excludes the moving die and non-settled dice from snap anchors', () => {
    const release = { x: 1.1, z: 0 };
    expectWorldPosition(snapReleasedDiePosition(
      layout,
      'moving',
      normalized(release),
      [
        die('moving', { x: 0, z: 0 }),
        die('rolling', { x: 0, z: 0 }, 'rolling'),
        die('held', { x: 0, z: 0 }, 'held'),
      ],
    ), release);
  });
});
