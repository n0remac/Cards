import {
  DieFace,
  WorldQuaternion,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';

export type PlayableDieFace =
  | DieFace.ONE
  | DieFace.TWO
  | DieFace.THREE
  | DieFace.FOUR
  | DieFace.FIVE
  | DieFace.SIX;

export type VectorLike = { x: number; y: number; z: number };
export type QuaternionLike = VectorLike & { w: number };
export type VectorTuple = [number, number, number];

const FACE_NORMALS: ReadonlyArray<{
  face: PlayableDieFace;
  normal: VectorLike;
}> = [
  { face: DieFace.ONE, normal: { x: 0, y: 1, z: 0 } },
  { face: DieFace.SIX, normal: { x: 0, y: -1, z: 0 } },
  { face: DieFace.TWO, normal: { x: 1, y: 0, z: 0 } },
  { face: DieFace.FIVE, normal: { x: -1, y: 0, z: 0 } },
  { face: DieFace.THREE, normal: { x: 0, y: 0, z: 1 } },
  { face: DieFace.FOUR, normal: { x: 0, y: 0, z: -1 } },
];

export function isPlayableDieFace(face: DieFace): face is PlayableDieFace {
  return face >= DieFace.ONE && face <= DieFace.SIX;
}

export function vectorToTuple(
  vector: WorldVector3 | undefined,
): VectorTuple {
  if (!vector) throw new Error('Missing vector in server transform.');
  return [vector.x, vector.y, vector.z];
}

export function vectorToObject(
  vector: WorldVector3 | undefined,
): VectorLike {
  if (!vector) throw new Error('Missing vector in server transform.');
  return { x: vector.x, y: vector.y, z: vector.z };
}

export function quaternionToObject(
  quaternion: WorldQuaternion | undefined,
): QuaternionLike {
  if (!quaternion) throw new Error('Missing quaternion in server transform.');
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

function rotateVector(
  vector: VectorLike,
  quaternion: QuaternionLike,
): VectorLike {
  const length = Math.hypot(
    quaternion.x, quaternion.y, quaternion.z, quaternion.w,
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

export function getUpwardFace(
  quaternion: QuaternionLike,
): PlayableDieFace {
  return FACE_NORMALS.reduce((best, candidate) =>
    rotateVector(candidate.normal, quaternion).y >
      rotateVector(best.normal, quaternion).y ? candidate : best,
  ).face;
}

export function faceUpQuaternion(face: PlayableDieFace): QuaternionLike {
  const halfTurn = Math.SQRT1_2;
  switch (face) {
    case DieFace.ONE: return { x: 0, y: 0, z: 0, w: 1 };
    case DieFace.SIX: return { x: 1, y: 0, z: 0, w: 0 };
    case DieFace.TWO: return { x: -0.5, y: -0.5, z: 0.5, w: 0.5 };
    case DieFace.FIVE: return { x: -0.5, y: 0.5, z: -0.5, w: 0.5 };
    case DieFace.THREE: return { x: -halfTurn, y: 0, z: 0, w: halfTurn };
    case DieFace.FOUR: return { x: 0, y: halfTurn, z: -halfTurn, w: 0 };
  }
}
