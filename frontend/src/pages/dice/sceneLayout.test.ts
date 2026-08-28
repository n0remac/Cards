import { describe, expect, it } from 'vitest';
import {
  CAMERA_DESKTOP_FOV,
  CAMERA_DESKTOP_POSITION,
  CAMERA_MOBILE_FOV,
  CAMERA_MOBILE_POSITION,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
  TRAY_WALL_THICKNESS,
} from './constants';
import { getDiceCameraLayout } from './sceneLayout';

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
  ])('frames the enlarged tray on $name', ({
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
});
