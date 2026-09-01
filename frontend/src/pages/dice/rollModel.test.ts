import { describe, expect, it } from 'vitest';
import { DieFace, RollSpec } from '../../rpc/proto/dice/v1/dice_pb';
import { DICE_TABLE_CONFIG, SIMULATION_VERSION } from './constants';
import { STANDARD_LETTER_DIE_DEFINITION_IDS } from './letterDice';
import {
  createLocalRollSpec,
  createRollResultFromSettledEvent,
  RollTarget,
  validateRollSpec,
} from './rollModel';

const midpointRandom = () => 0.5;
const targets = (count: number): RollTarget[] =>
  Array.from({ length: count }, (_, index) => ({
    dieId: `die-${index}`,
    dieDefinitionId: STANDARD_LETTER_DIE_DEFINITION_IDS[
      index % STANDARD_LETTER_DIE_DEFINITION_IDS.length
    ],
  }));

describe('createLocalRollSpec', () => {
  it('creates stable, indexed, normalized float32 animation inputs', () => {
    const spec = createLocalRollSpec(targets(12), 'roll-42', midpointRandom);
    expect(spec.simulationVersion).toBe(SIMULATION_VERSION);
    expect(spec.rollId).toBe('roll-42');
    expect(spec.dice.map((die) => die.dieId)).toEqual(
      targets(12).map((die) => die.dieId),
    );
    spec.dice.forEach((die, index) => {
      expect(die.dieIndex).toBe(index);
      expect(die.dieDefinitionId).toBe(
        STANDARD_LETTER_DIE_DEFINITION_IDS[index],
      );
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

  it('keeps the initial linear impulse within compact-roll limits', () => {
    const maximum = createLocalRollSpec(targets(1), 'maximum-force', () => 1)
      .dice[0].impulse;
    const minimum = createLocalRollSpec(targets(1), 'minimum-force', () => 0)
      .dice[0].impulse;

    expect(maximum).toMatchObject({ x: 1.5, y: 1, z: 1.5 });
    expect(minimum).toMatchObject({ x: -1.5, y: 0, z: -1.5 });
  });

  it('uses supplied normalized positions for reroll animation', () => {
    const spec = createLocalRollSpec([
      {
        dieId: 'stable-die',
        dieDefinitionId: 'letter-die-01',
        position: { u: 0.84, v: 0.72 },
      },
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
    expect(() => createLocalRollSpec([], 'roll', midpointRandom))
      .toThrow(/at least one/);
    expect(() => createLocalRollSpec(targets(1), '', midpointRandom)).toThrow(/Roll ID/);
    expect(() => createLocalRollSpec([
      { dieId: 'same', dieDefinitionId: 'letter-die-01' },
      { dieId: 'same', dieDefinitionId: 'letter-die-02' },
    ], 'roll', midpointRandom)).toThrow(/unique stable ID/);
    expect(() => createLocalRollSpec([
      { dieId: 'die', dieDefinitionId: 'unknown' },
    ], 'roll', midpointRandom)).toThrow(/known letter die definition/);
  });

  it('allows reroll animation specs to include every die on a larger table', () => {
    expect(createLocalRollSpec(targets(15), 'reroll-all', midpointRandom).dice)
      .toHaveLength(15);
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
    spec.dice[0].dieDefinitionId = 'unknown';
    spec.dice[0].rotation!.w = 8;
    spec.dice[0].tablePosition!.u = 2;
    const errors = validateRollSpec(spec).join(' ');
    expect(errors).toMatch(/Unsupported simulation version/);
    expect(errors).toMatch(/unique and contiguous/);
    expect(errors).toMatch(/IDs must be non-empty and unique/);
    expect(errors).toMatch(/known letter die definition/);
    expect(errors).toMatch(/invalid table position/);
    expect(errors).toMatch(/invalid rotation/);
  });
});

describe('createRollResultFromSettledEvent', () => {
  it('rejects stale and duplicate reports, then returns stable IDs in roll order', () => {
    const spec = createLocalRollSpec(targets(3), 'roll-7', midpointRandom);
    const dice = [
      { dieId: 'die-2', dieIndex: 2, face: DieFace.SIX },
      { dieId: 'die-0', dieIndex: 0, face: DieFace.FOUR },
      { dieId: 'die-1', dieIndex: 1, face: DieFace.TWO },
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
    expect(result?.dice.map((die) => [
      die.dieId,
      die.dieDefinitionId,
      die.face,
    ])).toEqual([
      ['die-0', 'letter-die-01', DieFace.FOUR],
      ['die-1', 'letter-die-02', DieFace.TWO],
      ['die-2', 'letter-die-03', DieFace.SIX],
    ]);
  });
});
