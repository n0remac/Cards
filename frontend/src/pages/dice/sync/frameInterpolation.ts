import {
  PhysicsFrame,
  WorldQuaternion,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';

const SERVER_TICKS_PER_SECOND = 60;
const INTERPOLATION_DELAY_TICKS = 6;
const MAX_BUFFERED_FRAMES = 24;

type ReceivedFrame = { frame: PhysicsFrame; receivedAt: number };

export type PhysicsFrameBuffer = {
  clear: () => void;
  push: (frame: PhysicsFrame, receivedAt?: number) => boolean;
  sample: (dieId: string, now?: number) => WorldTransform | undefined;
  latestTick: () => bigint | undefined;
};

function normalizedQuaternion(source: WorldQuaternion): WorldQuaternion {
  const length = Math.hypot(source.x, source.y, source.z, source.w) || 1;
  return new WorldQuaternion({
    x: source.x / length,
    y: source.y / length,
    z: source.z / length,
    w: source.w / length,
  });
}

export function interpolateQuaternion(
  firstSource: WorldQuaternion,
  secondSource: WorldQuaternion,
  alpha: number,
): WorldQuaternion {
  const first = normalizedQuaternion(firstSource);
  let second = normalizedQuaternion(secondSource);
  let dot = first.x * second.x + first.y * second.y +
    first.z * second.z + first.w * second.w;
  if (dot < 0) {
    dot = -dot;
    second = new WorldQuaternion({
      x: -second.x, y: -second.y, z: -second.z, w: -second.w,
    });
  }
  if (dot > 0.9995) {
    return normalizedQuaternion(new WorldQuaternion({
      x: first.x + (second.x - first.x) * alpha,
      y: first.y + (second.y - first.y) * alpha,
      z: first.z + (second.z - first.z) * alpha,
      w: first.w + (second.w - first.w) * alpha,
    }));
  }
  const theta = Math.acos(Math.min(1, Math.max(-1, dot)));
  const sine = Math.sin(theta);
  const firstWeight = Math.sin((1 - alpha) * theta) / sine;
  const secondWeight = Math.sin(alpha * theta) / sine;
  return new WorldQuaternion({
    x: first.x * firstWeight + second.x * secondWeight,
    y: first.y * firstWeight + second.y * secondWeight,
    z: first.z * firstWeight + second.z * secondWeight,
    w: first.w * firstWeight + second.w * secondWeight,
  });
}

export function interpolateTransform(
  first: WorldTransform,
  second: WorldTransform,
  alpha: number,
): WorldTransform | undefined {
  if (!first.position || !first.rotation ||
      !second.position || !second.rotation) return undefined;
  const amount = Math.min(1, Math.max(0, alpha));
  return new WorldTransform({
    position: new WorldVector3({
      x: first.position.x + (second.position.x - first.position.x) * amount,
      y: first.position.y + (second.position.y - first.position.y) * amount,
      z: first.position.z + (second.position.z - first.position.z) * amount,
    }),
    rotation: interpolateQuaternion(first.rotation, second.rotation, amount),
  });
}

function transformFor(frame: PhysicsFrame, dieId: string) {
  return frame.dice.find((die) => die.dieId === dieId)?.transform;
}

export function createPhysicsFrameBuffer(): PhysicsFrameBuffer {
  let frames: ReceivedFrame[] = [];
  return {
    clear() {
      frames = [];
    },
    push(frame, receivedAt = performance.now()) {
      const latest = frames.at(-1)?.frame.tick;
      if (latest !== undefined && frame.tick <= latest) return false;
      frames.push({ frame, receivedAt });
      if (frames.length > MAX_BUFFERED_FRAMES) {
        frames = frames.slice(-MAX_BUFFERED_FRAMES);
      }
      return true;
    },
    sample(dieId, now = performance.now()) {
      const latest = frames.at(-1);
      if (!latest) return undefined;
      const elapsedTicks = Math.max(0, now - latest.receivedAt) *
        SERVER_TICKS_PER_SECOND / 1000;
      const targetTick = Number(latest.frame.tick) -
        INTERPOLATION_DELAY_TICKS + elapsedTicks;
      let before = frames[0];
      let after = frames.at(-1)!;
      for (let index = 0; index < frames.length; index += 1) {
        if (Number(frames[index].frame.tick) <= targetTick) {
          before = frames[index];
        }
        if (Number(frames[index].frame.tick) >= targetTick) {
          after = frames[index];
          break;
        }
      }
      const first = transformFor(before.frame, dieId);
      const second = transformFor(after.frame, dieId);
      if (!first) return second;
      if (!second || before.frame.tick === after.frame.tick) return first;
      const alpha = (targetTick - Number(before.frame.tick)) /
        Number(after.frame.tick - before.frame.tick);
      return interpolateTransform(first, second, alpha);
    },
    latestTick: () => frames.at(-1)?.frame.tick,
  };
}
