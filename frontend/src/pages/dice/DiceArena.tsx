import React, { useEffect } from 'react';
import { CuboidCollider, RigidBody } from '@react-three/rapier';
import { useThree } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { ArenaLayout } from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';

export function ResponsiveArenaCamera({ layout }: { layout: ArenaLayout }) {
  const { camera } = useThree();

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }
    camera.position.set(...layout.camera.position);
    camera.fov = layout.camera.fov;
    camera.aspect = layout.aspect;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, layout]);

  return null;
}

export function DiceArena({ layout }: { layout: ArenaLayout }) {
  const { arena, physics } = DICE_TABLE_CONFIG;
  return (
    <group>
      <mesh position={layout.floor.center} receiveShadow>
        <boxGeometry args={layout.floor.halfExtents.map(
          (halfExtent) => halfExtent * 2,
        ) as [number, number, number]} />
        <meshStandardMaterial color="#1d6847" roughness={0.96} />
      </mesh>

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={layout.floor.halfExtents}
          position={layout.floor.center}
          friction={physics.friction}
          restitution={physics.restitution}
        />
      </RigidBody>

      <RigidBody key={layout.aspectKey} type="fixed" colliders={false}>
        {layout.walls.map((wall, index) => (
          <CuboidCollider
            key={index}
            args={[
              wall.halfLength + arena.wallThickness,
              arena.wallHeight / 2,
              arena.wallThickness / 2,
            ]}
            position={wall.center}
            rotation={wall.rotation}
            friction={physics.friction}
            restitution={physics.restitution}
          />
        ))}
      </RigidBody>
    </group>
  );
}
