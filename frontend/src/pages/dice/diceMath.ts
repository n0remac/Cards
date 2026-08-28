import {
  DieValue,
  Quaternion as ProtoQuaternion,
  Vector3 as ProtoVector3,
} from '../../rpc/proto/dice/v1/dice_pb';
import {
  DICE_TABLE_CONFIG,
} from './constants';

export type PlayableDieValue =
  | DieValue.ONE
  | DieValue.TWO
  | DieValue.THREE
  | DieValue.FOUR
  | DieValue.FIVE
  | DieValue.SIX;

export type VectorLike = { x: number; y: number; z: number };
export type QuaternionLike = VectorLike & { w: number };
export type VectorTuple = [number, number, number];

const WORLD_UP: VectorLike = { x: 0, y: 1, z: 0 };

const FACE_NORMALS: ReadonlyArray<{
  value: PlayableDieValue;
  normal: VectorLike;
}> = [
  { value: DieValue.ONE, normal: { x: 0, y: 1, z: 0 } },
  { value: DieValue.SIX, normal: { x: 0, y: -1, z: 0 } },
  { value: DieValue.TWO, normal: { x: 1, y: 0, z: 0 } },
  { value: DieValue.FIVE, normal: { x: -1, y: 0, z: 0 } },
  { value: DieValue.THREE, normal: { x: 0, y: 0, z: 1 } },
  { value: DieValue.FOUR, normal: { x: 0, y: 0, z: -1 } },
];

export function isPlayableDieValue(value: DieValue): value is PlayableDieValue {
  return value >= DieValue.ONE && value <= DieValue.SIX;
}

export function vectorToTuple(vector: ProtoVector3 | undefined): VectorTuple {
  if (!vector) {
    throw new Error('Missing vector in dice specification.');
  }
  return [vector.x, vector.y, vector.z];
}

export function vectorToObject(vector: ProtoVector3 | undefined): VectorLike {
  if (!vector) {
    throw new Error('Missing vector in dice specification.');
  }
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function quaternionToObject(
  quaternion: ProtoQuaternion | undefined,
): QuaternionLike {
  if (!quaternion) {
    throw new Error('Missing quaternion in dice specification.');
  }
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

function rotateVector(vector: VectorLike, quaternion: QuaternionLike): VectorLike {
  const length = Math.hypot(
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w,
  );
  if (!Number.isFinite(length) || length === 0) {
    throw new Error('Cannot read a die face from an invalid quaternion.');
  }

  const qx = quaternion.x / length;
  const qy = quaternion.y / length;
  const qz = quaternion.z / length;
  const qw = quaternion.w / length;

  const ix = qw * vector.x + qy * vector.z - qz * vector.y;
  const iy = qw * vector.y + qz * vector.x - qx * vector.z;
  const iz = qw * vector.z + qx * vector.y - qy * vector.x;
  const iw = -qx * vector.x - qy * vector.y - qz * vector.z;

  return {
    x: ix * qw + iw * -qx + iy * -qz - iz * -qy,
    y: iy * qw + iw * -qy + iz * -qx - ix * -qz,
    z: iz * qw + iw * -qz + ix * -qy - iy * -qx,
  };
}

export function getUpwardFace(quaternion: QuaternionLike): PlayableDieValue {
  let bestFace = FACE_NORMALS[0];
  let bestDot = -Infinity;

  for (const face of FACE_NORMALS) {
    const worldNormal = rotateVector(face.normal, quaternion);
    const dot =
      worldNormal.x * WORLD_UP.x +
      worldNormal.y * WORLD_UP.y +
      worldNormal.z * WORLD_UP.z;
    if (dot > bestDot) {
      bestDot = dot;
      bestFace = face;
    }
  }

  return bestFace.value;
}

export function faceUpQuaternion(value: PlayableDieValue): QuaternionLike {
  const halfTurn = Math.SQRT1_2;
  switch (value) {
    case DieValue.ONE:
      return { x: 0, y: 0, z: 0, w: 1 };
    case DieValue.SIX:
      return { x: 1, y: 0, z: 0, w: 0 };
    case DieValue.TWO:
      return { x: 0, y: 0, z: halfTurn, w: halfTurn };
    case DieValue.FIVE:
      return { x: 0, y: 0, z: -halfTurn, w: halfTurn };
    case DieValue.THREE:
      return { x: -halfTurn, y: 0, z: 0, w: halfTurn };
    case DieValue.FOUR:
      return { x: halfTurn, y: 0, z: 0, w: halfTurn };
  }
}

function speedSquared(vector: VectorLike): number {
  return vector.x * vector.x + vector.y * vector.y + vector.z * vector.z;
}

export type SettlingProgress = {
  stableSteps: number;
  settled: boolean;
};

export type BodyMotion = {
  linearVelocity: VectorLike;
  angularVelocity: VectorLike;
};

export function advanceRollSettling(
  stableSteps: number,
  motions: readonly BodyMotion[],
): SettlingProgress {
  const { settleSpeedThreshold, settleSteps } = DICE_TABLE_CONFIG.roll;
  const thresholdSquared = settleSpeedThreshold * settleSpeedThreshold;
  const isStable = motions.length > 0 && motions.every(
    ({ linearVelocity, angularVelocity }) =>
      speedSquared(linearVelocity) < thresholdSquared &&
      speedSquared(angularVelocity) < thresholdSquared,
  );
  const nextStableSteps = isStable
    ? Math.min(stableSteps + 1, settleSteps)
    : 0;

  return {
    stableSteps: nextStableSteps,
    settled: nextStableSteps >= settleSteps,
  };
}
