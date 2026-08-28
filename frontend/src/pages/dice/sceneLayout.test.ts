import { describe, expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import {
  CAMERA_DESKTOP_FOV,
  CAMERA_DESKTOP_POSITION,
  CAMERA_MOBILE_FOV,
  CAMERA_MOBILE_POSITION,
  TABLE_HALF_EXTENT,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
  TRAY_WALL_THICKNESS,
} from './constants';
import { getDiceCameraLayout, getTableBoundary } from './sceneLayout';

function visibleHalfSpans(
  position: readonly [number, number, number],
  fov: number,
  aspect: number,
) {
  const distance = Math.hypot(...position);
  const vertical = distance * Math.tan((fov * Math.PI) / 360);
  return { horizontal: vertical * aspect, vertical };
}

describe('getDiceCameraLayout', () => {
  it.each([
    {
      name: 'desktop',
      width: 1440,
      height: 700,
      expectedPosition: CAMERA_DESKTOP_POSITION,
      expectedFov: CAMERA_DESKTOP_FOV,
    },
    {
      name: 'mobile',
      width: 390,
      height: 520,
      expectedPosition: CAMERA_MOBILE_POSITION,
      expectedFov: CAMERA_MOBILE_FOV,
    },
  ])('frames the initial dice area on $name', ({
    width,
    height,
    expectedPosition,
    expectedFov,
  }) => {
    const layout = getDiceCameraLayout(width, height);
    const spans = visibleHalfSpans(layout.position, layout.fov, width / height);

    expect(layout.position).toEqual([...expectedPosition]);
    expect(layout.fov).toBe(expectedFov);
    expect(spans.horizontal).toBeGreaterThan(
      TRAY_HALF_WIDTH + TRAY_WALL_THICKNESS,
    );
    expect(spans.vertical).toBeGreaterThan(
      TRAY_HALF_DEPTH + TRAY_WALL_THICKNESS,
    );
  });

  it('keeps the initial dice area visible on extra-tall phones', () => {
    const width = 320;
    const height = 860;
    const layout = getDiceCameraLayout(width, height);
    const spans = visibleHalfSpans(layout.position, layout.fov, width / height);

    expect(layout.position[1]).toBeGreaterThan(CAMERA_MOBILE_POSITION[1]);
    expect(spans.horizontal).toBeGreaterThan(
      TRAY_HALF_WIDTH + TRAY_WALL_THICKNESS,
    );
  });

  it.each([
    { name: 'portrait', width: 390, height: 700 },
    { name: 'landscape', width: 1200, height: 620 },
  ])('projects the physics boundary onto every $name screen edge', ({
    width,
    height,
  }) => {
    const layout = getDiceCameraLayout(width, height);
    const camera = new PerspectiveCamera(layout.fov, width / height, 0.1, 100);
    camera.position.set(...layout.position);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);

    const expectedCorners = [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ] as const;

    getTableBoundary(width, height).forEach((point, index) => {
      const projected = new Vector3(point.x, 0, point.z).project(camera);
      expect(projected.x).toBeCloseTo(expectedCorners[index][0], 5);
      expect(projected.y).toBeCloseTo(expectedCorners[index][1], 5);
      expect(Math.abs(point.x)).toBeLessThan(TABLE_HALF_EXTENT);
      expect(Math.abs(point.z)).toBeLessThan(TABLE_HALF_EXTENT);
    });
  });
});
