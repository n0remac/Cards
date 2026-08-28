import React, { Suspense, useCallback, useEffect, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Physics, RapierRigidBody } from '@react-three/rapier';
import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import { createArenaLayout } from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';
import { Die } from './Die';
import { DiceArena, ResponsiveArenaCamera } from './DiceArena';
import { DiceBodyRegistry, RollObserver } from './RollObserver';
import { RollSettledEvent } from './rollModel';
import { ActiveTableRoll, TableDie } from './tableModel';

type DiceSceneProps = {
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  activeRoll?: ActiveTableRoll;
  localPlayerId: string;
  onSettled: (event: RollSettledEvent) => void;
  onDragStart: (
    dieId: string,
    position: NormalizedTablePosition,
  ) => string | undefined;
  onDragUpdate: (
    dieId: string,
    interactionId: string,
    position: NormalizedTablePosition,
  ) => void;
  onDragEnd: (
    dieId: string,
    interactionId: string,
    position: NormalizedTablePosition,
  ) => void;
  onReady: () => void;
  onWebGLUnavailable: () => void;
};

function PhysicsReady({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

function WebGLFallback({ onUnavailable }: { onUnavailable: () => void }) {
  useEffect(() => onUnavailable(), [onUnavailable]);
  return (
    <div className="grid h-full place-items-center bg-[#185438] px-6 text-center text-emerald-50">
      This browser could not create the WebGL scene. The dice table requires WebGL.
    </div>
  );
}

function DiceWorld({
  dice,
  dieOrder,
  activeRoll,
  localPlayerId,
  bodies,
  onSettled,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: Omit<DiceSceneProps, 'onReady' | 'onWebGLUnavailable'> & {
  bodies: DiceBodyRegistry;
}) {
  const { size } = useThree();
  const aspectKey = (size.width / size.height).toFixed(
    DICE_TABLE_CONFIG.arena.aspectKeyPrecision,
  );
  const layout = useMemo(
    () => createArenaLayout(Number(aspectKey)),
    [aspectKey],
  );
  const registerBody = useCallback((dieId: string, body: RapierRigidBody) => {
    bodies.current.set(dieId, body);
  }, [bodies]);
  const unregisterBody = useCallback((dieId: string, body: RapierRigidBody) => {
    if (bodies.current.get(dieId) === body) {
      bodies.current.delete(dieId);
    }
  }, [bodies]);

  return (
    <>
      <ResponsiveArenaCamera layout={layout} />
      <hemisphereLight color="#fff4dc" groundColor="#1b1511" intensity={1.15} />
      <directionalLight
        castShadow
        position={[-6, 25, 7]}
        intensity={2.2}
        color="#ffe5bd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-layout.shadowBounds.halfExtent}
        shadow-camera-right={layout.shadowBounds.halfExtent}
        shadow-camera-top={layout.shadowBounds.halfExtent}
        shadow-camera-bottom={-layout.shadowBounds.halfExtent}
      />
      <DiceArena layout={layout} />
      <RollObserver
        activeRoll={activeRoll}
        dice={dice}
        bodies={bodies}
        layout={layout}
        onSettled={onSettled}
      />
      {dieOrder.flatMap((dieId) => {
        const die = dice[dieId];
        return die ? [(
          <Die
            key={dieId}
            die={die}
            layout={layout}
            localPlayerId={localPlayerId}
            onBodyReady={registerBody}
            onBodyRemoved={unregisterBody}
            onDragStart={onDragStart}
            onDragUpdate={onDragUpdate}
            onDragEnd={onDragEnd}
          />
        )] : [];
      })}
    </>
  );
}

export function DiceScene(props: DiceSceneProps) {
  const bodies = useRef<Map<string, RapierRigidBody>>(new Map());
  const markReady = useCallback(props.onReady, [props.onReady]);
  const camera = DICE_TABLE_CONFIG.camera;

  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{
        position: [...camera.desktopPosition],
        fov: camera.desktopFov,
        near: 0.1,
        far: 160,
      }}
      gl={{ antialias: true }}
      fallback={<WebGLFallback onUnavailable={props.onWebGLUnavailable} />}
    >
      <color attach="background" args={['#1d6847']} />
      <fog attach="fog" args={['#1d6847', 42, 74]} />
      <Suspense fallback={null}>
        <Physics
          gravity={[...DICE_TABLE_CONFIG.physics.gravity]}
          timeStep={DICE_TABLE_CONFIG.physics.timeStep}
          colliders={false}
        >
          <PhysicsReady onReady={markReady} />
          <DiceWorld {...props} bodies={bodies} />
        </Physics>
      </Suspense>
    </Canvas>
  );
}
