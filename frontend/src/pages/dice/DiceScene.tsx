import React, { MutableRefObject, Suspense, useCallback, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import {
  CuboidCollider,
  Physics,
  RapierRigidBody,
  RigidBody,
  useAfterPhysicsStep,
} from '@react-three/rapier';
import { PerspectiveCamera } from 'three';
import { RollSpec } from '../../rpc/proto/dice/v1/dice_pb';
import {
  CAMERA_DESKTOP_FOV,
  CAMERA_DESKTOP_POSITION,
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
import { advanceRollSettling, getUpwardFace, isOutsideTray } from './diceMath';
import { applyThrowToBody, Die } from './Die';
import { createEscapeRecovery, RollSettledEvent } from './rollModel';
import { getDiceCameraLayout } from './sceneLayout';

type DiceSceneProps = {
  activeSpec?: RollSpec;
  onSettled: (event: RollSettledEvent) => void;
  onReady: () => void;
  onWebGLUnavailable: () => void;
};

function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    if (!(camera instanceof PerspectiveCamera)) {
      return;
    }
    const layout = getDiceCameraLayout(size.width, size.height);
    camera.position.set(...layout.position);
    camera.fov = layout.fov;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
}

type BodyRegistry = MutableRefObject<Map<string, RapierRigidBody>>;

function bodyKey(rollId: number, dieIndex: number): string {
  return `${rollId}:${dieIndex}`;
}

type RollSettlingObserverProps = {
  activeSpec?: RollSpec;
  bodies: BodyRegistry;
  onSettled: (event: RollSettledEvent) => void;
};

function RollSettlingObserver({
  activeSpec,
  bodies,
  onSettled,
}: RollSettlingObserverProps) {
  const observedRollIdRef = useRef<number>();
  const reportedRollIdRef = useRef<number>();
  const stableStepsRef = useRef(0);

  useAfterPhysicsStep(() => {
    if (!activeSpec) {
      observedRollIdRef.current = undefined;
      reportedRollIdRef.current = undefined;
      stableStepsRef.current = 0;
      return;
    }

    if (observedRollIdRef.current !== activeSpec.rollId) {
      observedRollIdRef.current = activeSpec.rollId;
      reportedRollIdRef.current = undefined;
      stableStepsRef.current = 0;
    }
    if (reportedRollIdRef.current === activeSpec.rollId) {
      return;
    }

    const rollBodies: Array<{
      throwSpec: RollSpec['dice'][number];
      body: RapierRigidBody;
    }> = [];
    for (const throwSpec of activeSpec.dice) {
      const body = bodies.current.get(
        bodyKey(activeSpec.rollId, throwSpec.dieIndex),
      );
      if (!body) {
        stableStepsRef.current = 0;
        return;
      }
      rollBodies.push({ throwSpec, body });
    }

    let recovered = false;
    for (const { body, throwSpec } of rollBodies) {
      const position = body.translation();
      if (isOutsideTray(position)) {
        applyThrowToBody(body, createEscapeRecovery(throwSpec, position));
        recovered = true;
      }
    }
    if (recovered) {
      stableStepsRef.current = 0;
      return;
    }

    const progress = advanceRollSettling(
      stableStepsRef.current,
      rollBodies.map(({ body }) => ({
        linearVelocity: body.linvel(),
        angularVelocity: body.angvel(),
      })),
    );
    stableStepsRef.current = progress.stableSteps;
    if (!progress.settled) {
      return;
    }

    reportedRollIdRef.current = activeSpec.rollId;
    onSettled({
      rollId: activeSpec.rollId,
      dice: rollBodies.map(({ body, throwSpec }) => ({
        dieIndex: throwSpec.dieIndex,
        value: getUpwardFace(body.rotation()),
      })),
    });
  });

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
            TRAY_HALF_WIDTH * 2 + TRAY_WALL_THICKNESS * 2,
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
          args={[
            TRAY_HALF_WIDTH + TRAY_WALL_THICKNESS,
            wallY,
            wallHalfThickness,
          ]}
          position={[0, wallY, -TRAY_HALF_DEPTH - wallHalfThickness]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
        <CuboidCollider
          args={[
            TRAY_HALF_WIDTH + TRAY_WALL_THICKNESS,
            wallY,
            wallHalfThickness,
          ]}
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
  const bodies = useRef<Map<string, RapierRigidBody>>(new Map());
  const registerBody = useCallback(
    (rollId: number, dieIndex: number, body: RapierRigidBody) => {
      bodies.current.set(bodyKey(rollId, dieIndex), body);
    },
    [],
  );
  const unregisterBody = useCallback(
    (rollId: number, dieIndex: number, body: RapierRigidBody) => {
      const key = bodyKey(rollId, dieIndex);
      if (bodies.current.get(key) === body) {
        bodies.current.delete(key);
      }
    },
    [],
  );

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{
        position: [...CAMERA_DESKTOP_POSITION],
        fov: CAMERA_DESKTOP_FOV,
        near: 0.1,
        far: 100,
      }}
      gl={{ antialias: true }}
      fallback={<WebGLFallback onUnavailable={onWebGLUnavailable} />}
    >
      <color attach="background" args={['#171b1a']} />
      <fog attach="fog" args={['#171b1a', 34, 52]} />
      <ResponsiveCamera />
      <hemisphereLight color="#fff4dc" groundColor="#1b1511" intensity={1.15} />
      <directionalLight
        castShadow
        position={[-6, 25, 7]}
        intensity={2.2}
        color="#ffe5bd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-11}
        shadow-camera-right={11}
        shadow-camera-top={11}
        shadow-camera-bottom={-11}
      />
      <Suspense fallback={null}>
        <Physics
          gravity={[...GRAVITY]}
          timeStep={PHYSICS_TIMESTEP}
          colliders={false}
        >
          <PhysicsReady onReady={onReady} />
          <DiceTray />
          <RollSettlingObserver
            activeSpec={activeSpec}
            bodies={bodies}
            onSettled={onSettled}
          />
          {activeSpec?.dice.map((die) => (
            <Die
              key={`${activeSpec.rollId}:${die.dieIndex}`}
              rollId={activeSpec.rollId}
              throwSpec={die}
              onBodyReady={registerBody}
              onBodyRemoved={unregisterBody}
            />
          ))}
        </Physics>
      </Suspense>
    </Canvas>
  );
}
