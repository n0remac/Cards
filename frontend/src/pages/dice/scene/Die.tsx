import React, { useCallback, useEffect, useRef } from 'react';
import { ThreeEvent, useFrame, useThree } from '@react-three/fiber';
import {
  CanvasTexture,
  EdgesGeometry,
  Group,
  LinearFilter,
  LineBasicMaterial,
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
import { TableDie } from '../table/tableModel';
import { ownerDieStyle } from './ownerTint';
import type {
  OwnerDiePattern,
  OwnerDieStyle,
} from './ownerTint';
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
const LETTER_GEOMETRY = new PlaneGeometry(0.86, 0.86);
const DIE_EDGE_GEOMETRY = new EdgesGeometry(DIE_GEOMETRY, 28);
const DIE_MATERIALS = new Map<string, MeshStandardMaterial>();
const DIE_EDGE_MATERIALS = new Map<string, LineBasicMaterial>();
const OWNER_FACE_MATERIALS = new Map<string, MeshStandardMaterial>();

export function ownerDieMaterial(ownerPlayerId: string): MeshStandardMaterial {
  const style = ownerDieStyle(ownerPlayerId);
  let material = DIE_MATERIALS.get(style.key);
  if (!material) {
    material = new MeshStandardMaterial({
      color: style.bodyColor,
      roughness: 0.34,
      metalness: 0.04,
    });
    DIE_MATERIALS.set(style.key, material);
  }
  return material;
}

function ownerEdgeMaterial(style: OwnerDieStyle): LineBasicMaterial {
  let material = DIE_EDGE_MATERIALS.get(style.key);
  if (!material) {
    material = new LineBasicMaterial({
      color: style.accentColor,
      transparent: true,
      opacity: 0.82,
    });
    DIE_EDGE_MATERIALS.set(style.key, material);
  }
  return material;
}

function drawOwnerPattern(
  context: CanvasRenderingContext2D,
  pattern: OwnerDiePattern,
  color: string,
) {
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 13;
  context.lineCap = 'round';
  context.lineJoin = 'round';

  if (pattern === 'corner-brackets') {
    for (const [x, y, dx, dy] of [
      [24, 24, 1, 1], [232, 24, -1, 1],
      [24, 232, 1, -1], [232, 232, -1, -1],
    ] as const) {
      context.beginPath();
      context.moveTo(x + dx * 42, y);
      context.lineTo(x, y);
      context.lineTo(x, y + dy * 42);
      context.stroke();
    }
  } else if (pattern === 'double-bars') {
    for (const y of [25, 49, 207, 231]) {
      context.fillRect(55, y - 6, 146, 12);
    }
  } else if (pattern === 'corner-dots') {
    for (const [x, y] of [[28, 28], [228, 28], [28, 228], [228, 228]]) {
      context.beginPath();
      context.arc(x, y, 13, 0, Math.PI * 2);
      context.fill();
    }
  } else if (pattern === 'diagonal-cuts') {
    for (const offset of [0, 24, 48]) {
      context.beginPath();
      context.moveTo(18 + offset, 18);
      context.lineTo(18, 18 + offset);
      context.moveTo(238 - offset, 238);
      context.lineTo(238, 238 - offset);
      context.stroke();
    }
  } else if (pattern === 'edge-blocks') {
    for (const y of [34, 94, 154, 214]) {
      context.fillRect(13, y - 13, 28, 26);
      context.fillRect(215, y - 13, 28, 26);
    }
  } else {
    for (const [x, y] of [[30, 30], [226, 30], [30, 226], [226, 226]]) {
      context.beginPath();
      context.moveTo(x, y - 14);
      context.lineTo(x + 14, y);
      context.lineTo(x, y + 14);
      context.lineTo(x - 14, y);
      context.closePath();
      context.fill();
    }
  }
  context.restore();
}

function ownerFaceMaterial(
  ownerPlayerId: string,
  letter: string,
): MeshStandardMaterial {
  const style = ownerDieStyle(ownerPlayerId);
  const cacheKey = `${style.key}:${letter.toUpperCase()}`;
  const existing = OWNER_FACE_MATERIALS.get(cacheKey);
  if (existing) return existing;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a letter texture canvas.');
  context.clearRect(0, 0, canvas.width, canvas.height);
  drawOwnerPattern(context, style.pattern, style.accentColor);
  context.fillStyle = '#211d19';
  context.font = '900 174px Arial, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(letter, canvas.width / 2, canvas.height / 2 + 8);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  const material = new MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.02,
    roughness: 0.58,
    metalness: 0,
  });
  OWNER_FACE_MATERIALS.set(cacheKey, material);
  return material;
}

function FaceLetter({
  letter,
  ownerPlayerId,
  position,
  rotation,
}: {
  letter: string;
  ownerPlayerId: string;
  position: [number, number, number];
  rotation: [number, number, number];
}) {
  return (
    <mesh
      position={position}
      rotation={rotation}
      geometry={LETTER_GEOMETRY}
      material={ownerFaceMaterial(ownerPlayerId, letter)}
    />
  );
}

function DieVisual({ die }: { die: TableDie }) {
  const faceOffset = dieConfig.size / 2 + 0.006;
  const style = ownerDieStyle(die.ownerPlayerId);
  return (
    <group dispose={null}>
      <mesh
        geometry={DIE_GEOMETRY}
        material={ownerDieMaterial(die.ownerPlayerId)}
        castShadow
        receiveShadow
      />
      <lineSegments
        geometry={DIE_EDGE_GEOMETRY}
        material={ownerEdgeMaterial(style)}
        scale={1.004}
      />
      {getLetterFaceVisuals(die.dieDefinitionId, faceOffset).map((visual) => (
        <FaceLetter
          key={visual.face}
          letter={visual.letter}
          ownerPlayerId={die.ownerPlayerId}
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
