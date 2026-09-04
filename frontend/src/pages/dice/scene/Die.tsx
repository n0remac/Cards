import React, { useCallback, useEffect, useRef } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  CanvasTexture,
  Group,
  LinearFilter,
  MeshStandardMaterial,
  Plane,
  PlaneGeometry,
  Quaternion,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  TablePoint,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { DICE_TABLE_CONFIG } from '../constants';
import { createDragPointerTracker } from './dragPointerTracker';
import { getLetterFaceVisuals } from './letterDieVisual';
import { createLetterMaterialCache } from './letterMaterialCache';
import { TableDie } from '../table/tableModel';
import { ownerTint } from './ownerTint';
import { snapToAdjacentDie } from './dieSnapping';
import { PhysicsFrameBuffer } from '../sync/frameInterpolation';
import { DieTouchCoordinator, RenderOrigin } from './TableCamera';

type DieProps = {
  die: TableDie;
  dice: Readonly<Record<string, TableDie>>;
  localPlayerId: string;
  frames: PhysicsFrameBuffer;
  renderOrigin: RenderOrigin;
  dieTouch: DieTouchCoordinator;
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
};

const dieConfig = DICE_TABLE_CONFIG.die;
const DIE_GEOMETRY = new RoundedBoxGeometry(
  dieConfig.size,
  dieConfig.size,
  dieConfig.size,
  5,
  0.1,
);
const LETTER_GEOMETRY = new PlaneGeometry(0.68, 0.68);
const DIE_MATERIALS = new Map<string, MeshStandardMaterial>();

export function ownerDieMaterial(ownerPlayerId: string): MeshStandardMaterial {
  const tint = ownerTint(ownerPlayerId);
  let material = DIE_MATERIALS.get(tint);
  if (!material) {
    material = new MeshStandardMaterial({
      color: tint,
      roughness: 0.42,
      metalness: 0.02,
    });
    DIE_MATERIALS.set(tint, material);
  }
  return material;
}

const LETTER_MATERIALS = createLetterMaterialCache((letter) => {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a letter texture canvas.');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#211d19';
  context.font = '900 190px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(letter, canvas.width / 2, canvas.height / 2 + 8);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return new MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.58,
    metalness: 0,
  });
});

function FaceLetter({
  letter,
  position,
  rotation,
}: {
  letter: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={LETTER_GEOMETRY}
      material={LETTER_MATERIALS.get(letter)}
    />
  );
}

function DieVisual({ die }: { die: TableDie }) {
  const faceOffset = dieConfig.size / 2 + 0.006;
  return (
    <group dispose={null}>
      <mesh
        geometry={DIE_GEOMETRY}
        material={ownerDieMaterial(die.ownerPlayerId)}
        castShadow
        receiveShadow
      />
      {getLetterFaceVisuals(die.dieDefinitionId, faceOffset).map((visual) => (
        <FaceLetter
          key={visual.face}
          letter={visual.letter}
          position={visual.position}
          rotation={visual.rotation}
        />
      ))}
    </group>
  );
}

function pointerCaptureTarget(event: ThreeEvent<PointerEvent>) {
  return event.target as unknown as {
    hasPointerCapture: (pointerId: number) => boolean;
    setPointerCapture: (pointerId: number) => void;
    releasePointerCapture: (pointerId: number) => void;
  };
}

export function Die({
  die,
  dice,
  localPlayerId,
  frames,
  renderOrigin,
  dieTouch,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: DieProps) {
  const group = useRef<Group>(null);
  const initialized = useRef(false);
  const { gl } = useThree();
  const dragPointers = useRef(createDragPointerTracker());
  const latestTarget = useRef(new TablePoint({
    x: die.transform.position?.x,
    z: die.transform.position?.z,
  }));
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  const pointerTablePoint = useCallback((event: ThreeEvent<PointerEvent>) => {
    const hit = event.ray.intersectPlane(
      new Plane(new Vector3(0, 1, 0), -dieConfig.dragHeight),
      new Vector3(),
    );
    if (!hit) return undefined;
    return new TablePoint({
      x: Math.min(10_000, Math.max(-10_000,
        hit.x + renderOrigin.current.x)),
      z: Math.min(10_000, Math.max(-10_000,
        hit.z + renderOrigin.current.z)),
    });
  }, [renderOrigin]);

  const snapPoint = useCallback((point: TablePoint) => {
    const targets = Object.values(dice).flatMap((candidate) => {
      const position = candidate.transform.position;
      return candidate.dieId === die.dieId || candidate.mode === 'rolling' ||
        !position ? [] : [{ x: position.x, z: position.z }];
    });
    return new TablePoint(snapToAdjacentDie(
      point,
      targets,
      dieConfig.size,
    ));
  }, [dice, die.dieId]);

  const cancelPointerDrag = useCallback((pointerId: number) => {
    const interactionId = dragPointers.current.finish(pointerId);
    if (interactionId) {
      onDragEndRef.current(die.dieId, interactionId, latestTarget.current);
    }
  }, [die.dieId]);

  useEffect(() => {
    const finishInterrupted = (event: PointerEvent) => {
      cancelPointerDrag(event.pointerId);
    };
    const canvas = gl.domElement;
    canvas.addEventListener('pointercancel', finishInterrupted);
    canvas.addEventListener('lostpointercapture', finishInterrupted);
    return () => {
      canvas.removeEventListener('pointercancel', finishInterrupted);
      canvas.removeEventListener('lostpointercapture', finishInterrupted);
    };
  }, [cancelPointerDrag, gl]);

  useFrame((_, delta) => {
    const rendered = group.current;
    if (!rendered) return;
    const locallyPredicted = die.mode === 'held' &&
      die.interaction?.playerId === localPlayerId;
    const transform = locallyPredicted
      ? die.transform
      : frames.sample(die.dieId) ?? die.transform;
    if (!transform.position || !transform.rotation) return;
    const targetPosition = new Vector3(
      transform.position.x,
      transform.position.y,
      transform.position.z,
    );
    const targetRotation = new Quaternion(
      transform.rotation.x,
      transform.rotation.y,
      transform.rotation.z,
      transform.rotation.w,
    ).normalize();
    if (!initialized.current || locallyPredicted) {
      rendered.position.copy(targetPosition);
      rendered.quaternion.copy(targetRotation);
      initialized.current = true;
      return;
    }
    const alpha = 1 - Math.pow(0.65, delta * 60);
    rendered.position.lerp(targetPosition, alpha);
    rendered.quaternion.slerp(targetRotation, alpha);
  });

  const moveDrag = useCallback((event: ThreeEvent<PointerEvent>) => {
    if (dieTouch.move(event)) {
      event.stopPropagation();
      return;
    }
    const interactionId = dragPointers.current.interactionFor(event.pointerId);
    if (!interactionId) return;
    event.stopPropagation();
    const point = pointerTablePoint(event);
    if (point) {
      latestTarget.current = snapPoint(point);
      onDragUpdate(die.dieId, interactionId, latestTarget.current);
    }
  }, [die.dieId, dieTouch, onDragUpdate, pointerTablePoint, snapPoint]);

  const finishDrag = useCallback((event: ThreeEvent<PointerEvent>) => {
    const cameraOwned = dieTouch.end(event);
    const interactionId = dragPointers.current.finish(event.pointerId);
    if (interactionId && !cameraOwned) {
      event.stopPropagation();
      const point = pointerTablePoint(event);
      latestTarget.current = point ? snapPoint(point) : latestTarget.current;
      onDragEnd(die.dieId, interactionId, latestTarget.current);
    }
    const target = pointerCaptureTarget(event);
    if (target.hasPointerCapture(event.pointerId)) {
      target.releasePointerCapture(event.pointerId);
    }
  }, [die.dieId, dieTouch, onDragEnd, pointerTablePoint, snapPoint]);

  return (
    <group
      ref={group}
      onPointerDown={(event) => {
        if (die.mode !== 'settled' || die.ownerPlayerId !== localPlayerId) return;
        event.stopPropagation();
        const cameraOwned = dieTouch.start(
          event,
          () => cancelPointerDrag(event.pointerId),
        );
        if (cameraOwned) {
          pointerCaptureTarget(event).setPointerCapture(event.pointerId);
          return;
        }
        const point = pointerTablePoint(event);
        if (!point) return;
        latestTarget.current = snapPoint(point);
        const interactionId = onDragStart(die.dieId, latestTarget.current);
        if (interactionId) {
          dragPointers.current.begin(event.pointerId, interactionId);
          pointerCaptureTarget(event).setPointerCapture(event.pointerId);
        }
      }}
      onPointerMove={moveDrag}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <DieVisual die={die} />
    </group>
  );
}
