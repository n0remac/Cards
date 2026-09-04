import { describe, expect, it } from 'vitest';
import { snapToAdjacentDie } from './dieSnapping';

describe('snapToAdjacentDie', () => {
  it.each([
    [{ x: 1.49, z: 0.49 }, { x: 1, z: 0 }],
    [{ x: -1.49, z: -0.49 }, { x: -1, z: 0 }],
    [{ x: 0.49, z: 1.49 }, { x: 0, z: 1 }],
    [{ x: -0.49, z: -1.49 }, { x: 0, z: -1 }],
  ])('aligns a nearby die perfectly along an edge', (position, expected) => {
    expect(snapToAdjacentDie(position, [{ x: 0, z: 0 }], 1))
      .toEqual(expected);
  });

  it('includes positions exactly half a die width from alignment', () => {
    expect(snapToAdjacentDie(
      { x: 1.5, z: 0.5 },
      [{ x: 0, z: 0 }],
      1,
    )).toEqual({ x: 1, z: 0 });
  });

  it('does not snap beyond half a die width', () => {
    const position = { x: 1.51, z: 0.2 };
    expect(snapToAdjacentDie(position, [{ x: 0, z: 0 }], 1))
      .toBe(position);
  });

  it('uses the closest available edge when dice are grouped', () => {
    expect(snapToAdjacentDie(
      { x: 2.42, z: 0.1 },
      [{ x: 0, z: 0 }, { x: 1, z: 0 }],
      1,
    )).toEqual({ x: 2, z: 0 });
  });

  it('does not snap on top of an occupied edge position', () => {
    const position = { x: 1.2, z: 0.1 };
    expect(snapToAdjacentDie(
      position,
      [{ x: 0, z: 0 }, { x: 1, z: 0 }],
      1,
    )).toBe(position);
  });
});
