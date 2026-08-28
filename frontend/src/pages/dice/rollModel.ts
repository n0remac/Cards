import {
  DieResult,
  DieThrowSpec,
  DieValue,
  Quaternion,
  RollResult,
  RollSpec,
  Vector3,
} from '../../rpc/proto/dice/v1/dice_pb';
import {
  HORIZONTAL_IMPULSE_MAX,
  MAX_DICE,
  MAX_ROLL_ID,
  MIN_DICE,
  MIN_TORQUE_MAGNITUDE,
  QUATERNION_TOLERANCE,
  SIMULATION_VERSION,
  SPAWN_HEIGHT_MAX,
  SPAWN_HEIGHT_MIN,
  SPAWN_JITTER,
  SPAWN_SLOTS,
  TORQUE_MAX,
  VERTICAL_IMPULSE_MAX,
} from './constants';
import {
  isPlayableDieValue,
  PlayableDieValue,
  VectorLike,
} from './diceMath';

export type RandomSource = () => number;

export type IndexedDieValue = {
  dieIndex: number;
  value: PlayableDieValue;
};

export type RollSettledEvent = {
  rollId: number;
  dice: readonly IndexedDieValue[];
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
  return new Vector3({
    x: float32(x),
    y: float32(y),
    z: float32(z),
  });
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
  const components = [
    randomBetween(random, -TORQUE_MAX, TORQUE_MAX),
    randomBetween(random, -TORQUE_MAX, TORQUE_MAX),
    randomBetween(random, -TORQUE_MAX, TORQUE_MAX),
  ];
  if (Math.hypot(...components) < MIN_TORQUE_MAGNITUDE) {
    const axis = dieIndex % 3;
    components[axis] = components[axis] < 0
      ? -MIN_TORQUE_MAGNITUDE
      : MIN_TORQUE_MAGNITUDE;
  }
  return createVector(components[0], components[1], components[2]);
}

export function createLocalRollSpec(
  count: number,
  rollId: number,
  random: RandomSource = Math.random,
): RollSpec {
  if (!Number.isInteger(count) || count < MIN_DICE || count > MAX_DICE) {
    throw new Error(`Dice count must be between ${MIN_DICE} and ${MAX_DICE}.`);
  }
  if (!Number.isInteger(rollId) || rollId <= 0 || rollId > MAX_ROLL_ID) {
    throw new Error('Roll ID must be a positive uint32 value.');
  }

  const dice = SPAWN_SLOTS.slice(0, count).map(([slotX, slotZ], dieIndex) =>
    new DieThrowSpec({
      dieIndex,
      position: createVector(
        slotX + randomBetween(random, -SPAWN_JITTER, SPAWN_JITTER),
        randomBetween(random, SPAWN_HEIGHT_MIN, SPAWN_HEIGHT_MAX),
        slotZ + randomBetween(random, -SPAWN_JITTER, SPAWN_JITTER),
      ),
      rotation: createUniformQuaternion(random),
      impulse: createVector(
        randomBetween(random, -HORIZONTAL_IMPULSE_MAX, HORIZONTAL_IMPULSE_MAX),
        randomBetween(random, 0, VERTICAL_IMPULSE_MAX),
        randomBetween(random, -HORIZONTAL_IMPULSE_MAX, HORIZONTAL_IMPULSE_MAX),
      ),
      torque: createTorque(random, dieIndex),
    }),
  );

  return new RollSpec({
    simulationVersion: SIMULATION_VERSION,
    rollId,
    dice,
  });
}

function isFiniteFloat32(value: number): boolean {
  return Number.isFinite(value) && Math.fround(value) === value;
}

function vectorIsValid(vector: Vector3 | undefined): boolean {
  return Boolean(
    vector &&
      isFiniteFloat32(vector.x) &&
      isFiniteFloat32(vector.y) &&
      isFiniteFloat32(vector.z),
  );
}

function quaternionIsValid(quaternion: Quaternion | undefined): boolean {
  if (
    !quaternion ||
    !isFiniteFloat32(quaternion.x) ||
    !isFiniteFloat32(quaternion.y) ||
    !isFiniteFloat32(quaternion.z) ||
    !isFiniteFloat32(quaternion.w)
  ) {
    return false;
  }
  const length = Math.hypot(
    quaternion.x,
    quaternion.y,
    quaternion.z,
    quaternion.w,
  );
  return Math.abs(length - 1) <= QUATERNION_TOLERANCE;
}

export function validateRollSpec(spec: RollSpec): string[] {
  const errors: string[] = [];
  if (spec.simulationVersion !== SIMULATION_VERSION) {
    errors.push(`Unsupported simulation version ${spec.simulationVersion}.`);
  }
  if (
    !Number.isInteger(spec.rollId) ||
    spec.rollId <= 0 ||
    spec.rollId > MAX_ROLL_ID
  ) {
    errors.push('Roll ID must be a positive uint32 value.');
  }
  if (spec.dice.length < MIN_DICE || spec.dice.length > MAX_DICE) {
    errors.push(`A roll must contain between ${MIN_DICE} and ${MAX_DICE} dice.`);
  }

  const sortedIndices = spec.dice.map((die) => die.dieIndex).sort((a, b) => a - b);
  if (sortedIndices.some((index, position) => index !== position)) {
    errors.push('Die indices must be unique and contiguous from zero.');
  }

  for (const die of spec.dice) {
    if (!vectorIsValid(die.position)) {
      errors.push(`Die ${die.dieIndex} has an invalid position.`);
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
  if (errors.length > 0) {
    throw new Error(errors.join(' '));
  }
}

export function createRollResult(
  spec: RollSpec,
  settled: ReadonlyMap<number, PlayableDieValue>,
): RollResult {
  assertValidRollSpec(spec);
  if (settled.size !== spec.dice.length) {
    throw new Error('Cannot complete a roll before every die has settled.');
  }

  const dice = spec.dice
    .map((die) => {
      const value = settled.get(die.dieIndex);
      if (value === undefined || !isPlayableDieValue(value)) {
        throw new Error(`Missing a valid result for die ${die.dieIndex}.`);
      }
      return new DieResult({ dieIndex: die.dieIndex, value });
    })
    .sort((a, b) => a.dieIndex - b.dieIndex);

  return new RollResult({
    simulationVersion: spec.simulationVersion,
    rollId: spec.rollId,
    dice,
    total: dice.reduce((total, die) => total + die.value, 0),
  });
}

export function createRollResultFromSettledEvent(
  spec: RollSpec,
  event: RollSettledEvent,
): RollResult | undefined {
  if (event.rollId !== spec.rollId || event.dice.length !== spec.dice.length) {
    return undefined;
  }

  const expectedIndices = new Set(spec.dice.map((die) => die.dieIndex));
  const settled = new Map<number, PlayableDieValue>();
  for (const die of event.dice) {
    if (
      !expectedIndices.has(die.dieIndex) ||
      settled.has(die.dieIndex) ||
      !isPlayableDieValue(die.value)
    ) {
      return undefined;
    }
    settled.set(die.dieIndex, die.value);
  }

  return createRollResult(spec, settled);
}

export function createEscapeRecovery(
  die: DieThrowSpec,
  escapedPosition: VectorLike,
): DieThrowSpec {
  const [slotX, slotZ] = SPAWN_SLOTS[die.dieIndex] ?? SPAWN_SLOTS[0];
  const centerImpulseX = Math.max(-1.5, Math.min(1.5, -escapedPosition.x * 0.4));
  const centerImpulseZ = Math.max(-1.5, Math.min(1.5, -escapedPosition.z * 0.4));

  return new DieThrowSpec({
    dieIndex: die.dieIndex,
    position: createVector(slotX, 4, slotZ),
    rotation: die.rotation
      ? new Quaternion({
          x: die.rotation.x,
          y: die.rotation.y,
          z: die.rotation.z,
          w: die.rotation.w,
        })
      : undefined,
    impulse: createVector(centerImpulseX, 0.25, centerImpulseZ),
    torque: die.torque
      ? createVector(die.torque.x * 0.5, die.torque.y * 0.5, die.torque.z * 0.5)
      : undefined,
  });
}

export function orderedValues(result: RollResult | undefined): PlayableDieValue[] {
  if (!result) {
    return [];
  }
  return [...result.dice]
    .sort((a, b) => a.dieIndex - b.dieIndex)
    .map((die) => die.value)
    .filter(isPlayableDieValue);
}
