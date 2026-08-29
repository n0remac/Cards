import { describe, expect, it } from 'vitest';
import { DieFace } from '../../rpc/proto/dice/v1/dice_pb';
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
});
