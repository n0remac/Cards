import { describe, expect, it } from 'vitest';
import { DieFace } from '../../../rpc/proto/dice/v1/dice_pb';
import { faceUpQuaternion, getUpwardFace } from './diceMath';
import {
  getLetterDieDefinition,
  isKnownLetterDieDefinitionId,
  LETTER_DIE_DEFINITIONS,
  letterForFace,
  STANDARD_LETTER_DIE_DEFINITION_IDS,
} from './letterDice';

const EXPECTED_FACE_STRINGS = [
  'MMLLBY',
  'VFGKPP',
  'HHNNRR',
  'DFRLLW',
  'RRDLGG',
  'XKBSZN',
  'WHHTTP',
  'CCBTJD',
  'CCMTTS',
  'OIINNY',
  'AEIOUU',
  'AAEEOO',
] as const;

const PLAYABLE_FACES = [
  DieFace.ONE,
  DieFace.TWO,
  DieFace.THREE,
  DieFace.FOUR,
  DieFace.FIVE,
  DieFace.SIX,
] as const;

describe('letter die catalog', () => {
  it('contains twelve stable IDs with the exact supplied face order', () => {
    expect(LETTER_DIE_DEFINITIONS).toHaveLength(12);
    expect(LETTER_DIE_DEFINITIONS.map(({ faceString }) => faceString))
      .toEqual(EXPECTED_FACE_STRINGS);
    expect(new Set(STANDARD_LETTER_DIE_DEFINITION_IDS).size).toBe(12);
    expect(LETTER_DIE_DEFINITIONS.every(({ faceString }) =>
      /^[A-Z]{6}$/.test(faceString))).toBe(true);
  });

  it('resolves every physical face and preserves it canonically', () => {
    for (const definition of LETTER_DIE_DEFINITIONS) {
      for (const face of PLAYABLE_FACES) {
        expect(letterForFace(definition.id, face))
          .toBe(definition.faceString[face - 1]);
        expect(getUpwardFace(faceUpQuaternion(face))).toBe(face);
      }
    }
  });

  it('resolves duplicate letters by physical face without ambiguity', () => {
    expect(letterForFace('letter-die-01', DieFace.ONE)).toBe('M');
    expect(letterForFace('letter-die-01', DieFace.TWO)).toBe('M');
    expect(letterForFace('letter-die-12', DieFace.ONE)).toBe('A');
    expect(letterForFace('letter-die-12', DieFace.TWO)).toBe('A');
  });

  it('recognizes only catalog definition IDs', () => {
    expect(isKnownLetterDieDefinitionId('letter-die-08')).toBe(true);
    expect(getLetterDieDefinition('letter-die-08')?.faceString).toBe('CCBTJD');
    expect(isKnownLetterDieDefinitionId('custom-die')).toBe(false);
    expect(() => letterForFace('custom-die', DieFace.ONE)).toThrow(/Unknown/);
  });
});
