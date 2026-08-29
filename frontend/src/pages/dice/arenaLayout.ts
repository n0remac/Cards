import {
  OrthographicCamera,
  PerspectiveCamera,
  Plane,
  Raycaster,
  Vector2,
  Vector3,
} from 'three';
import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import { DICE_TABLE_CONFIG } from './constants';
import { VectorLike, VectorTuple } from './diceMath';

export type ArenaPoint = { x: number; z: number };
export type ArenaQuadrilateral = readonly [
  ArenaPoint,
  ArenaPoint,
  ArenaPoint,
  ArenaPoint,
];

export type ArenaWall = {
  start: ArenaPoint;
  end: ArenaPoint;
  center: VectorTuple;
  halfLength: number;
  rotation: VectorTuple;
  inwardNormal: ArenaPoint;
};

export type ArenaLayout = {
  aspect: number;
  aspectKey: string;
  camera: { position: VectorTuple; fov: number };
  screenBoundary: ArenaQuadrilateral;
  playableQuadrilateral: ArenaQuadrilateral;
  walls: readonly ArenaWall[];
  floor: {
    center: VectorTuple;
    halfExtents: VectorTuple;
  };
  visualFloor: {
    center: VectorTuple;
    width: number;
    depth: number;
  };
  recoveryBounds: { minimumY: number };
  shadowBounds: {
    left: number;
    right: number;
    top: number;
    bottom: number;
  };
};

export type ContainedMotion = {
  position: VectorLike;
  velocity: VectorLike;
  corrected: boolean;
};

const SCREEN_CORNERS = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
] as const;

const cross = (a: ArenaPoint, b: ArenaPoint) => a.x * b.z - a.z * b.x;

function cameraForAspect(aspect: number): ArenaLayout['camera'] {
  const { camera } = DICE_TABLE_CONFIG;
  if (aspect >= camera.mobileAspectBreakpoint) {
    return {
      position: [...camera.desktopPosition],
      fov: camera.desktopFov,
    };
  }

  const baseDistance = Math.hypot(...camera.mobilePosition);
  const verticalHalfSpan = baseDistance * Math.tan(
    (camera.mobileFov * Math.PI) / 360,
  );
  const scale = Math.max(
    1,
    camera.minimumHalfTableWidth / (verticalHalfSpan * aspect),
  );

  return {
    position: camera.mobilePosition.map((value) => value * scale) as VectorTuple,
    fov: camera.mobileFov,
  };
}

function projectScreenBoundary(
  aspect: number,
  cameraLayout: ArenaLayout['camera'],
): ArenaQuadrilateral {
  const camera = new PerspectiveCamera(cameraLayout.fov, aspect, 0.1, 160);
  camera.position.set(...cameraLayout.position);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  const raycaster = new Raycaster();
  const ground = new Plane(new Vector3(0, 1, 0), 0);
  const points = SCREEN_CORNERS.map(([screenX, screenY]) => {
    raycaster.setFromCamera(new Vector2(screenX, screenY), camera);
    const hit = raycaster.ray.intersectPlane(ground, new Vector3());
    if (!hit) {
      throw new Error('The camera does not intersect the dice table.');
    }
    return { x: hit.x, z: hit.z };
  });

  return points as unknown as ArenaQuadrilateral;
}

function inwardNormal(start: ArenaPoint, end: ArenaPoint): ArenaPoint {
  const dx = end.x - start.x;
  const dz = end.z - start.z;
  const length = Math.hypot(dx, dz);
  return { x: -dz / length, z: dx / length };
}

function intersectLines(
  firstPoint: ArenaPoint,
  firstDirection: ArenaPoint,
  secondPoint: ArenaPoint,
  secondDirection: ArenaPoint,
): ArenaPoint {
  const denominator = cross(firstDirection, secondDirection);
  if (Math.abs(denominator) < 1e-9) {
    return {
      x: (firstPoint.x + secondPoint.x) / 2,
      z: (firstPoint.z + secondPoint.z) / 2,
    };
  }
  const between = {
    x: secondPoint.x - firstPoint.x,
    z: secondPoint.z - firstPoint.z,
  };
  const distance = cross(between, secondDirection) / denominator;
  return {
    x: firstPoint.x + firstDirection.x * distance,
    z: firstPoint.z + firstDirection.z * distance,
  };
}

function insetQuadrilateral(
  boundary: ArenaQuadrilateral,
  inset: number,
): ArenaQuadrilateral {
  return boundary.map((vertex, index) => {
    const previousIndex = (index + boundary.length - 1) % boundary.length;
    const nextIndex = (index + 1) % boundary.length;
    const previous = boundary[previousIndex];
    const next = boundary[nextIndex];
    const previousDirection = {
      x: vertex.x - previous.x,
      z: vertex.z - previous.z,
    };
    const currentDirection = {
      x: next.x - vertex.x,
      z: next.z - vertex.z,
    };
    const previousNormal = inwardNormal(previous, vertex);
    const currentNormal = inwardNormal(vertex, next);
    return intersectLines(
      {
        x: vertex.x + previousNormal.x * inset,
        z: vertex.z + previousNormal.z * inset,
      },
      previousDirection,
      {
        x: vertex.x + currentNormal.x * inset,
        z: vertex.z + currentNormal.z * inset,
      },
      currentDirection,
    );
  }) as unknown as ArenaQuadrilateral;
}

function buildWalls(boundary: ArenaQuadrilateral): readonly ArenaWall[] {
  const wallY = DICE_TABLE_CONFIG.arena.wallHeight / 2;
  return boundary.map((start, index) => {
    const end = boundary[(index + 1) % boundary.length];
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    return {
      start,
      end,
      center: [(start.x + end.x) / 2, wallY, (start.z + end.z) / 2],
      halfLength: Math.hypot(dx, dz) / 2,
      rotation: [0, -Math.atan2(dz, dx), 0],
      inwardNormal: inwardNormal(start, end),
    };
  });
}

function createShadowBounds(
  boundary: ArenaQuadrilateral,
): ArenaLayout['shadowBounds'] {
  const shadowCamera = new OrthographicCamera();
  shadowCamera.position.set(...DICE_TABLE_CONFIG.lighting.directionalPosition);
  shadowCamera.lookAt(0, 0, 0);
  shadowCamera.updateMatrixWorld(true);

  const maximumCasterHeight = DICE_TABLE_CONFIG.roll.spawnHeightMaximum +
    DICE_TABLE_CONFIG.die.size / 2;
  const lightSpacePoints = boundary.flatMap(({ x, z }) => [
    new Vector3(x, 0, z),
    new Vector3(x, maximumCasterHeight, z),
  ]).map((point) => point.applyMatrix4(shadowCamera.matrixWorldInverse));
  const xs = lightSpacePoints.map(({ x }) => x);
  const ys = lightSpacePoints.map(({ y }) => y);
  const padding = DICE_TABLE_CONFIG.lighting.shadowPadding;

  return {
    left: Math.min(...xs) - padding,
    right: Math.max(...xs) + padding,
    top: Math.max(...ys) + padding,
    bottom: Math.min(...ys) - padding,
  };
}

function createVisualFloor(
  boundary: ArenaQuadrilateral,
): ArenaLayout['visualFloor'] {
  const xs = boundary.map(({ x }) => x);
  const zs = boundary.map(({ z }) => z);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minZ = Math.min(...zs);
  const maxZ = Math.max(...zs);
  const padding = DICE_TABLE_CONFIG.arena.visualFloorPadding;

  return {
    center: [(minX + maxX) / 2, 0, (minZ + maxZ) / 2],
    width: maxX - minX + padding * 2,
    depth: maxZ - minZ + padding * 2,
  };
}

export function createArenaLayout(aspect: number): ArenaLayout {
  if (!Number.isFinite(aspect) || aspect <= 0) {
    throw new Error('The dice table aspect ratio must be positive.');
  }

  const camera = cameraForAspect(aspect);
  const screenBoundary = projectScreenBoundary(aspect, camera);
  const centerInset = DICE_TABLE_CONFIG.die.colliderHalfExtent +
    DICE_TABLE_CONFIG.arena.wallThickness +
    DICE_TABLE_CONFIG.arena.containmentPadding;
  const playableQuadrilateral = insetQuadrilateral(screenBoundary, centerInset);

  return {
    aspect,
    aspectKey: aspect.toFixed(DICE_TABLE_CONFIG.arena.aspectKeyPrecision),
    camera,
    screenBoundary,
    playableQuadrilateral,
    walls: buildWalls(screenBoundary),
    floor: {
      center: [
        0,
        -DICE_TABLE_CONFIG.arena.floorThickness / 2,
        0,
      ],
      halfExtents: [
        DICE_TABLE_CONFIG.arena.floorHalfExtent,
        DICE_TABLE_CONFIG.arena.floorThickness / 2,
        DICE_TABLE_CONFIG.arena.floorHalfExtent,
      ],
    },
    visualFloor: createVisualFloor(screenBoundary),
    recoveryBounds: {
      minimumY: DICE_TABLE_CONFIG.arena.recoveryMinimumY,
    },
    shadowBounds: createShadowBounds(screenBoundary),
  };
}

export function getArenaLayout(width: number, height: number): ArenaLayout {
  if (width <= 0 || height <= 0) {
    throw new Error('The dice table viewport must have a positive size.');
  }
  return createArenaLayout(width / height);
}

export function normalizedToWorld(
  layout: ArenaLayout,
  position: Pick<NormalizedTablePosition, 'u' | 'v'>,
): ArenaPoint {
  const [topLeft, topRight, bottomRight, bottomLeft] =
    layout.playableQuadrilateral;
  const top = {
    x: topLeft.x + (topRight.x - topLeft.x) * position.u,
    z: topLeft.z + (topRight.z - topLeft.z) * position.u,
  };
  const bottom = {
    x: bottomLeft.x + (bottomRight.x - bottomLeft.x) * position.u,
    z: bottomLeft.z + (bottomRight.z - bottomLeft.z) * position.u,
  };
  return {
    x: top.x + (bottom.x - top.x) * position.v,
    z: top.z + (bottom.z - top.z) * position.v,
  };
}

export function worldToNormalized(
  layout: ArenaLayout,
  point: ArenaPoint,
): NormalizedTablePosition {
  const [topLeft, topRight, bottomRight, bottomLeft] =
    layout.playableQuadrilateral;
  const depth = bottomLeft.z - topLeft.z;
  const v = Math.abs(depth) < 1e-9 ? 0.5 : (point.z - topLeft.z) / depth;
  const leftX = topLeft.x + (bottomLeft.x - topLeft.x) * v;
  const rightX = topRight.x + (bottomRight.x - topRight.x) * v;
  const width = rightX - leftX;
  const u = Math.abs(width) < 1e-9 ? 0.5 : (point.x - leftX) / width;
  return new NormalizedTablePosition({ u, v });
}

export function clampNormalizedPosition(
  position: Pick<NormalizedTablePosition, 'u' | 'v'>,
): NormalizedTablePosition {
  return new NormalizedTablePosition({
    u: Math.min(1, Math.max(0, position.u)),
    v: Math.min(1, Math.max(0, position.v)),
  });
}

export function isWorldPositionInsideArena(
  layout: ArenaLayout,
  point: ArenaPoint,
): boolean {
  return layout.playableQuadrilateral.every((start, index, boundary) => {
    const end = boundary[(index + 1) % boundary.length];
    const normal = inwardNormal(start, end);
    return (point.x - start.x) * normal.x +
      (point.z - start.z) * normal.z >= -1e-7;
  });
}

export function containArenaMotion(
  layout: ArenaLayout,
  sourcePosition: VectorLike,
  sourceVelocity: VectorLike,
): ContainedMotion {
  const position = { ...sourcePosition };
  const velocity = { ...sourceVelocity };
  let corrected = false;

  layout.playableQuadrilateral.forEach((start, index, boundary) => {
    const end = boundary[(index + 1) % boundary.length];
    const normal = inwardNormal(start, end);
    const signedDistance = (position.x - start.x) * normal.x +
      (position.z - start.z) * normal.z;
    if (signedDistance >= 0) {
      return;
    }

    corrected = true;
    const correction = -signedDistance +
      DICE_TABLE_CONFIG.arena.containmentPadding;
    position.x += normal.x * correction;
    position.z += normal.z * correction;

    const normalSpeed = velocity.x * normal.x + velocity.z * normal.z;
    const tangentX = velocity.x - normal.x * normalSpeed;
    const tangentZ = velocity.z - normal.z * normalSpeed;
    velocity.x = tangentX * DICE_TABLE_CONFIG.arena.tangentVelocity +
      normal.x * Math.abs(normalSpeed) *
        DICE_TABLE_CONFIG.arena.reflectedVelocity;
    velocity.z = tangentZ * DICE_TABLE_CONFIG.arena.tangentVelocity +
      normal.z * Math.abs(normalSpeed) *
        DICE_TABLE_CONFIG.arena.reflectedVelocity;
  });

  if (position.y < layout.recoveryBounds.minimumY) {
    corrected = true;
    position.y = DICE_TABLE_CONFIG.die.dragHeight;
    velocity.y = Math.abs(velocity.y) *
      DICE_TABLE_CONFIG.arena.reflectedVelocity;
  }

  return { position, velocity, corrected };
}
