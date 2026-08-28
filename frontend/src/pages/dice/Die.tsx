import React, { useCallback, useEffect, useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import {
  CircleGeometry,
  MeshStandardMaterial,
  Plane,
  Quaternion as ThreeQuaternion,
  Vector3 as ThreeVector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { NormalizedTablePosition } from '../../rpc/proto/dice/v1/dice_pb';
import {
  ArenaLayout,
  clampNormalizedPosition,
  containArenaMotion,
  normalizedToWorld,
  worldToNormalized,
} from './arenaLayout';
import { DICE_TABLE_CONFIG } from './constants';
import {
  faceUpQuaternion,
  isPlayableDieValue,
  quaternionToObject,
  vectorToObject,
} from './diceMath';
import { TableDie } from './tableModel';
import { shouldSnapReconciliation } from './reconciliation';

type DieProps = {
  die: TableDie;
  layout: ArenaLayout;
  localPlayerId: string;
  onBodyReady: (dieId: string, body: RapierRigidBody) => void;
  onBodyRemoved: (dieId: string, body: RapierRigidBody) => void;
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
};

type PipPoint = readonly [number, number];
const PIP_PATTERNS: Record<number, readonly PipPoint[]> = {
  1: [[0, 0]],
  2: [[-0.2, 0.2], [0.2, -0.2]],
  3: [[-0.22, 0.22], [0, 0], [0.22, -0.22]],
  4: [[-0.2, 0.2], [0.2, 0.2], [-0.2, -0.2], [0.2, -0.2]],
  5: [[-0.22, 0.22], [0.22, 0.22], [0, 0], [-0.22, -0.22], [0.22, -0.22]],
  6: [[-0.21, 0.25], [0.21, 0.25], [-0.21, 0], [0.21, 0], [-0.21, -0.25], [0.21, -0.25]],
};

const { die: dieConfig, physics } = DICE_TABLE_CONFIG;
const DIE_GEOMETRY = new RoundedBoxGeometry(
  dieConfig.size,
  dieConfig.size,
  dieConfig.size,
  5,
  0.1,
);
const PIP_GEOMETRY = new CircleGeometry(0.075, 18);
const DIE_MATERIAL = new MeshStandardMaterial({
  color: '#f4ead4',
  roughness: 0.42,
  metalness: 0.02,
});
const PIP_MATERIAL = new MeshStandardMaterial({
  color: '#211d19',
  roughness: 0.58,
});

function FacePips({
  value,
  position,
  rotation,
}: {
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <group position={position} rotation={rotation}>
      {PIP_PATTERNS[value].map(([x, y], index) => (
        <mesh
          key={index}
          position={[x, y, 0]}
          geometry={PIP_GEOMETRY}
          material={PIP_MATERIAL}
        />
      ))}
    </group>
  );
}

function DieVisual() {
  const faceOffset = dieConfig.size / 2 + 0.006;
  return (
    <group dispose={null}>
      <mesh geometry={DIE_GEOMETRY} material={DIE_MATERIAL} castShadow receiveShadow />
      <FacePips value={1} position={[0, faceOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <FacePips value={6} position={[0, -faceOffset, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <FacePips value={2} position={[faceOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <FacePips value={5} position={[-faceOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <FacePips value={3} position={[0, 0, faceOffset]} rotation={[0, 0, 0]} />
      <FacePips value={4} position={[0, 0, -faceOffset]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

export function applyThrowToBody(
  body: RapierRigidBody,
  die: TableDie,
  layout: ArenaLayout,
) {
  if (!die.throwSpec?.position || !die.throwSpec.tablePosition) {
    return;
  }
  const world = normalizedToWorld(layout, die.throwSpec.tablePosition);
  body.setEnabledRotations(true, true, true, true);
  body.setTranslation({ x: world.x, y: die.throwSpec.position.y, z: world.z }, true);
  body.setRotation(quaternionToObject(die.throwSpec.rotation), true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  body.resetForces(true);
  body.resetTorques(true);
  body.applyImpulse(vectorToObject(die.throwSpec.impulse), true);
  body.applyTorqueImpulse(vectorToObject(die.throwSpec.torque), true);
  body.wakeUp();
}

function pointerTablePosition(
  event: ThreeEvent<PointerEvent>,
  layout: ArenaLayout,
): NormalizedTablePosition | undefined {
  const hit = event.ray.intersectPlane(
    new Plane(new ThreeVector3(0, 1, 0), -dieConfig.dragHeight),
    new ThreeVector3(),
  );
  return hit
    ? clampNormalizedPosition(worldToNormalized(layout, { x: hit.x, z: hit.z }))
    : undefined;
}

function pointerCaptureTarget(event: ThreeEvent<PointerEvent>) {
  return event.target as unknown as {
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  };
}

export function Die({
  die,
  layout,
  localPlayerId,
  onBodyReady,
  onBodyRemoved,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: DieProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const appliedRollId = useRef<string>();
  const previousAspectKey = useRef(layout.aspectKey);
  const previousMode = useRef<TableDie['mode']>();
  const dragInteractionId = useRef<string>();
  const reconciling = useRef(false);
  const reconciliationRevision = useRef<bigint>();

  const canonicalRotation = isPlayableDieValue(die.value)
    ? faceUpQuaternion(die.value)
    : { x: 0, y: 0, z: 0, w: 1 };
  const initialWorld = normalizedToWorld(layout, die.position);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    onBodyReady(die.dieId, body);
    return () => onBodyRemoved(die.dieId, body);
  }, [die.dieId, onBodyReady, onBodyRemoved]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }

    const aspectChanged = previousAspectKey.current !== layout.aspectKey;
    previousAspectKey.current = layout.aspectKey;
    if (die.mode === 'rolling') {
      body.setEnabledRotations(true, true, true, true);
      if (die.activeRollId && appliedRollId.current !== die.activeRollId) {
        appliedRollId.current = die.activeRollId;
        applyThrowToBody(body, die, layout);
      } else if (aspectChanged) {
        const corrected = containArenaMotion(layout, body.translation(), body.linvel());
        if (corrected.corrected) {
          body.setTranslation(corrected.position, true);
          body.setLinvel(corrected.velocity, true);
        }
      }
    } else {
      body.setEnabledRotations(false, false, false, true);
      body.setAngvel({ x: 0, y: 0, z: 0 }, true);
      const target = normalizedToWorld(layout, die.position);
      if (die.mode === 'held') {
        body.setNextKinematicTranslation({
          x: target.x,
          y: dieConfig.dragHeight,
          z: target.z,
        });
        body.setRotation(canonicalRotation, true);
      } else if (previousMode.current === undefined ||
                 previousMode.current === 'held' || aspectChanged) {
        body.setTranslation({
          x: target.x,
          y: dieConfig.dragHeight,
          z: target.z,
        }, true);
        body.setRotation(canonicalRotation, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
      }
    }
    previousMode.current = die.mode;
  }, [canonicalRotation.x, canonicalRotation.y, canonicalRotation.z,
    canonicalRotation.w, die, layout]);

  useEffect(() => {
    if (!die.canonicalRevision ||
        reconciliationRevision.current === die.canonicalRevision) {
      return;
    }
    reconciliationRevision.current = die.canonicalRevision;
    reconciling.current = die.canonicalSourcePlayerId !== localPlayerId;
    if (!reconciling.current) {
      const body = bodyRef.current;
      const target = normalizedToWorld(layout, die.position);
      body?.setTranslation({ x: target.x, y: dieConfig.dragHeight, z: target.z }, true);
      body?.setRotation(canonicalRotation, true);
    }
  }, [canonicalRotation.x, canonicalRotation.y, canonicalRotation.z,
    canonicalRotation.w, die.canonicalRevision, die.canonicalSourcePlayerId,
    die.position, layout, localPlayerId]);

  useFrame((_, delta) => {
    const body = bodyRef.current;
    if (!body || !reconciling.current || die.mode !== 'settled') {
      return;
    }
    const target = normalizedToWorld(layout, die.position);
    const current = body.translation();
    const outside = shouldSnapReconciliation(layout, current);
    const distance = Math.hypot(current.x - target.x, current.z - target.z);
    const alpha = outside ? 1 : 1 - Math.pow(
      1 - DICE_TABLE_CONFIG.reconciliation.easing,
      delta * 60,
    );
    body.setTranslation({
      x: current.x + (target.x - current.x) * alpha,
      y: current.y + (dieConfig.dragHeight - current.y) * alpha,
      z: current.z + (target.z - current.z) * alpha,
    }, true);

    const currentRotation = body.rotation();
    const easedRotation = new ThreeQuaternion(
      currentRotation.x,
      currentRotation.y,
      currentRotation.z,
      currentRotation.w,
    ).slerp(new ThreeQuaternion(
      canonicalRotation.x,
      canonicalRotation.y,
      canonicalRotation.z,
      canonicalRotation.w,
    ), alpha);
    body.setRotation(easedRotation, true);
    if (distance < DICE_TABLE_CONFIG.reconciliation.positionTolerance &&
        easedRotation.angleTo(new ThreeQuaternion(
          canonicalRotation.x,
          canonicalRotation.y,
          canonicalRotation.z,
          canonicalRotation.w,
        )) < 0.01) {
      reconciling.current = false;
    }
  });

  const moveDrag = useCallback((event: ThreeEvent<PointerEvent>) => {
    const interactionId = dragInteractionId.current;
    if (!interactionId) {
      return;
    }
    event.stopPropagation();
    const position = pointerTablePosition(event, layout);
    if (position) {
      onDragUpdate(die.dieId, interactionId, position);
    }
  }, [die.dieId, layout, onDragUpdate]);

  const finishDrag = useCallback((event: ThreeEvent<PointerEvent>) => {
    const interactionId = dragInteractionId.current;
    if (!interactionId) {
      return;
    }
    event.stopPropagation();
    const position = pointerTablePosition(event, layout) ?? die.position;
    dragInteractionId.current = undefined;
    onDragEnd(die.dieId, interactionId, position);
    pointerCaptureTarget(event).releasePointerCapture(event.pointerId);
  }, [die.dieId, die.position, layout, onDragEnd]);

  return (
    <RigidBody
      ref={bodyRef}
      type={die.mode === 'held' ? 'kinematicPosition' : 'dynamic'}
      colliders={false}
      position={[initialWorld.x, dieConfig.dragHeight, initialWorld.z]}
      linearDamping={dieConfig.linearDamping}
      angularDamping={dieConfig.angularDamping}
      enabledRotations={die.mode === 'rolling'
        ? [true, true, true]
        : [false, false, false]}
      ccd
      canSleep
    >
      <CuboidCollider
        args={[
          dieConfig.colliderHalfExtent,
          dieConfig.colliderHalfExtent,
          dieConfig.colliderHalfExtent,
        ]}
        mass={dieConfig.mass}
        friction={physics.friction}
        restitution={physics.restitution}
      />
      <group
        onPointerDown={(event) => {
          if (die.mode !== 'settled') {
            return;
          }
          event.stopPropagation();
          const position = pointerTablePosition(event, layout) ?? die.position;
          const interactionId = onDragStart(die.dieId, position);
          if (interactionId) {
            dragInteractionId.current = interactionId;
            pointerCaptureTarget(event).setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        <DieVisual />
      </group>
    </RigidBody>
  );
}
