import type {
  DetectedLetterLayout,
  DetectedLetterString,
} from './letterStringDetection';

export type ValidatedLetterString = DetectedLetterString & {
  isValid: boolean;
};

export type CrosswordValidation = {
  isValid: boolean;
  isContiguous: boolean;
  allWordsValid: boolean;
  allDiceUsedInValidWords: boolean;
  words: readonly ValidatedLetterString[];
};

function stringsMatchGrid(layout: DetectedLetterLayout): boolean {
  if (layout.crosswords.length !== 1) {
    return false;
  }
  const cells = layout.crosswords[0].cells;
  const cellsById = new Map(cells.map((cell) => [cell.dieId, cell]));
  const occupiedCoordinates = new Set(cells.map(({ row, column }) =>
    `${row}:${column}`));
  if (cellsById.size !== cells.length ||
      occupiedCoordinates.size !== cells.length) {
    return false;
  }

  return layout.strings.every((word) => {
    const firstCell = cellsById.get(word.dieIds[0]);
    if (!firstCell || new Set(word.dieIds).size !== word.dieIds.length) {
      return false;
    }
    return word.dieIds.every((dieId, index) => {
      const cell = cellsById.get(dieId);
      return cell !== undefined && (word.direction === 'horizontal'
        ? cell.row === firstCell.row && cell.column === firstCell.column + index
        : cell.column === firstCell.column && cell.row === firstCell.row + index);
    });
  });
}

export function validateCrossword(
  layout: DetectedLetterLayout,
  expectedDieIds: readonly string[],
  dictionary: ReadonlySet<string>,
): CrosswordValidation {
  const uniqueExpectedIds = new Set(expectedDieIds);
  const expectedIdsAreValid = expectedDieIds.length > 0 &&
    uniqueExpectedIds.size === expectedDieIds.length;
  const crossword = layout.crosswords.length === 1
    ? layout.crosswords[0]
    : undefined;
  const crosswordIds = new Set(crossword?.cells.map(({ dieId }) => dieId));
  const isContiguous = expectedIdsAreValid && crossword !== undefined &&
    stringsMatchGrid(layout) &&
    crosswordIds.size === uniqueExpectedIds.size &&
    crossword.cells.length === crosswordIds.size &&
    [...uniqueExpectedIds].every((dieId) => crosswordIds.has(dieId));

  const words = layout.strings.map((word) => ({
    ...word,
    isValid: dictionary.has(word.text.toUpperCase()),
  }));
  const allWordsValid = words.length > 0 &&
    words.every(({ isValid }) => isValid);
  const validWordDieIds = new Set(words.flatMap((word) =>
    word.isValid ? [...word.dieIds] : []));
  const allDiceUsedInValidWords = expectedIdsAreValid &&
    [...uniqueExpectedIds].every((dieId) => validWordDieIds.has(dieId));

  return {
    isValid: isContiguous && allWordsValid && allDiceUsedInValidWords,
    isContiguous,
    allWordsValid,
    allDiceUsedInValidWords,
    words,
  };
}
