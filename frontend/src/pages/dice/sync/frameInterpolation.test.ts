import { describe, expect, it } from 'vitest';
import {
  DieTransform,
  PhysicsFrame,
  WorldQuaternion,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  createPhysicsFrameBuffer,
  interpolateQuaternion,
} from './frameInterpolation';

function frame(tick: bigint, x: number) {
  return new PhysicsFrame({
    tick,
    dice: [new DieTransform({
      dieId: 'die',
      transform: new WorldTransform({
        position: new WorldVector3({ x, y: 0.5, z: 0 }),
        rotation: new WorldQuaternion({ w: 1 }),
      }),
    })],
  });
}

describe('physics frame interpolation', () => {
  it('rejects stale frames and interpolates six ticks behind the server', () => {
    const buffer = createPhysicsFrameBuffer();
    expect(buffer.push(frame(100n, 0), 1000)).toBe(true);
    expect(buffer.push(frame(103n, 3), 1050)).toBe(true);
    expect(buffer.push(frame(102n, 99), 1060)).toBe(false);
    expect(buffer.push(frame(106n, 6), 1100)).toBe(true);
    expect(buffer.sample('die', 1100)?.position?.x).toBeCloseTo(0);
    expect(buffer.sample('die', 1150)?.position?.x).toBeCloseTo(3);
  });

  it('does not extrapolate beyond the newest transform', () => {
    const buffer = createPhysicsFrameBuffer();
    buffer.push(frame(10n, 4), 0);
    expect(buffer.sample('die', 10_000)?.position?.x).toBe(4);
  });

  it('takes the shortest quaternion path', () => {
    const midpoint = interpolateQuaternion(
      new WorldQuaternion({ w: 1 }),
      new WorldQuaternion({ w: -1 }),
      0.5,
    );
    expect(Math.abs(midpoint.w)).toBeCloseTo(1);
  });
});
