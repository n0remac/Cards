import { describe, expect, it } from 'vitest';
import {
  TableBounds,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  CAMERA_MINIMUM_DISTANCE,
  boundsForTransforms,
  clampCameraTarget,
  fitTableView,
  zoomAroundAnchor,
} from './cameraModel';

const bounds = new TableBounds({ minX: -8, maxX: 8, minZ: -6, maxZ: 6 });

describe('table camera model', () => {
  it('fits larger tables farther away and accounts for aspect ratio', () => {
    const wide = fitTableView(bounds, 2);
    const narrow = fitTableView(bounds, 0.5);
    expect(narrow.distance).toBeGreaterThan(wide.distance);
    expect(wide.target).toEqual({ x: 0, z: 0 });
  });

  it('clamps panning and cursor-anchored zoom to canonical bounds', () => {
    expect(clampCameraTarget({ x: 20, z: -20 }, bounds))
      .toEqual({ x: 8, z: -6 });
    const zoomed = zoomAroundAnchor(
      { target: { x: 0, z: 0 }, distance: 20 },
      { x: 4, z: 0 },
      0.5,
      40,
      bounds,
    );
    expect(zoomed.distance).toBe(CAMERA_MINIMUM_DISTANCE);
    expect(zoomed.target.x).toBe(2);
  });

  it('derives a padded focus box from absolute world transforms', () => {
    const focus = boundsForTransforms([
      new WorldTransform({ position: new WorldVector3({ x: -2, z: 3 }) }),
      new WorldTransform({ position: new WorldVector3({ x: 4, z: 7 }) }),
    ], 1);
    expect(focus).toMatchObject({ minX: -3, maxX: 5, minZ: 2, maxZ: 8 });
  });
});
