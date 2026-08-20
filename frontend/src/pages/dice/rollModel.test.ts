import { describe, expect, it } from 'vitest';
import {
  DieValue,
  RollSpec,
} from '../../rpc/proto/dice/v1/dice_pb';
import {
  HORIZONTAL_IMPULSE_MAX,
  MAX_DICE,
  MAX_ROLL_ID,
  MIN_TORQUE_MAGNITUDE,
  SIMULATION_VERSION,
  SPAWN_HEIGHT_MAX,
  SPAWN_HEIGHT_MIN,
  SPAWN_SLOTS,
  VERTICAL_IMPULSE_MAX,
} from './constants';
import { PlayableDieValue } from './diceMath';
import {
  createEscapeRecovery,
  createLocalRollSpec,
  recordSettledEvent,
  validateRollSpec,
} from './rollModel';

const midpointRandom = () => 0.5;

describe('createLocalRollSpec', () => {
  it('creates indexed, bounded, non-overlapping float32 throws', () => {
    const spec = createLocalRollSpec(MAX_DICE, 42, midpointRandom);

    expect(spec.simulationVersion).toBe(SIMULATION_VERSION);
    expect(spec.rollId).toBe(42);
    expect(spec.dice.map((die) => die.dieIndex)).toEqual(
      Array.from({ length: MAX_DICE }, (_, index) => index),
    );

    for (const die of spec.dice) {
      expect(die.position?.y).toBeGreaterThanOrEqual(SPAWN_HEIGHT_MIN);
      expect(die.position?.y).toBeLessThanOrEqual(SPAWN_HEIGHT_MAX);
      const components = [
        die.position?.x,
        die.position?.y,
        die.position?.z,
        die.rotation?.x,
        die.rotation?.y,
        die.rotation?.z,
        die.rotation?.w,
        die.impulse?.x,
        die.impulse?.y,
        die.impulse?.z,
        die.torque?.x,
        die.torque?.y,
        die.torque?.z,
      ];
      expect(components.every((value) => value !== undefined && Math.fround(value) === value)).toBe(true);
      expect(die.impulse!.x).toBeGreaterThanOrEqual(-HORIZONTAL_IMPULSE_MAX);
      expect(die.impulse!.x).toBeLessThanOrEqual(HORIZONTAL_IMPULSE_MAX);
      expect(die.impulse!.y).toBeGreaterThanOrEqual(0);
      expect(die.impulse!.y).toBeLessThanOrEqual(VERTICAL_IMPULSE_MAX);
      expect(die.impulse!.z).toBeGreaterThanOrEqual(-HORIZONTAL_IMPULSE_MAX);
      expect(die.impulse!.z).toBeLessThanOrEqual(HORIZONTAL_IMPULSE_MAX);
      expect(Math.hypot(die.torque!.x, die.torque!.y, die.torque!.z)).toBeGreaterThanOrEqual(
        MIN_TORQUE_MAGNITUDE,
      );
    }

    for (let first = 0; first < spec.dice.length; first += 1) {
      for (let second = first + 1; second < spec.dice.length; second += 1) {
        const a = spec.dice[first].position!;
        const b = spec.dice[second].position!;
        expect(Math.hypot(a.x - b.x, a.z - b.z)).toBeGreaterThan(1);
      }
    }
  });

  it('uses only the injected random source', () => {
    const first = createLocalRollSpec(3, 12, midpointRandom);
    const second = createLocalRollSpec(3, 12, midpointRandom);

    expect(first.toJson()).toEqual(second.toJson());
  });

  it('survives a protobuf binary round trip without changing physics inputs', () => {
    const spec = createLocalRollSpec(3, 9, midpointRandom);
    const replay = RollSpec.fromBinary(spec.toBinary());

    expect(RollSpec.equals(spec, replay)).toBe(true);
    expect(replay.dice.map((die) => die.toJson())).toEqual(
      spec.dice.map((die) => die.toJson()),
    );
  });

  it('rejects invalid counts and IDs', () => {
    expect(() => createLocalRollSpec(0, 1, midpointRandom)).toThrow(/count/);
    expect(() => createLocalRollSpec(1, 0, midpointRandom)).toThrow(/Roll ID/);
    expect(() => createLocalRollSpec(1, MAX_ROLL_ID + 1, midpointRandom)).toThrow(/Roll ID/);
  });
});

describe('validateRollSpec', () => {
  it('accepts generated local specs', () => {
    expect(validateRollSpec(createLocalRollSpec(3, 1, midpointRandom))).toEqual([]);
  });

  it('reports unsupported versions, duplicate indices, and invalid rotations', () => {
    const spec = createLocalRollSpec(2, 1, midpointRandom);
    spec.simulationVersion = 99;
    spec.dice[1].dieIndex = 0;
    spec.dice[0].rotation!.w = 0;

    expect(validateRollSpec(spec).join(' ')).toMatch(/Unsupported simulation version/);
    expect(validateRollSpec(spec).join(' ')).toMatch(/unique and contiguous/);
    expect(validateRollSpec(spec).join(' ')).toMatch(/invalid rotation/);
  });

  it('requires present, finite float32 vectors and uint32 roll IDs', () => {
    const spec = createLocalRollSpec(2, 1, midpointRandom);
    spec.rollId = MAX_ROLL_ID + 1;
    spec.dice[0].position = undefined;
    spec.dice[1].impulse!.x = Number.NaN;
    spec.dice[1].torque!.z = 0.1;

    const errors = validateRollSpec(spec).join(' ');
    expect(errors).toMatch(/Roll ID/);
    expect(errors).toMatch(/invalid position/);
    expect(errors).toMatch(/invalid impulse/);
    expect(errors).toMatch(/invalid torque/);
  });
});

describe('recordSettledEvent', () => {
  it('ignores stale and duplicate events, then builds an ordered result', () => {
    const spec = createLocalRollSpec(3, 7, midpointRandom);
    let settled: ReadonlyMap<number, PlayableDieValue> = new Map();

    settled = recordSettledEvent(spec, settled, {
      rollId: 6,
      dieIndex: 0,
      value: DieValue.ONE,
    }).settled;
    expect(settled.size).toBe(0);

    settled = recordSettledEvent(spec, settled, {
      rollId: 7,
      dieIndex: 2,
      value: DieValue.SIX,
    }).settled;
    const duplicate = recordSettledEvent(spec, settled, {
      rollId: 7,
      dieIndex: 2,
      value: DieValue.ONE,
    });
    expect(duplicate.settled).toBe(settled);

    settled = recordSettledEvent(spec, settled, {
      rollId: 7,
      dieIndex: 0,
      value: DieValue.FOUR,
    }).settled;
    const completed = recordSettledEvent(spec, settled, {
      rollId: 7,
      dieIndex: 1,
      value: DieValue.TWO,
    });

    expect(completed.result?.dice.map((die) => die.dieIndex)).toEqual([0, 1, 2]);
    expect(completed.result?.dice.map((die) => die.value)).toEqual([
      DieValue.FOUR,
      DieValue.TWO,
      DieValue.SIX,
    ]);
    expect(completed.result?.total).toBe(12);
  });

  it('makes callbacks from a replaced roll stale', () => {
    const replaced = createLocalRollSpec(1, 20, midpointRandom);
    const active = createLocalRollSpec(1, 21, midpointRandom);
    const recorded = recordSettledEvent(active, new Map(), {
      rollId: replaced.rollId,
      dieIndex: 0,
      value: DieValue.THREE,
    });

    expect(recorded.settled.size).toBe(0);
    expect(recorded.result).toBeUndefined();
  });
});

describe('createEscapeRecovery', () => {
  it('is deterministic, uses the safe slot, and reduces torque', () => {
    const die = createLocalRollSpec(1, 1, midpointRandom).dice[0];
    const escaped = { x: 9, y: -3, z: -8 };
    const first = createEscapeRecovery(die, escaped);
    const second = createEscapeRecovery(die, escaped);

    expect(first.toJson()).toEqual(second.toJson());
    expect(first.position).toMatchObject({
      x: Math.fround(SPAWN_SLOTS[0][0]),
      y: 4,
      z: Math.fround(SPAWN_SLOTS[0][1]),
    });
    expect(first.impulse).toMatchObject({ x: -1.5, y: 0.25, z: 1.5 });
    expect(first.torque?.x).toBe(Math.fround(die.torque!.x * 0.5));
  });
});
