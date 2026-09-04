import { beforeAll, describe, expect, it } from 'vitest';
import RAPIER from '@dimforge/rapier3d-compat';
import {
  createArenaLayout,
  isWorldPositionInsideArena,
  normalizedToWorld,
  worldToNormalized,
} from './arenaLayout';
import { DICE_TABLE_CONFIG } from '../constants';
import { collectChangedPlacements } from './reconciliation';

beforeAll(async () => {
  await RAPIER.init();
});

function addArenaWalls(world: RAPIER.World, aspect = 390 / 844) {
  const layout = createArenaLayout(aspect);
  for (const wall of layout.walls) {
    const angle = wall.rotation[1];
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(
        wall.halfLength + DICE_TABLE_CONFIG.arena.wallThickness,
        DICE_TABLE_CONFIG.arena.wallHeight / 2,
        DICE_TABLE_CONFIG.arena.wallThickness / 2,
      ).setTranslation(...wall.center).setRotation({
        x: 0,
        y: Math.sin(angle / 2),
        z: 0,
        w: Math.cos(angle / 2),
      }),
    );
  }
  return layout;
}

describe('Rapier dice table integration', () => {
  it('keeps a CCD die behind all four viewport-edge walls', () => {
    for (let wallIndex = 0; wallIndex < 4; wallIndex += 1) {
      const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
      const layout = addArenaWalls(world);
      const wall = layout.walls[wallIndex];
      const midpoint = {
        x: (wall.start.x + wall.end.x) / 2,
        z: (wall.start.z + wall.end.z) / 2,
      };
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(
            midpoint.x + wall.inwardNormal.x * 2,
            DICE_TABLE_CONFIG.die.colliderHalfExtent,
            midpoint.z + wall.inwardNormal.z * 2,
          )
          .setLinvel(
            -wall.inwardNormal.x * 55,
            0,
            -wall.inwardNormal.z * 55,
          )
          .setCcdEnabled(true),
      );
      world.createCollider(RAPIER.ColliderDesc.cuboid(
        DICE_TABLE_CONFIG.die.colliderHalfExtent,
        DICE_TABLE_CONFIG.die.colliderHalfExtent,
        DICE_TABLE_CONFIG.die.colliderHalfExtent,
      ), body);
      for (let step = 0; step < 45; step += 1) {
        world.step();
      }
      expect(isWorldPositionInsideArena(layout, body.translation())).toBe(true);
      world.free();
    }
  });

  it('supports rolling, held, and rotation-locked settled body modes', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic().setTranslation(0, 1, 0),
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.48, 0.48, 0.48), body);

    body.setAngvel({ x: 4, y: 3, z: 2 }, true);
    world.step();
    expect(body.rotation().w).not.toBeCloseTo(1, 5);

    body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    body.setNextKinematicTranslation({ x: 2, y: 0.58, z: 3 });
    world.step();
    expect(body.translation().x).toBeCloseTo(2);
    expect(body.translation().z).toBeCloseTo(3);

    body.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
    body.setEnabledRotations(false, false, false, true);
    body.applyTorqueImpulse({ x: 10, y: 10, z: 10 }, true);
    for (let step = 0; step < 10; step += 1) {
      world.step();
    }
    expect(body.rotation()).toMatchObject({ x: 0, y: 0, z: 0, w: 1 });
    world.free();
  });

  it('reports a rotation-locked settled die displaced by a rolling collision', () => {
    const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
    const layout = createArenaLayout(0.5);
    const settledStart = normalizedToWorld(layout, { u: 0.5, v: 0.5 });
    const rollingStart = { x: settledStart.x - 3, z: settledStart.z };
    const settled = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(settledStart.x, 0.48, settledStart.z)
        .enabledRotations(false, false, false),
    );
    const rolling = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(rollingStart.x, 0.48, rollingStart.z)
        .setLinvel(18, 0, 0)
        .setCcdEnabled(true),
    );
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.48, 0.48, 0.48), settled);
    world.createCollider(RAPIER.ColliderDesc.cuboid(0.48, 0.48, 0.48), rolling);
    for (let step = 0; step < 35; step += 1) {
      world.step();
    }

    const changed = collectChangedPlacements(
      layout,
      new Set(['rolling']),
      {
        settled: worldToNormalized(layout, settledStart),
        rolling: worldToNormalized(layout, rollingStart),
      },
      new Map([
        ['settled', settled.translation()],
        ['rolling', rolling.translation()],
      ]),
    );
    expect(changed.map(({ dieId }) => dieId)).toContain('settled');
    expect(settled.rotation()).toMatchObject({ x: 0, y: 0, z: 0, w: 1 });
    world.free();
  });
});
