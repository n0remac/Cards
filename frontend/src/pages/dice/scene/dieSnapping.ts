export type TablePosition = { x: number; z: number };

const EDGE_DIRECTIONS = [
  { x: 1, z: 0 },
  { x: -1, z: 0 },
  { x: 0, z: 1 },
  { x: 0, z: -1 },
] as const;

function overlapsDie(
  position: TablePosition,
  target: TablePosition,
  dieWidth: number,
): boolean {
  return Math.abs(position.x - target.x) < dieWidth - 1e-7 &&
    Math.abs(position.z - target.z) < dieWidth - 1e-7;
}

export function snapToAdjacentDie(
  position: TablePosition,
  targetPositions: readonly TablePosition[],
  dieWidth: number,
): TablePosition {
  const snapDistance = dieWidth / 2;
  let closestPosition = position;
  let closestDistanceSquared = Number.POSITIVE_INFINITY;

  targetPositions.forEach((target, targetIndex) => {
    EDGE_DIRECTIONS.forEach((direction) => {
      const candidate = {
        x: target.x + direction.x * dieWidth,
        z: target.z + direction.z * dieWidth,
      };
      const deltaX = Math.abs(position.x - candidate.x);
      const deltaZ = Math.abs(position.z - candidate.z);
      if (deltaX > snapDistance || deltaZ > snapDistance ||
          targetPositions.some((otherTarget, otherIndex) =>
            otherIndex !== targetIndex &&
            overlapsDie(candidate, otherTarget, dieWidth))) {
        return;
      }

      const distanceSquared = deltaX * deltaX + deltaZ * deltaZ;
      if (distanceSquared < closestDistanceSquared) {
        closestPosition = candidate;
        closestDistanceSquared = distanceSquared;
      }
    });
  });

  return closestPosition;
}
