import React, {
  MutableRefObject,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
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
  TABLE_HALF_EXTENT,
  TRAY_FLOOR_THICKNESS,
  TRAY_WALL_COLLIDER_HEIGHT,
  TRAY_WALL_THICKNESS,
} from './constants';
import { advanceRollSettling, getUpwardFace, isOutsideTray } from './diceMath';
import { applyThrowToBody, Die } from './Die';
import { createEscapeRecovery, RollSettledEvent } from './rollModel';
import { getDiceCameraLayout, getTableBoundary } from './sceneLayout';

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
    camera.aspect = size.width / size.height;
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
    <div className="grid h-full place-items-center bg-[#185438] px-6 text-center text-emerald-50">
      This browser could not create the WebGL scene. The dice roller requires WebGL.
    </div>
  );
}

function DiceTray() {
  const { size } = useThree();
  const floorY = -TRAY_FLOOR_THICKNESS / 2;
  const wallY = TRAY_WALL_COLLIDER_HEIGHT / 2;
  const boundary = useMemo(
    () => getTableBoundary(size.width, size.height),
    [size.height, size.width],
  );
  const walls = useMemo(() => boundary.map((start, index) => {
    const end = boundary[(index + 1) % boundary.length];
    const deltaX = end.x - start.x;
    const deltaZ = end.z - start.z;
    return {
      halfLength: Math.hypot(deltaX, deltaZ) / 2,
      position: [
        (start.x + end.x) / 2,
        wallY,
        (start.z + end.z) / 2,
      ] as [number, number, number],
      rotation: [0, -Math.atan2(deltaZ, deltaX), 0] as [number, number, number],
    };
  }), [boundary, wallY]);

  return (
    <group>
      <mesh position={[0, floorY + 0.015, 0]} receiveShadow>
        <boxGeometry args={[
          TABLE_HALF_EXTENT * 2,
          TRAY_FLOOR_THICKNESS,
          TABLE_HALF_EXTENT * 2,
        ]} />
        <meshStandardMaterial color="#1d6847" roughness={0.96} />
      </mesh>

      <RigidBody
        key={`${size.width}:${size.height}`}
        type="fixed"
        colliders={false}
      >
        <CuboidCollider
          args={[
            TABLE_HALF_EXTENT,
            TRAY_FLOOR_THICKNESS / 2,
            TABLE_HALF_EXTENT,
          ]}
          position={[0, floorY, 0]}
          friction={FRICTION}
          restitution={RESTITUTION}
        />
        {walls.map((wall, index) => (
          <CuboidCollider
            key={index}
            args={[
              wall.halfLength + TRAY_WALL_THICKNESS,
              wallY,
              TRAY_WALL_THICKNESS / 2,
            ]}
            position={wall.position}
            rotation={wall.rotation}
            friction={FRICTION}
            restitution={RESTITUTION}
          />
        ))}
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
      <color attach="background" args={['#1d6847']} />
      <fog attach="fog" args={['#1d6847', 34, 52]} />
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
