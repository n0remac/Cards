import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { DieFace } from '../../rpc/proto/dice/v1/dice_pb';
import { faceUpQuaternion } from './diceMath';
import { getLetterFaceVisuals } from './letterDieVisual';

describe('letter die face visuals', () => {
  it('assigns all six written letters to their matching physical faces', () => {
    const visuals = getLetterFaceVisuals('letter-die-04', 0.5);
    expect(visuals.map(({ face }) => face)).toEqual([
      DieFace.ONE,
      DieFace.TWO,
      DieFace.THREE,
      DieFace.FOUR,
      DieFace.FIVE,
      DieFace.SIX,
    ]);
    expect(visuals.map(({ letter }) => letter)).toEqual([
      'D', 'F', 'R', 'L', 'L', 'W',
    ]);
    expect(visuals.map(({ position }) => position)).toEqual([
      [0, 0.5, 0],
      [0.5, 0, 0],
      [0, 0, 0.5],
      [0, 0, -0.5],
      [-0.5, 0, 0],
      [0, -0.5, 0],
    ]);
  });

  it('orients every settled top-face letter upright toward screen-up', () => {
    for (const visual of getLetterFaceVisuals('letter-die-04', 0.5)) {
      const canonical = faceUpQuaternion(visual.face);
      const dieRotation = new Quaternion(
        canonical.x,
        canonical.y,
        canonical.z,
        canonical.w,
      );
      const faceRotation = new Euler(...visual.rotation);

      const faceNormal = new Vector3(0, 0, 1)
        .applyEuler(faceRotation)
        .applyQuaternion(dieRotation);
      const letterUp = new Vector3(0, 1, 0)
        .applyEuler(faceRotation)
        .applyQuaternion(dieRotation);

      expect(faceNormal.x).toBeCloseTo(0);
      expect(faceNormal.y).toBeCloseTo(1);
      expect(faceNormal.z).toBeCloseTo(0);
      expect(letterUp.x).toBeCloseTo(0);
      expect(letterUp.y).toBeCloseTo(0);
      expect(letterUp.z).toBeCloseTo(-1);
    }
  });
});
