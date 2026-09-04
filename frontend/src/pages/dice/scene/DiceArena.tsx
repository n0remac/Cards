import React, { useRef } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Mesh } from 'three';
import { RenderOrigin } from './TableCamera';

type FeltHandlers = {
  onPointerDown: (event: ThreeEvent<PointerEvent>) => void;
  onPointerMove: (event: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (event: ThreeEvent<PointerEvent>) => void;
  onPointerCancel: (event: ThreeEvent<PointerEvent>) => void;
  onWheel: (event: ThreeEvent<WheelEvent>) => void;
};

export function DiceArena({
  renderOrigin,
  feltHandlers,
}: {
  renderOrigin: RenderOrigin;
  feltHandlers: FeltHandlers;
}) {
  const felt = useRef<Mesh>(null);
  useFrame(() => {
    if (felt.current) {
      felt.current.position.x = renderOrigin.current.x;
      felt.current.position.z = renderOrigin.current.z;
    }
  });
  return (
    <mesh
      ref={felt}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      {...feltHandlers}
    >
      <planeGeometry args={[30_000, 30_000, 1, 1]} />
      <meshStandardMaterial color="#1d6847" roughness={0.96} />
    </mesh>
  );
}
