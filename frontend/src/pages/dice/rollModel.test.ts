import { describe, expect, it } from 'vitest';
import { DieValue, RollSpec } from '../../rpc/proto/dice/v1/dice_pb';
import { DICE_TABLE_CONFIG, MAX_DICE, SIMULATION_VERSION } from './constants';
import {
  createLocalRollSpec,
  createRollResultFromSettledEvent,
  RollTarget,
  validateRollSpec,
} from './rollModel';

const midpointRandom = () => 0.5;
const targets = (count: number): RollTarget[] =>
  Array.from({ length: count }, (_, index) => ({ dieId: `die-${index}` }));

describe('createLocalRollSpec', () => {
  it('creates stable, indexed, normalized float32 animation inputs', () => {
    const spec = createLocalRollSpec(targets(MAX_DICE), 'roll-42', midpointRandom);
    expect(spec.simulationVersion).toBe(SIMULATION_VERSION);
    expect(spec.rollId).toBe('roll-42');
    expect(spec.dice.map((die) => die.dieId)).toEqual(
      targets(MAX_DICE).map((die) => die.dieId),
    );
    spec.dice.forEach((die, index) => {
      expect(die.dieIndex).toBe(index);
      expect(die.tablePosition?.u).toBeGreaterThanOrEqual(0);
      expect(die.tablePosition?.u).toBeLessThanOrEqual(1);
      expect(die.tablePosition?.v).toBeGreaterThanOrEqual(0);
      expect(die.tablePosition?.v).toBeLessThanOrEqual(1);
      expect(die.position?.y).toBeGreaterThanOrEqual(
        DICE_TABLE_CONFIG.roll.spawnHeightMinimum,
      );
      expect(die.position?.y).toBeLessThanOrEqual(
        DICE_TABLE_CONFIG.roll.spawnHeightMaximum,
      );
      for (const value of [
        die.position?.x,
        die.position?.y,
        die.position?.z,
        die.tablePosition?.u,
        die.tablePosition?.v,
      ]) {
        expect(Math.fround(value ?? Number.NaN)).toBe(value);
      }
    });
  });

  it('uses only the injected random source', () => {
    const first = createLocalRollSpec(targets(3), 'roll-12', midpointRandom);
    const second = createLocalRollSpec(targets(3), 'roll-12', midpointRandom);
    expect(RollSpec.equals(first, second)).toBe(true);
  });

  it('uses supplied normalized positions for reroll animation', () => {
    const spec = createLocalRollSpec([
      { dieId: 'stable-die', position: { u: 0.84, v: 0.72 } },
    ], 'reroll-1', midpointRandom);
    expect(spec.dice[0].tablePosition?.u).toBeCloseTo(0.84);
    expect(spec.dice[0].tablePosition?.v).toBeCloseTo(0.72);
  });

  it('survives a protobuf round trip without changing animation inputs', () => {
    const spec = createLocalRollSpec(targets(3), 'roll-9', midpointRandom);
    const replay = RollSpec.fromBinary(spec.toBinary());
    expect(RollSpec.equals(spec, replay)).toBe(true);
  });

  it('rejects invalid target sets and IDs', () => {
    expect(() => createLocalRollSpec([], 'roll', midpointRandom)).toThrow(/between/);
    expect(() => createLocalRollSpec(targets(MAX_DICE + 1), 'roll', midpointRandom))
      .toThrow(/between/);
    expect(() => createLocalRollSpec(targets(1), '', midpointRandom)).toThrow(/Roll ID/);
    expect(() => createLocalRollSpec([
      { dieId: 'same' },
      { dieId: 'same' },
    ], 'roll', midpointRandom)).toThrow(/unique stable ID/);
  });
});

describe('validateRollSpec', () => {
  it('accepts generated specs', () => {
    expect(validateRollSpec(
      createLocalRollSpec(targets(3), 'roll-1', midpointRandom),
    )).toEqual([]);
  });

  it('reports version, identity, ordering, normalized, and quaternion errors', () => {
    const spec = createLocalRollSpec(targets(2), 'roll-1', midpointRandom);
    spec.simulationVersion += 1;
    spec.dice[1].dieIndex = 0;
    spec.dice[1].dieId = spec.dice[0].dieId;
    spec.dice[0].rotation!.w = 8;
    spec.dice[0].tablePosition!.u = 2;
    const errors = validateRollSpec(spec).join(' ');
    expect(errors).toMatch(/Unsupported simulation version/);
    expect(errors).toMatch(/unique and contiguous/);
    expect(errors).toMatch(/IDs must be non-empty and unique/);
    expect(errors).toMatch(/invalid table position/);
    expect(errors).toMatch(/invalid rotation/);
  });
});

describe('createRollResultFromSettledEvent', () => {
  it('rejects stale and duplicate reports, then returns stable IDs in roll order', () => {
    const spec = createLocalRollSpec(targets(3), 'roll-7', midpointRandom);
    const dice = [
      { dieId: 'die-2', dieIndex: 2, value: DieValue.SIX },
      { dieId: 'die-0', dieIndex: 0, value: DieValue.FOUR },
      { dieId: 'die-1', dieIndex: 1, value: DieValue.TWO },
    ] as const;
    expect(createRollResultFromSettledEvent(spec, {
      rollId: 'old-roll',
      dice,
      placements: [],
    })).toBeUndefined();
    expect(createRollResultFromSettledEvent(spec, {
      rollId: spec.rollId,
      dice: [dice[0], dice[0], dice[1]],
      placements: [],
    })).toBeUndefined();

    const result = createRollResultFromSettledEvent(spec, {
      rollId: spec.rollId,
      dice,
      placements: [],
    });
    expect(result?.dice.map((die) => [die.dieId, die.value])).toEqual([
      ['die-0', DieValue.FOUR],
      ['die-1', DieValue.TWO],
      ['die-2', DieValue.SIX],
    ]);
    expect(result?.total).toBe(12);
  });
});
