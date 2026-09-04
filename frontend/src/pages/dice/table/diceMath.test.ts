import { describe, expect, it } from 'vitest';
import {
  DieFace,
  WorldQuaternion,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  faceUpQuaternion,
  getUpwardFace,
  quaternionToObject,
  vectorToObject,
  vectorToTuple,
} from './diceMath';

describe('server transform adapters', () => {
  it('converts double-precision protobuf values without normalization', () => {
    const vector = new WorldVector3({ x: 10_000.125, y: 2, z: -3 });
    const quaternion = new WorldQuaternion({ w: 1 });
    expect(vectorToTuple(vector)).toEqual([10_000.125, 2, -3]);
    expect(vectorToObject(vector)).toEqual({ x: 10_000.125, y: 2, z: -3 });
    expect(quaternionToObject(quaternion)).toEqual({ x: 0, y: 0, z: 0, w: 1 });
  });

  it('keeps the canonical face mapping aligned with the Rust service', () => {
    for (const face of [
      DieFace.ONE, DieFace.TWO, DieFace.THREE,
      DieFace.FOUR, DieFace.FIVE, DieFace.SIX,
    ] as const) {
      expect(getUpwardFace(faceUpQuaternion(face))).toBe(face);
    }
  });
});
