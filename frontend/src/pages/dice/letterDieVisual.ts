import { DieFace } from '../../rpc/proto/dice/v1/dice_pb';
import type { PlayableDieFace } from './diceMath';
import { letterForFace } from './letterDice';

export type LetterFaceVisual = {
  face: PlayableDieFace;
  letter: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

export function getLetterFaceVisuals(
  dieDefinitionId: string,
  faceOffset: number,
): readonly LetterFaceVisual[] {
  return [
    {
      face: DieFace.ONE,
      letter: letterForFace(dieDefinitionId, DieFace.ONE),
      position: [0, faceOffset, 0],
      rotation: [-Math.PI / 2, 0, 0],
    },
    {
      face: DieFace.TWO,
      letter: letterForFace(dieDefinitionId, DieFace.TWO),
      position: [faceOffset, 0, 0],
      rotation: [0, Math.PI / 2, 0],
    },
    {
      face: DieFace.THREE,
      letter: letterForFace(dieDefinitionId, DieFace.THREE),
      position: [0, 0, faceOffset],
      rotation: [0, 0, 0],
    },
    {
      face: DieFace.FOUR,
      letter: letterForFace(dieDefinitionId, DieFace.FOUR),
      position: [0, 0, -faceOffset],
      rotation: [0, Math.PI, 0],
    },
    {
      face: DieFace.FIVE,
      letter: letterForFace(dieDefinitionId, DieFace.FIVE),
      position: [-faceOffset, 0, 0],
      rotation: [0, -Math.PI / 2, 0],
    },
    {
      face: DieFace.SIX,
      letter: letterForFace(dieDefinitionId, DieFace.SIX),
      position: [0, -faceOffset, 0],
      rotation: [Math.PI / 2, 0, 0],
    },
  ];
}
