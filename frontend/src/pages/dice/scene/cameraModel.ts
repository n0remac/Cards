import {
  TableBounds,
  WorldTransform,
} from '../../../rpc/proto/dice/v1/dice_pb';

export type TableCameraTarget = { x: number; z: number };
export type TableCameraView = { target: TableCameraTarget; distance: number };

export const CAMERA_FOV_DEGREES = 42;
export const CAMERA_MINIMUM_DISTANCE = 10;

export function clampCameraTarget(
  target: TableCameraTarget,
  bounds: TableBounds,
): TableCameraTarget {
  return {
    x: Math.min(bounds.maxX, Math.max(bounds.minX, target.x)),
    z: Math.min(bounds.maxZ, Math.max(bounds.minZ, target.z)),
  };
}

export function fitTableView(
  bounds: TableBounds,
  aspect: number,
): TableCameraView {
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const depth = Math.max(1, bounds.maxZ - bounds.minZ);
  const visibleSpan = Math.max(width / safeAspect, depth * 1.35);
  const fov = CAMERA_FOV_DEGREES * Math.PI / 180;
  return {
    target: {
      x: (bounds.minX + bounds.maxX) / 2,
      z: (bounds.minZ + bounds.maxZ) / 2,
    },
    distance: Math.max(
      CAMERA_MINIMUM_DISTANCE,
      visibleSpan / (2 * Math.tan(fov / 2)) * 1.15,
    ),
  };
}

export function boundsForTransforms(
  transforms: readonly WorldTransform[],
  padding = 2.5,
): TableBounds | undefined {
  const positions = transforms.flatMap((transform) =>
    transform.position ? [transform.position] : []);
  if (positions.length === 0) return undefined;
  return new TableBounds({
    minX: Math.min(...positions.map(({ x }) => x)) - padding,
    maxX: Math.max(...positions.map(({ x }) => x)) + padding,
    minZ: Math.min(...positions.map(({ z }) => z)) - padding,
    maxZ: Math.max(...positions.map(({ z }) => z)) + padding,
  });
}

export function zoomAroundAnchor(
  view: TableCameraView,
  anchor: TableCameraTarget,
  factor: number,
  maximumDistance: number,
  bounds: TableBounds,
): TableCameraView {
  const distance = Math.min(
    maximumDistance,
    Math.max(CAMERA_MINIMUM_DISTANCE, view.distance * factor),
  );
  const appliedFactor = distance / view.distance;
  return {
    distance,
    target: clampCameraTarget({
      x: anchor.x + (view.target.x - anchor.x) * appliedFactor,
      z: anchor.z + (view.target.z - anchor.z) * appliedFactor,
    }, bounds),
  };
}

export function panCamera(
  view: TableCameraView,
  delta: TableCameraTarget,
  bounds: TableBounds,
): TableCameraView {
  return {
    ...view,
    target: clampCameraTarget({
      x: view.target.x + delta.x,
      z: view.target.z + delta.z,
    }, bounds),
  };
}
