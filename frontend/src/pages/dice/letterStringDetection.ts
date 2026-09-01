import type { ArenaPoint } from './arenaLayout';

export type LetterStringDirection = 'horizontal' | 'vertical';

export type PositionedLetter = {
  dieId: string;
  letter: string;
  position: ArenaPoint;
};

export type DetectedLetterString = {
  direction: LetterStringDirection;
  text: string;
  dieIds: readonly string[];
};

export type DetectedCrosswordCell = {
  dieId: string;
  letter: string;
  row: number;
  column: number;
};

export type DetectedCrossword = {
  cells: readonly DetectedCrosswordCell[];
  width: number;
  height: number;
};

export type DetectedLetterLayout = {
  strings: readonly DetectedLetterString[];
  crosswords: readonly DetectedCrossword[];
};

export type LetterStringDetectionConfig = {
  dieWidth: number;
  minimumAxisDistanceRatio: number;
  maximumAxisDistanceRatio: number;
  maximumCrossAxisOffsetRatio: number;
};

type AdjacencyLink = {
  firstId: string;
  secondId: string;
  direction: LetterStringDirection;
};

type LetterRun = DetectedLetterString & {
  crossAxisCenter: number;
  axisStart: number;
};

type GridPosition = {
  row: number;
  column: number;
};

type GridNeighbor = GridPosition & {
  dieId: string;
};

function axisCoordinates(
  position: ArenaPoint,
  direction: LetterStringDirection,
) {
  return direction === 'horizontal'
    ? { axis: position.x, crossAxis: position.z }
    : { axis: position.z, crossAxis: position.x };
}

function areAdjacent(
  first: PositionedLetter,
  second: PositionedLetter,
  direction: LetterStringDirection,
  config: LetterStringDetectionConfig,
): boolean {
  const firstCoordinates = axisCoordinates(first.position, direction);
  const secondCoordinates = axisCoordinates(second.position, direction);
  const axisDistance = Math.abs(
    firstCoordinates.axis - secondCoordinates.axis,
  );
  const crossAxisOffset = Math.abs(
    firstCoordinates.crossAxis - secondCoordinates.crossAxis,
  );

  return axisDistance >= config.dieWidth * config.minimumAxisDistanceRatio &&
    axisDistance <= config.dieWidth * config.maximumAxisDistanceRatio &&
    crossAxisOffset <=
      config.dieWidth * config.maximumCrossAxisOffsetRatio;
}

function createAdjacencyLinks(
  letters: readonly PositionedLetter[],
  config: LetterStringDetectionConfig,
): AdjacencyLink[] {
  const links: AdjacencyLink[] = [];
  for (let firstIndex = 0; firstIndex < letters.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < letters.length;
      secondIndex += 1
    ) {
      const first = letters[firstIndex];
      const second = letters[secondIndex];
      (['horizontal', 'vertical'] as const).forEach((direction) => {
        if (!areAdjacent(first, second, direction, config)) {
          return;
        }
        const firstAxis = axisCoordinates(first.position, direction).axis;
        const secondAxis = axisCoordinates(second.position, direction).axis;
        const firstComesFirst = firstAxis < secondAxis ||
          (firstAxis === secondAxis && first.dieId < second.dieId);
        links.push({
          firstId: firstComesFirst ? first.dieId : second.dieId,
          secondId: firstComesFirst ? second.dieId : first.dieId,
          direction,
        });
      });
    }
  }
  return links;
}

function detectRuns(
  letters: readonly PositionedLetter[],
  links: readonly AdjacencyLink[],
  direction: LetterStringDirection,
): LetterRun[] {
  const neighbors = new Map<string, Set<string>>();
  const lettersById = new Map(letters.map((letter) => [letter.dieId, letter]));
  links.filter((link) => link.direction === direction).forEach((link) => {
    const firstNeighbors = neighbors.get(link.firstId) ?? new Set<string>();
    const secondNeighbors = neighbors.get(link.secondId) ?? new Set<string>();
    firstNeighbors.add(link.secondId);
    secondNeighbors.add(link.firstId);
    neighbors.set(link.firstId, firstNeighbors);
    neighbors.set(link.secondId, secondNeighbors);
  });

  const visited = new Set<string>();
  const runs: LetterRun[] = [];
  for (const letter of letters) {
    if (visited.has(letter.dieId) || !neighbors.has(letter.dieId)) {
      continue;
    }

    const pending = [letter.dieId];
    const component: PositionedLetter[] = [];
    visited.add(letter.dieId);
    while (pending.length > 0) {
      const dieId = pending.pop()!;
      const current = lettersById.get(dieId);
      if (current) {
        component.push(current);
      }
      for (const neighborId of neighbors.get(dieId) ?? []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          pending.push(neighborId);
        }
      }
    }

    component.sort((first, second) => {
      const firstCoordinates = axisCoordinates(first.position, direction);
      const secondCoordinates = axisCoordinates(second.position, direction);
      return firstCoordinates.axis - secondCoordinates.axis ||
        firstCoordinates.crossAxis - secondCoordinates.crossAxis ||
        first.dieId.localeCompare(second.dieId);
    });
    const crossAxisCenter = component.reduce((sum, current) =>
      sum + axisCoordinates(current.position, direction).crossAxis, 0,
    ) / component.length;

    runs.push({
      direction,
      text: component.map(({ letter: currentLetter }) => currentLetter).join(''),
      dieIds: component.map(({ dieId }) => dieId),
      crossAxisCenter,
      axisStart: axisCoordinates(component[0].position, direction).axis,
    });
  }

  return runs.sort((first, second) =>
    first.crossAxisCenter - second.crossAxisCenter ||
    first.axisStart - second.axisStart ||
    first.dieIds.join('\0').localeCompare(second.dieIds.join('\0')),
  );
}

function addGridNeighbor(
  neighbors: Map<string, GridNeighbor[]>,
  sourceId: string,
  neighbor: GridNeighbor,
) {
  const sourceNeighbors = neighbors.get(sourceId) ?? [];
  sourceNeighbors.push(neighbor);
  neighbors.set(sourceId, sourceNeighbors);
}

function detectCrosswords(
  letters: readonly PositionedLetter[],
  links: readonly AdjacencyLink[],
): DetectedCrossword[] {
  const lettersById = new Map(letters.map((letter) => [letter.dieId, letter]));
  const neighbors = new Map<string, GridNeighbor[]>();
  links.forEach(({ firstId, secondId, direction }) => {
    const step = direction === 'horizontal'
      ? { row: 0, column: 1 }
      : { row: 1, column: 0 };
    addGridNeighbor(neighbors, firstId, { dieId: secondId, ...step });
    addGridNeighbor(neighbors, secondId, {
      dieId: firstId,
      row: -step.row,
      column: -step.column,
    });
  });
  neighbors.forEach((gridNeighbors) => gridNeighbors.sort((first, second) =>
    first.row - second.row ||
    first.column - second.column ||
    first.dieId.localeCompare(second.dieId),
  ));

  const orderedLetters = [...letters].sort((first, second) =>
    first.position.z - second.position.z ||
    first.position.x - second.position.x ||
    first.dieId.localeCompare(second.dieId),
  );
  const visited = new Set<string>();
  const crosswords: DetectedCrossword[] = [];
  for (const root of orderedLetters) {
    if (visited.has(root.dieId) || !neighbors.has(root.dieId)) {
      continue;
    }

    const positions = new Map<string, GridPosition>([
      [root.dieId, { row: 0, column: 0 }],
    ]);
    const pending = [root.dieId];
    visited.add(root.dieId);
    for (let pendingIndex = 0; pendingIndex < pending.length; pendingIndex += 1) {
      const dieId = pending[pendingIndex];
      const sourcePosition = positions.get(dieId)!;
      for (const neighbor of neighbors.get(dieId) ?? []) {
        if (!positions.has(neighbor.dieId)) {
          positions.set(neighbor.dieId, {
            row: sourcePosition.row + neighbor.row,
            column: sourcePosition.column + neighbor.column,
          });
        }
        if (!visited.has(neighbor.dieId)) {
          visited.add(neighbor.dieId);
          pending.push(neighbor.dieId);
        }
      }
    }

    const minimumRow = Math.min(...[...positions.values()].map(({ row }) => row));
    const minimumColumn = Math.min(
      ...[...positions.values()].map(({ column }) => column),
    );
    const cells = [...positions].flatMap(([dieId, position]) => {
      const currentLetter = lettersById.get(dieId);
      return currentLetter ? [{
        dieId,
        letter: currentLetter.letter,
        row: position.row - minimumRow,
        column: position.column - minimumColumn,
      }] : [];
    }).sort((first, second) =>
      first.row - second.row ||
      first.column - second.column ||
      first.dieId.localeCompare(second.dieId),
    );
    crosswords.push({
      cells,
      width: Math.max(...cells.map(({ column }) => column)) + 1,
      height: Math.max(...cells.map(({ row }) => row)) + 1,
    });
  }
  return crosswords;
}

function validLetters(sourceLetters: readonly PositionedLetter[]) {
  const seenIds = new Set<string>();
  return sourceLetters.filter(({ dieId, letter, position }) => {
    if (!dieId || !letter || seenIds.has(dieId) ||
        !Number.isFinite(position.x) || !Number.isFinite(position.z)) {
      return false;
    }
    seenIds.add(dieId);
    return true;
  });
}

export function detectLetterLayout(
  sourceLetters: readonly PositionedLetter[],
  config: LetterStringDetectionConfig,
): DetectedLetterLayout {
  if (!Number.isFinite(config.dieWidth) || config.dieWidth <= 0) {
    return { strings: [], crosswords: [] };
  }
  const letters = validLetters(sourceLetters);
  const links = createAdjacencyLinks(letters, config);
  const strings = [
    ...detectRuns(letters, links, 'horizontal'),
    ...detectRuns(letters, links, 'vertical'),
  ].map(({ crossAxisCenter: _crossAxisCenter, axisStart: _axisStart, ...run }) =>
    run);

  return { strings, crosswords: detectCrosswords(letters, links) };
}

export function detectLetterStrings(
  sourceLetters: readonly PositionedLetter[],
  config: LetterStringDetectionConfig,
): DetectedLetterString[] {
  return [...detectLetterLayout(sourceLetters, config).strings];
}
