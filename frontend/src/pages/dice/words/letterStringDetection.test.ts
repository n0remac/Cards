import { describe, expect, it } from 'vitest';
import {
  detectLetterLayout,
  detectLetterStrings,
} from './letterStringDetection';
import type {
  LetterStringDetectionConfig,
  PositionedLetter,
} from './letterStringDetection';

const config: LetterStringDetectionConfig = {
  dieWidth: 1,
  minimumAxisDistanceRatio: 0.65,
  maximumAxisDistanceRatio: 1.35,
  maximumCrossAxisOffsetRatio: 0.35,
};

function letter(
  dieId: string,
  value: string,
  x: number,
  z: number,
): PositionedLetter {
  return { dieId, letter: value, position: { x, z } };
}

function summaries(letters: readonly PositionedLetter[]) {
  return detectLetterStrings(letters, config).map((string) => ({
    direction: string.direction,
    text: string.text,
    dieIds: string.dieIds,
  }));
}

describe('detectLetterStrings', () => {
  it.each([
    ['exactly aligned', letter('b', 'B', 1, 0)],
    ['with a small gap', letter('b', 'B', 1.2, 0)],
    ['with moderate row misalignment', letter('b', 'B', 1, 0.3)],
    ['at the minimum distance and alignment limits', letter('b', 'B', 0.65, 0.35)],
    ['at the maximum distance limit', letter('b', 'B', 1.35, 0)],
  ])('detects horizontal neighbors %s', (_description, second) => {
    expect(summaries([letter('a', 'A', 0, 0), second])).toEqual([{
      direction: 'horizontal',
      text: 'AB',
      dieIds: ['a', 'b'],
    }]);
  });

  it('detects a vertical string from top to bottom', () => {
    expect(summaries([
      letter('middle', 'A', 0.2, 0),
      letter('bottom', 'T', 0, 1.2),
      letter('top', 'C', 0, -1),
    ])).toEqual([{
      direction: 'vertical',
      text: 'CAT',
      dieIds: ['top', 'middle', 'bottom'],
    }]);
  });

  it.each([
    ['too close to be separate dice', letter('b', 'B', 0.64, 0)],
    ['beyond the maximum gap', letter('b', 'B', 1.36, 0)],
    ['too far out of row alignment', letter('b', 'B', 1, 0.36)],
    ['diagonally adjacent', letter('b', 'B', 0.8, 0.8)],
  ])('rejects dice that are %s', (_description, second) => {
    expect(summaries([letter('a', 'A', 0, 0), second])).toEqual([]);
  });

  it('omits isolated dice and only emits the maximal run', () => {
    expect(summaries([
      letter('a', 'C', 0, 0),
      letter('b', 'A', 1, 0),
      letter('c', 'T', 2, 0),
      letter('isolated', 'X', 6, 4),
    ])).toEqual([{
      direction: 'horizontal',
      text: 'CAT',
      dieIds: ['a', 'b', 'c'],
    }]);
  });

  it('reports a crossing die in both strings', () => {
    expect(summaries([
      letter('center', 'A', 0, 0),
      letter('left', 'C', -1, 0),
      letter('right', 'T', 1, 0),
      letter('top', 'D', 0, -1),
      letter('bottom', 'G', 0, 1),
    ])).toEqual([
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
    ]);
  });

  it('preserves crossing rows and columns as a normalized crossword grid', () => {
    const layout = detectLetterLayout([
      letter('center', 'A', 0.2, 0.1),
      letter('left', 'C', -1, 0),
      letter('right', 'T', 1.3, 0.25),
      letter('top', 'D', 0, -1.1),
      letter('bottom', 'G', 0.1, 1.2),
    ], config);

    expect(layout.crosswords).toEqual([{
      width: 3,
      height: 3,
      cells: [
        { dieId: 'top', letter: 'D', row: 0, column: 1 },
        { dieId: 'left', letter: 'C', row: 1, column: 0 },
        { dieId: 'center', letter: 'A', row: 1, column: 1 },
        { dieId: 'right', letter: 'T', row: 1, column: 2 },
        { dieId: 'bottom', letter: 'G', row: 2, column: 1 },
      ],
    }]);
  });

  it('keeps tolerant linked steps aligned in the displayed shape', () => {
    const layout = detectLetterLayout([
      letter('a', 'A', 0, 0),
      letter('b', 'B', 1.2, 0.3),
      letter('c', 'C', 1.1, 1.3),
      letter('d', 'D', 2.2, 1.1),
    ], config);

    expect(layout.crosswords[0]).toEqual({
      width: 3,
      height: 2,
      cells: [
        { dieId: 'a', letter: 'A', row: 0, column: 0 },
        { dieId: 'b', letter: 'B', row: 0, column: 1 },
        { dieId: 'c', letter: 'C', row: 1, column: 1 },
        { dieId: 'd', letter: 'D', row: 1, column: 2 },
      ],
    });
  });

  it('orders horizontal runs top-to-bottom and vertical runs left-to-right', () => {
    expect(summaries([
      letter('right-top', 'T', 3, -1),
      letter('bottom-left', 'U', -1, 2),
      letter('left-bottom', 'N', -3, 1),
      letter('top-right', 'O', 1, -2),
      letter('bottom-right', 'P', 0, 2),
      letter('left-top', 'I', -3, 0),
      letter('right-bottom', 'O', 3, 0),
      letter('top-left', 'G', 0, -2),
    ])).toEqual([
      {
        direction: 'horizontal',
        text: 'GO',
        dieIds: ['top-left', 'top-right'],
      },
      {
        direction: 'horizontal',
        text: 'UP',
        dieIds: ['bottom-left', 'bottom-right'],
      },
      {
        direction: 'vertical',
        text: 'IN',
        dieIds: ['left-top', 'left-bottom'],
      },
      {
        direction: 'vertical',
        text: 'TO',
        dieIds: ['right-top', 'right-bottom'],
      },
    ]);
  });

  it('preserves disconnected runs with duplicate text and stable ordering', () => {
    const source = [
      letter('bottom-c', 'C', 0, 2),
      letter('top-a', 'A', 1, 0),
      letter('bottom-a', 'A', 1, 2),
      letter('top-c', 'C', 0, 0),
      letter('bottom-t', 'T', 2, 2),
      letter('top-t', 'T', 2, 0),
    ];
    const expected = [
      {
        direction: 'horizontal',
        text: 'CAT',
        dieIds: ['top-c', 'top-a', 'top-t'],
      },
      {
        direction: 'horizontal',
        text: 'CAT',
        dieIds: ['bottom-c', 'bottom-a', 'bottom-t'],
      },
    ];

    expect(summaries(source)).toEqual(expected);
    expect(summaries([...source].reverse())).toEqual(expected);
    expect(detectLetterLayout(source, config).crosswords).toEqual([
      {
        width: 3,
        height: 1,
        cells: [
          { dieId: 'top-c', letter: 'C', row: 0, column: 0 },
          { dieId: 'top-a', letter: 'A', row: 0, column: 1 },
          { dieId: 'top-t', letter: 'T', row: 0, column: 2 },
        ],
      },
      {
        width: 3,
        height: 1,
        cells: [
          { dieId: 'bottom-c', letter: 'C', row: 0, column: 0 },
          { dieId: 'bottom-a', letter: 'A', row: 0, column: 1 },
          { dieId: 'bottom-t', letter: 'T', row: 0, column: 2 },
        ],
      },
    ]);
    expect(detectLetterLayout([...source].reverse(), config).crosswords)
      .toEqual(detectLetterLayout(source, config).crosswords);
  });
});
