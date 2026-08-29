import { describe, expect, it } from 'vitest';
import { DirectionalLight, PerspectiveCamera, Vector3 } from 'three';
import {
  containArenaMotion,
  createArenaLayout,
  getArenaLayout,
  isWorldPositionInsideArena,
  normalizedToWorld,
  worldToNormalized,
} from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';

const viewports = [
  { name: 'portrait', width: 390, height: 844 },
  { name: 'extra-tall', width: 320, height: 920 },
  { name: 'compact', width: 360, height: 560 },
  { name: 'landscape', width: 844, height: 390 },
] as const;

describe('ArenaLayout', () => {
  it.each(viewports)('projects all four walls onto the $name visual edge', ({
    width,
    height,
  }) => {
    const layout = getArenaLayout(width, height);
    const camera = new PerspectiveCamera(layout.camera.fov, width / height, 0.1, 160);
    camera.position.set(...layout.camera.position);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    const expected = [[-1, 1], [1, 1], [1, -1], [-1, -1]] as const;

    layout.screenBoundary.forEach((point, index) => {
      const projected = new Vector3(point.x, 0, point.z).project(camera);
      expect(projected.x).toBeCloseTo(expected[index][0], 5);
      expect(projected.y).toBeCloseTo(expected[index][1], 5);
    });
    expect(layout.walls).toHaveLength(4);
    expect(DICE_TABLE_CONFIG.arena.wallHeight).toBeLessThan(2);
  });

  it('uses one layout key for equivalent pixel sizes', () => {
    expect(getArenaLayout(390, 844).aspectKey)
      .toBe(getArenaLayout(780, 1688).aspectKey);
  });

  it('keeps the floor collider static while wall layouts respond to aspect', () => {
    const portrait = getArenaLayout(390, 844);
    const landscape = getArenaLayout(844, 390);
    expect(portrait.floor).toEqual(landscape.floor);
    expect(portrait.aspectKey).not.toBe(landscape.aspectKey);
    expect(portrait.walls).not.toEqual(landscape.walls);
  });

  it('remaps settled positions across orientation changes without a center reset', () => {
    const portrait = getArenaLayout(390, 844);
    const landscape = getArenaLayout(844, 390);
    const canonical = { u: 0.86, v: 0.18 };
    const portraitWorld = normalizedToWorld(portrait, canonical);
    const landscapeWorld = normalizedToWorld(landscape, canonical);
    expect(worldToNormalized(landscape, landscapeWorld).u).toBeCloseTo(0.86);
    expect(worldToNormalized(landscape, landscapeWorld).v).toBeCloseTo(0.18);
    expect(landscapeWorld.x).not.toBeCloseTo(portraitWorld.x);
    expect(landscapeWorld.x).not.toBeCloseTo(0);
  });

  it.each(viewports)('round-trips normalized positions on $name', ({ width, height }) => {
    const layout = getArenaLayout(width, height);
    for (let u = 0; u <= 1; u += 0.1) {
      for (let v = 0; v <= 1; v += 0.1) {
        const world = normalizedToWorld(layout, { u, v });
        const roundTrip = worldToNormalized(layout, world);
        expect(roundTrip.u).toBeCloseTo(u, 5);
        expect(roundTrip.v).toBeCloseTo(v, 5);
        expect(isWorldPositionInsideArena(layout, world)).toBe(true);
      }
    }
  });

  it.each(viewports)('keeps every configured spawn inside $name', ({ width, height }) => {
    const layout = getArenaLayout(width, height);
    for (const [u, v] of DICE_TABLE_CONFIG.roll.normalizedSpawnSlots) {
      expect(isWorldPositionInsideArena(
        layout,
        normalizedToWorld(layout, { u, v }),
      )).toBe(true);
    }
  });

  it.each(viewports)(
    'covers the visible $name table and airborne dice with the shadow camera',
    ({ width, height }) => {
      const layout = getArenaLayout(width, height);
      const light = new DirectionalLight();
      light.position.set(...DICE_TABLE_CONFIG.lighting.directionalPosition);
      light.target.position.set(0, 0, 0);
      light.updateMatrixWorld(true);
      light.target.updateMatrixWorld(true);
      Object.assign(light.shadow.camera, layout.shadowBounds);
      light.shadow.camera.updateProjectionMatrix();
      light.shadow.updateMatrices(light);
      const maximumCasterHeight = DICE_TABLE_CONFIG.roll.spawnHeightMaximum +
        DICE_TABLE_CONFIG.die.size / 2;

      for (const { x, z } of layout.screenBoundary) {
        for (const y of [0, maximumCasterHeight]) {
          const point = new Vector3(x, y, z).applyMatrix4(
            light.shadow.camera.matrixWorldInverse,
          );
          expect(point.x).toBeGreaterThanOrEqual(layout.shadowBounds.left);
          expect(point.x).toBeLessThanOrEqual(layout.shadowBounds.right);
          expect(point.y).toBeGreaterThanOrEqual(layout.shadowBounds.bottom);
          expect(point.y).toBeLessThanOrEqual(layout.shadowBounds.top);
        }
      }
    },
  );

  it('projects escapes just inside each nearest wall and reflects velocity', () => {
    const layout = createArenaLayout(390 / 844);
    for (const wall of layout.walls) {
      const midpoint = {
        x: (wall.start.x + wall.end.x) / 2,
        z: (wall.start.z + wall.end.z) / 2,
      };
      const escaped = {
        x: midpoint.x - wall.inwardNormal.x,
        y: 1,
        z: midpoint.z - wall.inwardNormal.z,
      };
      const velocity = {
        x: -wall.inwardNormal.x * 8,
        y: 0,
        z: -wall.inwardNormal.z * 8,
      };
      const corrected = containArenaMotion(layout, escaped, velocity);
      expect(corrected.corrected).toBe(true);
      expect(isWorldPositionInsideArena(layout, corrected.position)).toBe(true);
      expect(corrected.velocity.x * wall.inwardNormal.x +
        corrected.velocity.z * wall.inwardNormal.z).toBeGreaterThan(0);
    }
  });

  it('recovers a fallen die at its edge-relative x/z instead of the center', () => {
    const layout = createArenaLayout(0.5);
    const nearEdge = normalizedToWorld(layout, { u: 0.9, v: 0.8 });
    const corrected = containArenaMotion(
      layout,
      { ...nearEdge, y: layout.recoveryBounds.minimumY - 1 },
      { x: 0, y: -5, z: 0 },
    );
    expect(corrected.position.x).toBeCloseTo(nearEdge.x);
    expect(corrected.position.z).toBeCloseTo(nearEdge.z);
    expect(corrected.position.y).toBe(DICE_TABLE_CONFIG.die.dragHeight);
  });
});
