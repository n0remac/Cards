import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { Group } from 'three';
import {
  PhysicsFrame,
  TableBounds,
  TablePoint,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { TableDie } from '../table/tableModel';
import { DetectedLetterLayout } from '../words/letterStringDetection';
import { createPhysicsFrameBuffer } from '../sync/frameInterpolation';
import { DiceArena } from './DiceArena';
import { Die } from './Die';
import { LetterStringObserver } from './LetterStringObserver';
import { CameraViewRequest, useTableCamera } from './TableCamera';

type DiceSceneProps = {
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  bounds: TableBounds;
  latestPhysicsFrame?: PhysicsFrame;
  localPlayerId: string;
  roomGeneration: number;
  viewRequest: CameraViewRequest;
  onDragStart: (dieId: string, target: TablePoint) => string | undefined;
  onDragUpdate: (
    dieId: string,
    interactionId: string,
    target: TablePoint,
  ) => void;
  onDragEnd: (
    dieId: string,
    interactionId: string,
    target: TablePoint,
  ) => void;
  onDetectedLayoutChanged: (layout: DetectedLetterLayout) => void;
  onReady: () => void;
  onWebGLUnavailable: () => void;
};

function SceneReady({ onReady }: { onReady: () => void }) {
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

function DiceWorld(props: Omit<DiceSceneProps,
  'onReady' | 'onWebGLUnavailable'>) {
  const worldGroup = useRef<Group>(null);
  const frames = useMemo(() => createPhysicsFrameBuffer(), []);
  useEffect(() => frames.clear(), [frames, props.roomGeneration]);
  useEffect(() => {
    if (props.latestPhysicsFrame) frames.push(props.latestPhysicsFrame);
  }, [frames, props.latestPhysicsFrame]);
  const ownedTransforms = props.dieOrder.flatMap((dieId) => {
    const die = props.dice[dieId];
    return die?.ownerPlayerId === props.localPlayerId ? [die.transform] : [];
  });
  const { renderOrigin, dieTouch, feltHandlers } = useTableCamera({
    bounds: props.bounds,
    ownedTransforms,
    resetKey: props.roomGeneration,
    viewRequest: props.viewRequest,
    worldGroup,
  });

  return (
    <>
      <hemisphereLight color="#fff4dc" groundColor="#1b1511" intensity={1.15} />
      <directionalLight
        castShadow
        position={[-8, 28, 10]}
        intensity={2.2}
        color="#ffe5bd"
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
      />
      <group ref={worldGroup}>
        <DiceArena
          renderOrigin={renderOrigin}
          feltHandlers={feltHandlers}
        />
        {props.dieOrder.flatMap((dieId) => {
          const die = props.dice[dieId];
          return die ? [(
            <Die
              key={dieId}
              die={die}
              dice={props.dice}
              localPlayerId={props.localPlayerId}
              frames={frames}
              renderOrigin={renderOrigin}
              dieTouch={dieTouch}
              onDragStart={props.onDragStart}
              onDragUpdate={props.onDragUpdate}
              onDragEnd={props.onDragEnd}
            />
          )] : [];
        })}
      </group>
      <LetterStringObserver
        dice={props.dice}
        dieOrder={props.dieOrder}
        onLayoutChanged={props.onDetectedLayoutChanged}
      />
    </>
  );
}

export function DiceScene(props: DiceSceneProps) {
  return (
    <Canvas
      shadows
      style={{ touchAction: 'none' }}
      dpr={[1, 1.75]}
      camera={{
        position: [0, 24, 12],
        fov: 42,
        near: 0.1,
        far: 100_000,
      }}
      gl={{ antialias: true }}
      fallback={<WebGLFallback onUnavailable={props.onWebGLUnavailable} />}
    >
      <color attach="background" args={['#1d6847']} />
      <Suspense fallback={null}>
        <SceneReady onReady={props.onReady} />
        <DiceWorld {...props} />
      </Suspense>
    </Canvas>
  );
}
