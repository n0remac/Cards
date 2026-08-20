import React, { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  CuboidCollider,
  Physics,
  RigidBody,
} from '@react-three/rapier';
import { PerspectiveCamera } from 'three';
import { RollSpec } from '../../rpc/proto/dice/v1/dice_pb';
import {
  FRICTION,
  GRAVITY,
  PHYSICS_TIMESTEP,
  RESTITUTION,
  TRAY_FLOOR_THICKNESS,
  TRAY_HALF_DEPTH,
  TRAY_HALF_WIDTH,
  TRAY_WALL_HEIGHT,
  TRAY_WALL_THICKNESS,
} from './constants';
import { Die } from './Die';
import { DieSettledEvent } from './rollModel';

type DiceSceneProps = {
  activeSpec?: RollSpec;
  onSettled: (event: DieSettledEvent) => void;
  onReady: () => void;
  onWebGLUnavailable: () => void;
};

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }
    const narrow = size.width / size.height < 0.9;
    camera.position.set(0, narrow ? 14 : 10.5, narrow ? 14 : 10);
    camera.fov = narrow ? 48 : 42;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

function PhysicsReady({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function WebGLFallback({ onUnavailable }: { onUnavailable: () => void }) {
  useEffect(() => onUnavailable(), [onUnavailable]);
  return (
    <div className="grid h-full place-items-center bg-[#171b1a] px-6 text-center text-stone-200">
      This browser could not create the WebGL scene. The dice roller requires WebGL.
    </div>
  );
}

function DiceTray() {
  const floorY = -TRAY_FLOOR_THICKNESS / 2;
  const wallY = TRAY_WALL_HEIGHT / 2;
  const wallHalfThickness = TRAY_WALL_THICKNESS / 2;

  return (
    <group>
      <mesh position={[0, floorY - 0.12, 0]} receiveShadow>
        <boxGeometry args={[
          TRAY_HALF_WIDTH * 2 + TRAY_WALL_THICKNESS * 2,
          TRAY_FLOOR_THICKNESS,
          TRAY_HALF_DEPTH * 2 + TRAY_WALL_THICKNESS * 2,
        ]} />
        <meshStandardMaterial color="#3a2014" roughness={0.64} />
      </mesh>
      <mesh position={[0, floorY + 0.015, 0]} receiveShadow>
        <boxGeometry args={[
          TRAY_HALF_WIDTH * 2,
          TRAY_FLOOR_THICKNESS,
          TRAY_HALF_DEPTH * 2,
        ]} />
        <meshStandardMaterial color="#234f3a" roughness={0.94} />
      </mesh>

      {[-1, 1].map((direction) => (
        <mesh
          key={`x-wall-${direction}`}
          position={[
            direction * (TRAY_HALF_WIDTH + wallHalfThickness),
            wallY,
            0,
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[
            TRAY_WALL_THICKNESS,
            TRAY_WALL_HEIGHT,
            TRAY_HALF_DEPTH * 2 + TRAY_WALL_THICKNESS * 2,
          ]} />
          <meshStandardMaterial color="#4b2817" roughness={0.48} />
        </mesh>
      ))}
      {[-1, 1].map((direction) => (
        <mesh
          key={`z-wall-${direction}`}
          position={[
            0,
            wallY,
            direction * (TRAY_HALF_DEPTH + wallHalfThickness),
          ]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[
            TRAY_HALF_WIDTH * 2,
            TRAY_WALL_HEIGHT,
            TRAY_WALL_THICKNESS,
          ]} />
          <meshStandardMaterial color="#4b2817" roughness={0.48} />
        </mesh>
      ))}

      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[TRAY_HALF_WIDTH, TRAY_FLOOR_THICKNESS / 2, TRAY_HALF_DEPTH]}
          position={[0, floorY, 0]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
        <CuboidCollider
          args={[wallHalfThickness, wallY, TRAY_HALF_DEPTH + TRAY_WALL_THICKNESS]}
          position={[-TRAY_HALF_WIDTH - wallHalfThickness, wallY, 0]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
        <CuboidCollider
          args={[wallHalfThickness, wallY, TRAY_HALF_DEPTH + TRAY_WALL_THICKNESS]}
          position={[TRAY_HALF_WIDTH + wallHalfThickness, wallY, 0]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
        <CuboidCollider
          args={[TRAY_HALF_WIDTH, wallY, wallHalfThickness]}
          position={[0, wallY, -TRAY_HALF_DEPTH - wallHalfThickness]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
        <CuboidCollider
          args={[TRAY_HALF_WIDTH, wallY, wallHalfThickness]}
          position={[0, wallY, TRAY_HALF_DEPTH + wallHalfThickness]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
      </RigidBody>
    </group>
  );
}

export function DiceScene({
  activeSpec,
  onSettled,
  onReady,
  onWebGLUnavailable,
}: DiceSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 10.5, 10], fov: 42, near: 0.1, far: 100 }}
      gl={{ antialias: true }}
      fallback={<WebGLFallback onUnavailable={onWebGLUnavailable} />}
    >
      <color attach="background" args={['#171b1a']} />
      <fog attach="fog" args={['#171b1a', 16, 30]} />
      <ResponsiveCamera />
      <hemisphereLight color="#fff4dc" groundColor="#1b1511" intensity={1.15} />
      <directionalLight
        castShadow
        position={[-4, 11, 5]}
        intensity={2.2}
        color="#ffe5bd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      <Suspense fallback={null}>
        <Physics
          gravity={[...GRAVITY]}
          timeStep={PHYSICS_TIMESTEP}
          colliders={false}
        >
          <PhysicsReady onReady={onReady} />
          <DiceTray />
          {activeSpec?.dice.map((die) => (
            <Die
              key={die.dieIndex}
              rollId={activeSpec.rollId}
              throwSpec={die}
              onSettled={onSettled}
            />
          ))}
        </Physics>
      </Suspense>
    </Canvas>
  );
}
