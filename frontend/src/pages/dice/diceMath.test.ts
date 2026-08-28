import { describe, expect, it } from 'vitest';
import {
  DieValue,
  Quaternion,
  Vector3,
} from '../../rpc/proto/dice/v1/dice_pb';
import { DICE_TABLE_CONFIG } from './constants';
import {
  advanceRollSettling,
  faceUpQuaternion,
  getUpwardFace,
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

  it('creates a canonical face-up quaternion for every playable value', () => {
    const values = [
      DieValue.ONE,
      DieValue.TWO,
      DieValue.THREE,
      DieValue.FOUR,
      DieValue.FIVE,
      DieValue.SIX,
    ] as const;
    for (const value of values) {
      expect(getUpwardFace(faceUpQuaternion(value))).toBe(value);
    }
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

describe('advanceRollSettling', () => {
  const still = { x: 0, y: 0, z: 0 };
  const atRest = (count: number) => Array.from({ length: count }, () => ({
    linearVelocity: still,
    angularVelocity: still,
  }));

  it('settles the roll only after every die is stable for 20 shared steps', () => {
    let stableSteps = 0;
    for (let step = 1; step <= DICE_TABLE_CONFIG.roll.settleSteps; step += 1) {
      const progress = advanceRollSettling(stableSteps, atRest(10));
      stableSteps = progress.stableSteps;
      expect(progress.settled).toBe(step === DICE_TABLE_CONFIG.roll.settleSteps);
    }
  });

  it('resets the whole roll when any die moves, then requires 20 new steps', () => {
    const motions = atRest(3);
    motions[1] = {
      linearVelocity: { x: 0.051, y: 0, z: 0 },
      angularVelocity: still,
    };
    expect(advanceRollSettling(19, motions)).toEqual({
      stableSteps: 0,
      settled: false,
    });

    let progress = { stableSteps: 0, settled: false };
    for (let step = 1; step <= DICE_TABLE_CONFIG.roll.settleSteps; step += 1) {
      progress = advanceRollSettling(progress.stableSteps, atRest(3));
      expect(progress.settled).toBe(step === DICE_TABLE_CONFIG.roll.settleSteps);
    }
  });

  it('does not settle an empty body collection', () => {
    expect(advanceRollSettling(19, [])).toEqual({
      stableSteps: 0,
      settled: false,
    });
  });
});
