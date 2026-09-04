import {
  DieResult,
  DieThrowSpec,
  NormalizedTablePosition,
  Quaternion,
  RollResult,
  RollSpec,
  Vector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { DICE_TABLE_CONFIG, SIMULATION_VERSION } from '../constants';
import { isPlayableDieFace, PlayableDieFace } from './diceMath';
import { isKnownLetterDieDefinitionId } from './letterDice';

export type RandomSource = () => number;
export type RollTarget = {
  dieId: string;
  dieDefinitionId: string;
  position?: Pick<NormalizedTablePosition, 'u' | 'v'>;
};
export type SettledDie = {
  dieId: string;
  dieIndex: number;
  face: PlayableDieFace;
};
export type SettledPlacement = {
  dieId: string;
  position: NormalizedTablePosition;
};
export type RollSettledEvent = {
  rollId: string;
  dice: readonly SettledDie[];
  placements: readonly SettledPlacement[];
};

const float32 = (value: number): number => Math.fround(value);

function sample(random: RandomSource): number {
  const value = random();
  if (!Number.isFinite(value)) {
    throw new Error('The dice random source returned a non-finite value.');
  }
  return Math.min(Math.max(value, 0), 1 - Number.EPSILON);
}

function randomBetween(
  random: RandomSource,
  minimum: number,
  maximum: number,
): number {
  return float32(minimum + (maximum - minimum) * sample(random));
}

function createVector(x: number, y: number, z: number): Vector3 {
  return new Vector3({ x: float32(x), y: float32(y), z: float32(z) });
}

function createUniformQuaternion(random: RandomSource): Quaternion {
  const u1 = sample(random);
  const u2 = sample(random);
  const u3 = sample(random);
  const rootOneMinusU1 = Math.sqrt(1 - u1);
  const rootU1 = Math.sqrt(u1);
  return new Quaternion({
    x: float32(rootOneMinusU1 * Math.sin(2 * Math.PI * u2)),
    y: float32(rootOneMinusU1 * Math.cos(2 * Math.PI * u2)),
    z: float32(rootU1 * Math.sin(2 * Math.PI * u3)),
    w: float32(rootU1 * Math.cos(2 * Math.PI * u3)),
  });
}

function createTorque(random: RandomSource, dieIndex: number): Vector3 {
  const { minimumTorqueMagnitude, torqueMaximum } = DICE_TABLE_CONFIG.roll;
  const components = [
    randomBetween(random, -torqueMaximum, torqueMaximum),
    randomBetween(random, -torqueMaximum, torqueMaximum),
    randomBetween(random, -torqueMaximum, torqueMaximum),
  ];
  if (Math.hypot(...components) < minimumTorqueMagnitude) {
    const axis = dieIndex % 3;
    components[axis] = components[axis] < 0
      ? -minimumTorqueMagnitude
      : minimumTorqueMagnitude;
  }
  return createVector(components[0], components[1], components[2]);
}

function normalizedSpawnPosition(
  target: RollTarget,
  dieIndex: number,
  random: RandomSource,
): NormalizedTablePosition {
  const { normalizedSpawnSlots, spawnJitter } = DICE_TABLE_CONFIG.roll;
  const fallback = normalizedSpawnSlots[dieIndex] ?? normalizedSpawnSlots[0];
  const source = target.position ?? {
    u: fallback[0] + randomBetween(random, -spawnJitter, spawnJitter),
    v: fallback[1] + randomBetween(random, -spawnJitter, spawnJitter),
  };
  return new NormalizedTablePosition({
    u: float32(Math.min(0.96, Math.max(0.04, source.u))),
    v: float32(Math.min(0.96, Math.max(0.04, source.v))),
  });
}

export function createLocalRollSpec(
  targets: readonly RollTarget[],
  rollId: string,
  random: RandomSource = Math.random,
): RollSpec {
  if (targets.length === 0) {
    throw new Error('A roll must contain at least one die.');
  }
  if (!rollId.trim()) {
    throw new Error('Roll ID must not be empty.');
  }
  if (new Set(targets.map(({ dieId }) => dieId)).size !== targets.length ||
      targets.some(({ dieId }) => !dieId.trim())) {
    throw new Error('Every rolled die must have a unique stable ID.');
  }
  if (targets.some(({ dieDefinitionId }) =>
    !isKnownLetterDieDefinitionId(dieDefinitionId))) {
    throw new Error('Every rolled die must use a known letter die definition.');
  }

  const {
    horizontalImpulseMaximum,
    spawnHeightMaximum,
    spawnHeightMinimum,
    verticalImpulseMaximum,
  } = DICE_TABLE_CONFIG.roll;
  const dice = targets.map((target, dieIndex) => {
    const tablePosition = normalizedSpawnPosition(target, dieIndex, random);
    const height = randomBetween(random, spawnHeightMinimum, spawnHeightMaximum);
    return new DieThrowSpec({
      dieIndex,
      dieId: target.dieId,
      dieDefinitionId: target.dieDefinitionId,
      tablePosition,
      position: createVector(tablePosition.u, height, tablePosition.v),
      rotation: createUniformQuaternion(random),
      impulse: createVector(
        randomBetween(random, -horizontalImpulseMaximum, horizontalImpulseMaximum),
        randomBetween(random, 0, verticalImpulseMaximum),
        randomBetween(random, -horizontalImpulseMaximum, horizontalImpulseMaximum),
      ),
      torque: createTorque(random, dieIndex),
    });
  });
  return new RollSpec({ simulationVersion: SIMULATION_VERSION, rollId, dice });
}

function isFiniteFloat32(value: number): boolean {
  return Number.isFinite(value) && Math.fround(value) === value;
}

function vectorIsValid(vector: Vector3 | undefined): boolean {
  return Boolean(vector && isFiniteFloat32(vector.x) &&
    isFiniteFloat32(vector.y) && isFiniteFloat32(vector.z));
}

function quaternionIsValid(quaternion: Quaternion | undefined): boolean {
  if (!quaternion || !isFiniteFloat32(quaternion.x) ||
      !isFiniteFloat32(quaternion.y) || !isFiniteFloat32(quaternion.z) ||
      !isFiniteFloat32(quaternion.w)) {
    return false;
  }
  const length = Math.hypot(
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w,
  );
  return Math.abs(length - 1) <= DICE_TABLE_CONFIG.roll.quaternionTolerance;
}

function normalizedPositionIsValid(
  position: NormalizedTablePosition | undefined,
): boolean {
  return Boolean(position && isFiniteFloat32(position.u) &&
    isFiniteFloat32(position.v) && position.u >= 0 && position.u <= 1 &&
    position.v >= 0 && position.v <= 1);
}

export function validateRollSpec(spec: RollSpec): string[] {
  const errors: string[] = [];
  if (spec.simulationVersion !== SIMULATION_VERSION) {
    errors.push(`Unsupported simulation version ${spec.simulationVersion}.`);
  }
  if (!spec.rollId.trim()) {
    errors.push('Roll ID must not be empty.');
  }
  if (spec.dice.length === 0) {
    errors.push('A roll must contain at least one die.');
  }

  const sortedIndices = spec.dice.map((die) => die.dieIndex).sort((a, b) => a - b);
  if (sortedIndices.some((index, position) => index !== position)) {
    errors.push('Die indices must be unique and contiguous from zero.');
  }
  const dieIds = spec.dice.map((die) => die.dieId);
  if (dieIds.some((dieId) => !dieId.trim()) ||
      new Set(dieIds).size !== dieIds.length) {
    errors.push('Die IDs must be non-empty and unique.');
  }
  if (spec.dice.some(({ dieDefinitionId }) =>
    !isKnownLetterDieDefinitionId(dieDefinitionId))) {
    errors.push('Every die must use a known letter die definition.');
  }

  for (const die of spec.dice) {
    if (!vectorIsValid(die.position)) {
      errors.push(`Die ${die.dieIndex} has an invalid position.`);
    }
    if (!normalizedPositionIsValid(die.tablePosition)) {
      errors.push(`Die ${die.dieIndex} has an invalid table position.`);
    }
    if (!quaternionIsValid(die.rotation)) {
      errors.push(`Die ${die.dieIndex} has an invalid rotation.`);
    }
    if (!vectorIsValid(die.impulse)) {
      errors.push(`Die ${die.dieIndex} has an invalid impulse.`);
    }
    if (!vectorIsValid(die.torque)) {
      errors.push(`Die ${die.dieIndex} has an invalid torque.`);
    }
  }
  return errors;
}

export function assertValidRollSpec(spec: RollSpec): void {
  const errors = validateRollSpec(spec);
  if (errors.length) {
    throw new Error(errors.join(' '));
  }
}

export function createRollResult(
  spec: RollSpec,
  settled: ReadonlyMap<string, PlayableDieFace>,
): RollResult {
  assertValidRollSpec(spec);
  if (settled.size !== spec.dice.length) {
    throw new Error('Cannot complete a roll before every die has settled.');
  }
  const dice = spec.dice.map((die) => {
    const face = settled.get(die.dieId);
    if (face === undefined || !isPlayableDieFace(face)) {
      throw new Error(`Missing a valid result for die ${die.dieId}.`);
    }
    return new DieResult({
      dieIndex: die.dieIndex,
      dieId: die.dieId,
      dieDefinitionId: die.dieDefinitionId,
      face,
    });
  }).sort((a, b) => a.dieIndex - b.dieIndex);
  return new RollResult({
    simulationVersion: spec.simulationVersion,
    rollId: spec.rollId,
    dice,
  });
}

export function createRollResultFromSettledEvent(
  spec: RollSpec,
  event: RollSettledEvent,
): RollResult | undefined {
  if (event.rollId !== spec.rollId || event.dice.length !== spec.dice.length) {
    return undefined;
  }
  const expectedIds = new Set(spec.dice.map((die) => die.dieId));
  const settled = new Map<string, PlayableDieFace>();
  for (const die of event.dice) {
    if (!expectedIds.has(die.dieId) || settled.has(die.dieId) ||
        !isPlayableDieFace(die.face)) {
      return undefined;
    }
    settled.set(die.dieId, die.face);
  }
  return createRollResult(spec, settled);
}
