import React, { useEffect, useRef } from 'react';
import { CircleGeometry, MeshStandardMaterial } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  CuboidCollider,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier';
import { DieThrowSpec } from '../../rpc/proto/dice/v1/dice_pb';
import {
  ANGULAR_DAMPING,
  DIE_COLLIDER_HALF_EXTENT,
  DIE_MASS,
  DIE_SIZE,
  FRICTION,
  LINEAR_DAMPING,
  RESTITUTION,
} from './constants';
import {
  quaternionToObject,
  vectorToObject,
  vectorToTuple,
} from './diceMath';

type DieProps = {
  rollId: number;
  throwSpec: DieThrowSpec;
  onBodyReady: (
    rollId: number,
    dieIndex: number,
    body: RapierRigidBody,
  ) => void;
  onBodyRemoved: (
    rollId: number,
    dieIndex: number,
    body: RapierRigidBody,
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

const DIE_GEOMETRY = new RoundedBoxGeometry(DIE_SIZE, DIE_SIZE, DIE_SIZE, 5, 0.1);
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

type FacePipsProps = {
  value: number;
  position: [number, number, number];
  rotation: [number, number, number];
};

function FacePips({ value, position, rotation }: FacePipsProps) {
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
  const faceOffset = DIE_SIZE / 2 + 0.006;
  return (
    <group dispose={null}>
      <mesh
        geometry={DIE_GEOMETRY}
        material={DIE_MATERIAL}
        castShadow
        receiveShadow
      />
      <FacePips value={1} position={[0, faceOffset, 0]} rotation={[-Math.PI / 2, 0, 0]} />
      <FacePips value={6} position={[0, -faceOffset, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <FacePips value={2} position={[faceOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      <FacePips value={5} position={[-faceOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <FacePips value={3} position={[0, 0, faceOffset]} rotation={[0, 0, 0]} />
      <FacePips value={4} position={[0, 0, -faceOffset]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

export function applyThrowToBody(body: RapierRigidBody, spec: DieThrowSpec) {
  body.setTranslation(vectorToObject(spec.position), true);
  body.setRotation(quaternionToObject(spec.rotation), true);
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  body.resetForces(true);
  body.resetTorques(true);
  body.applyImpulse(vectorToObject(spec.impulse), true);
  body.applyTorqueImpulse(vectorToObject(spec.torque), true);
  body.wakeUp();
}

export function Die({
  rollId,
  throwSpec,
  onBodyReady,
  onBodyRemoved,
}: DieProps) {
  const bodyRef = useRef<RapierRigidBody>(null);
  const appliedRollIdRef = useRef<number>();

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) {
      return;
    }
    onBodyReady(rollId, throwSpec.dieIndex, body);
    if (appliedRollIdRef.current !== rollId) {
      appliedRollIdRef.current = rollId;
      applyThrowToBody(body, throwSpec);
    }

    return () => onBodyRemoved(rollId, throwSpec.dieIndex, body);
  }, [onBodyReady, onBodyRemoved, rollId, throwSpec]);

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={vectorToTuple(throwSpec.position)}
      linearDamping={LINEAR_DAMPING}
      angularDamping={ANGULAR_DAMPING}
      ccd
      canSleep
    >
      <CuboidCollider
        args={[
          DIE_COLLIDER_HALF_EXTENT,
          DIE_COLLIDER_HALF_EXTENT,
          DIE_COLLIDER_HALF_EXTENT,
        ]}
        mass={DIE_MASS}
        friction={FRICTION}
        restitution={RESTITUTION}
      />
      <DieVisual />
    </RigidBody>
  );
}
