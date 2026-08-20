import { describe, expect, it } from 'vitest';
import {
  DieValue,
  Quaternion,
  Vector3,
} from '../../rpc/proto/dice/v1/dice_pb';
import { SETTLE_STEPS } from './constants';
import {
  advanceSettling,
  getUpwardFace,
  isOutsideTray,
  quaternionToObject,
  vectorToObject,
  vectorToTuple,
} from './diceMath';

const halfSqrt = Math.SQRT1_2;

describe('getUpwardFace', () => {
  it.each([
    [{ x: 0, y: 0, z: 0, w: 1 }, DieValue.ONE],
    [{ x: 1, y: 0, z: 0, w: 0 }, DieValue.SIX],
    [{ x: 0, y: 0, z: halfSqrt, w: halfSqrt }, DieValue.TWO],
    [{ x: 0, y: 0, z: -halfSqrt, w: halfSqrt }, DieValue.FIVE],
    [{ x: -halfSqrt, y: 0, z: 0, w: halfSqrt }, DieValue.THREE],
    [{ x: halfSqrt, y: 0, z: 0, w: halfSqrt }, DieValue.FOUR],
  ])('maps quaternion %o to face %s', (quaternion, value) => {
    expect(getUpwardFace(quaternion)).toBe(value);
  });

  it('keeps opposite face pairs summing to seven', () => {
    expect(DieValue.ONE + DieValue.SIX).toBe(7);
    expect(DieValue.TWO + DieValue.FIVE).toBe(7);
    expect(DieValue.THREE + DieValue.FOUR).toBe(7);
  });
});

describe('physics adapters', () => {
  it('converts generated messages to tuples and objects', () => {
    const vector = new Vector3({ x: 1, y: 2, z: 3 });
    const quaternion = new Quaternion({ x: 0, y: 0, z: 0, w: 1 });

    expect(vectorToTuple(vector)).toEqual([1, 2, 3]);
    expect(vectorToObject(vector)).toEqual({ x: 1, y: 2, z: 3 });
    expect(quaternionToObject(quaternion)).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('rejects missing generated message values', () => {
    expect(() => vectorToTuple(undefined)).toThrow(/Missing vector/);
    expect(() => quaternionToObject(undefined)).toThrow(/Missing quaternion/);
  });
});

describe('advanceSettling', () => {
  const still = { x: 0, y: 0, z: 0 };

  it('settles only after the required consecutive physics steps', () => {
    let stableSteps = 0;
    for (let step = 1; step <= SETTLE_STEPS; step += 1) {
      const progress = advanceSettling(stableSteps, still, still);
      stableSteps = progress.stableSteps;
      expect(progress.settled).toBe(step === SETTLE_STEPS);
    }
  });

  it('resets after either velocity exceeds the threshold', () => {
    expect(
      advanceSettling(12, { x: 0.051, y: 0, z: 0 }, still),
    ).toEqual({ stableSteps: 0, settled: false });
    expect(
      advanceSettling(12, still, { x: 0, y: 0.051, z: 0 }),
    ).toEqual({ stableSteps: 0, settled: false });
  });
});

describe('isOutsideTray', () => {
  it('recognizes safe and escaped positions', () => {
    expect(isOutsideTray({ x: 0, y: 1, z: 0 })).toBe(false);
    expect(isOutsideTray({ x: 7, y: 1, z: 0 })).toBe(true);
    expect(isOutsideTray({ x: 0, y: -3, z: 0 })).toBe(true);
  });
});
