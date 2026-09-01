import { describe, expect, it } from 'vitest';
import type { DetectedLetterLayout } from './letterStringDetection';
import { validateCrossword } from './crosswordValidation';

const connectedLayout: DetectedLetterLayout = {
  strings: [
    {
      direction: 'horizontal',
      text: 'CAT',
      dieIds: ['left', 'center', 'right'],
    },
    {
      direction: 'vertical',
      text: 'DAG',
      dieIds: ['top', 'center', 'bottom'],
    },
  ],
  crosswords: [{
    width: 3,
    height: 3,
    cells: [
      { dieId: 'top', letter: 'D', row: 0, column: 1 },
      { dieId: 'left', letter: 'C', row: 1, column: 0 },
      { dieId: 'center', letter: 'A', row: 1, column: 1 },
      { dieId: 'right', letter: 'T', row: 1, column: 2 },
      { dieId: 'bottom', letter: 'G', row: 2, column: 1 },
    ],
  }],
};

const allDieIds = ['top', 'left', 'center', 'right', 'bottom'];

describe('validateCrossword', () => {
  it('accepts one contiguous crossword when every word and die is valid', () => {
    expect(validateCrossword(
      connectedLayout,
      allDieIds,
      new Set(['CAT', 'DAG']),
    )).toMatchObject({
      isValid: true,
      isContiguous: true,
      allWordsValid: true,
      allDiceUsedInValidWords: true,
    });
  });

  it('rejects the crossword when any formed word is absent', () => {
    const result = validateCrossword(
      connectedLayout,
      allDieIds,
      new Set(['CAT']),
    );

    expect(result).toMatchObject({
      isValid: false,
      isContiguous: true,
      allWordsValid: false,
      allDiceUsedInValidWords: false,
    });
    expect(result.words.map(({ text, isValid }) => ({ text, isValid })))
      .toEqual([
        { text: 'CAT', isValid: true },
        { text: 'DAG', isValid: false },
      ]);
  });

  it('rejects multiple disconnected formations even when their words are valid', () => {
    const disconnected: DetectedLetterLayout = {
      strings: [
        { direction: 'horizontal', text: 'CAT', dieIds: ['a', 'b', 'c'] },
        { direction: 'horizontal', text: 'DOG', dieIds: ['d', 'e', 'f'] },
      ],
      crosswords: [
        {
          width: 3,
          height: 1,
          cells: [
            { dieId: 'a', letter: 'C', row: 0, column: 0 },
            { dieId: 'b', letter: 'A', row: 0, column: 1 },
            { dieId: 'c', letter: 'T', row: 0, column: 2 },
          ],
        },
        {
          width: 3,
          height: 1,
          cells: [
            { dieId: 'd', letter: 'D', row: 0, column: 0 },
            { dieId: 'e', letter: 'O', row: 0, column: 1 },
            { dieId: 'f', letter: 'G', row: 0, column: 2 },
          ],
        },
      ],
    };

    expect(validateCrossword(
      disconnected,
      ['a', 'b', 'c', 'd', 'e', 'f'],
      new Set(['CAT', 'DOG']),
    )).toMatchObject({
      isValid: false,
      isContiguous: false,
      allWordsValid: true,
      allDiceUsedInValidWords: true,
    });
  });

  it('requires every die in the connected shape to belong to a valid word', () => {
    const unusedDieLayout: DetectedLetterLayout = {
      ...connectedLayout,
      crosswords: [{
        ...connectedLayout.crosswords[0],
        width: 4,
        cells: [
          ...connectedLayout.crosswords[0].cells,
          { dieId: 'unused', letter: 'X', row: 2, column: 3 },
        ],
      }],
    };

    expect(validateCrossword(
      unusedDieLayout,
      [...allDieIds, 'unused'],
      new Set(['CAT', 'DAG']),
    )).toMatchObject({
      isValid: false,
      isContiguous: true,
      allWordsValid: true,
      allDiceUsedInValidWords: false,
    });
  });

  it('rejects a connected subset when another table die is isolated', () => {
    expect(validateCrossword(
      connectedLayout,
      [...allDieIds, 'isolated'],
      new Set(['CAT', 'DAG']),
    )).toMatchObject({
      isValid: false,
      isContiguous: false,
    });
  });

  it('rejects an internally inconsistent crossword grid', () => {
    const overlappingCells: DetectedLetterLayout = {
      ...connectedLayout,
      crosswords: [{
        ...connectedLayout.crosswords[0],
        cells: connectedLayout.crosswords[0].cells.map((cell) =>
          cell.dieId === 'right'
            ? { ...cell, column: 1 }
            : cell),
      }],
    };

    expect(validateCrossword(
      overlappingCells,
      allDieIds,
      new Set(['CAT', 'DAG']),
    )).toMatchObject({
      isValid: false,
      isContiguous: false,
    });
  });
});
