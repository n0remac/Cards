import {
  DieFace,
  DieMotionState,
  PhysicsFrame,
  RollMode,
  RollResult,
  TableBounds,
  TableDieState,
  TableEvent,
  TablePoint,
  TableSnapshot,
  WorldQuaternion,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { isPlayableDieFace, PlayableDieFace } from './diceMath';
import { isKnownLetterDieDefinitionId } from './letterDice';

export type DieBodyMode = 'rolling' | 'settled' | 'held';

export type TableDie = {
  dieId: string;
  dieDefinitionId: string;
  ownerPlayerId: string;
  revision: bigint;
  face: DieFace;
  transform: WorldTransform;
  mode: DieBodyMode;
  activeRollId?: string;
  interaction?: {
    interactionId: string;
    playerId: string;
    sequence: bigint;
  };
};

export type ActiveTableRoll = {
  rollId: string;
  rollerId: string;
  mode: RollMode;
  targetDieIds: readonly string[];
  startTick: bigint;
};

export type DiceTableState = {
  tableId: string;
  revision: bigint;
  physicsTick: bigint;
  bounds: TableBounds;
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  activeRolls: Readonly<Record<string, ActiveTableRoll>>;
  lastResult?: RollResult;
  selectedDieIds: readonly string[];
};

export type DiceTableAction =
  | { type: 'event'; event: TableEvent }
  | { type: 'snapshot'; snapshot: TableSnapshot }
  | { type: 'frame'; frame: PhysicsFrame }
  | { type: 'select'; dieIds: readonly string[] };

export const INITIAL_TABLE_BOUNDS = new TableBounds({
  minX: -8,
  maxX: 8,
  minZ: -6,
  maxZ: 6,
});

export function identityWorldTransform(
  x = 0,
  y = 0.5,
  z = 0,
): WorldTransform {
  return new WorldTransform({
    position: new WorldVector3({ x, y, z }),
    rotation: new WorldQuaternion({ w: 1 }),
  });
}

export function createInitialDiceTableState(
  tableId = 'global-dice-table',
): DiceTableState {
  return {
    tableId,
    revision: 0n,
    physicsTick: 0n,
    bounds: new TableBounds(INITIAL_TABLE_BOUNDS),
    dice: {},
    dieOrder: [],
    activeRolls: {},
    selectedDieIds: [],
  };
}

function cloneBounds(bounds: TableBounds | undefined): TableBounds | undefined {
  if (!bounds || ![bounds.minX, bounds.maxX, bounds.minZ, bounds.maxZ]
    .every(Number.isFinite) || bounds.minX >= bounds.maxX ||
      bounds.minZ >= bounds.maxZ) {
    return undefined;
  }
  return new TableBounds(bounds);
}

export function cloneWorldTransform(
  transform: WorldTransform | undefined,
): WorldTransform | undefined {
  const position = transform?.position;
  const rotation = transform?.rotation;
  if (!position || !rotation ||
      ![position.x, position.y, position.z, rotation.x, rotation.y,
        rotation.z, rotation.w].every(Number.isFinite) ||
      Math.max(Math.abs(position.x), Math.abs(position.y),
        Math.abs(position.z)) > 10_000 ||
      Math.hypot(rotation.x, rotation.y, rotation.z, rotation.w) < 1e-9) {
    return undefined;
  }
  return new WorldTransform({
    position: new WorldVector3(position),
    rotation: new WorldQuaternion(rotation),
  });
}

function modeFromProto(motion: DieMotionState): DieBodyMode | undefined {
  if (motion === DieMotionState.SETTLED) return 'settled';
  if (motion === DieMotionState.ROLLING) return 'rolling';
  if (motion === DieMotionState.DRAGGED) return 'held';
  return undefined;
}

function tableDieFromProto(entry: TableDieState): TableDie | undefined {
  const transform = cloneWorldTransform(entry.transform);
  const mode = modeFromProto(entry.motion);
  const faceValid = entry.face === DieFace.UNSPECIFIED
    ? mode === 'rolling'
    : isPlayableDieFace(entry.face);
  if (!entry.dieId || !entry.ownerPlayerId || !transform || !mode ||
      !faceValid || !isKnownLetterDieDefinitionId(entry.dieDefinitionId)) {
    return undefined;
  }
  return {
    dieId: entry.dieId,
    dieDefinitionId: entry.dieDefinitionId,
    ownerPlayerId: entry.ownerPlayerId,
    revision: entry.revision,
    face: entry.face,
    transform,
    mode,
    activeRollId: entry.activeRollId || undefined,
  };
}

function activeRollFromProto(
  roll: {
    rollId: string;
    rollerId: string;
    mode: RollMode;
    targetDieIds: readonly string[];
    startTick: bigint;
  },
): ActiveTableRoll | undefined {
  if (!roll.rollId || !roll.rollerId ||
      (roll.mode !== RollMode.ADD_NEW &&
       roll.mode !== RollMode.REROLL_EXISTING) ||
      roll.targetDieIds.length === 0 ||
      new Set(roll.targetDieIds).size !== roll.targetDieIds.length) {
    return undefined;
  }
  return {
    rollId: roll.rollId,
    rollerId: roll.rollerId,
    mode: roll.mode,
    targetDieIds: [...roll.targetDieIds],
    startTick: roll.startTick,
  };
}

export function applyTableSnapshot(
  state: DiceTableState,
  snapshot: TableSnapshot,
): DiceTableState {
  const bounds = cloneBounds(snapshot.bounds);
  if (snapshot.tableId !== state.tableId || !bounds) return state;
  const dice: Record<string, TableDie> = {};
  const dieOrder: string[] = [];
  for (const entry of snapshot.dice) {
    const die = tableDieFromProto(entry);
    if (!die || dice[die.dieId]) return state;
    dice[die.dieId] = die;
    dieOrder.push(die.dieId);
  }
  const activeRolls: Record<string, ActiveTableRoll> = {};
  const activePlayers = new Set<string>();
  const activeTargets = new Set<string>();
  for (const entry of snapshot.activeRolls) {
    const roll = activeRollFromProto(entry);
    if (!roll || activeRolls[roll.rollId] || activePlayers.has(roll.rollerId) ||
        roll.targetDieIds.some((dieId) => activeTargets.has(dieId) ||
          dice[dieId]?.ownerPlayerId !== roll.rollerId)) return state;
    activeRolls[roll.rollId] = roll;
    activePlayers.add(roll.rollerId);
    roll.targetDieIds.forEach((dieId) => activeTargets.add(dieId));
  }
  for (const drag of snapshot.activeDrags) {
    const die = dice[drag.dieId];
    if (!die || die.ownerPlayerId !== drag.playerId || !drag.interactionId ||
        activeTargets.has(drag.dieId)) return state;
    die.mode = 'held';
    die.interaction = {
      interactionId: drag.interactionId,
      playerId: drag.playerId,
      sequence: drag.sequence,
    };
    die.transform = transformAtPoint(die.transform, drag.target, 0.58) ??
      die.transform;
  }
  return {
    ...state,
    revision: snapshot.revision,
    physicsTick: snapshot.physicsTick,
    bounds,
    dice,
    dieOrder,
    activeRolls,
    selectedDieIds: state.selectedDieIds.filter((dieId) =>
      dice[dieId]?.mode === 'settled'),
  };
}

function transformAtPoint(
  previous: WorldTransform,
  point: TablePoint | undefined,
  height: number,
): WorldTransform | undefined {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.z) ||
      Math.max(Math.abs(point.x), Math.abs(point.z)) > 10_000 ||
      !previous.rotation) return undefined;
  return new WorldTransform({
    position: new WorldVector3({ x: point.x, y: height, z: point.z }),
    rotation: new WorldQuaternion(previous.rotation),
  });
}

function applyRollStarted(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  if (event.payload.case !== 'rollStarted') return state;
  const started = event.payload.value;
  const roll = activeRollFromProto({
    ...started,
    targetDieIds: started.dice.map(({ dieId }) => dieId),
  });
  if (!roll || state.activeRolls[roll.rollId] ||
      Object.values(state.activeRolls).some(({ rollerId }) =>
        rollerId === roll.rollerId)) return state;
  const dice = { ...state.dice };
  const dieOrder = [...state.dieOrder];
  for (const entry of started.dice) {
    const die = tableDieFromProto(entry);
    if (!die || die.ownerPlayerId !== roll.rollerId ||
        (dice[die.dieId] &&
         dice[die.dieId].ownerPlayerId !== roll.rollerId)) return state;
    if (!dice[die.dieId]) dieOrder.push(die.dieId);
    dice[die.dieId] = die;
  }
  return {
    ...state,
    revision: event.revision,
    physicsTick: started.startTick,
    bounds: cloneBounds(event.bounds) ?? state.bounds,
    dice,
    dieOrder,
    activeRolls: { ...state.activeRolls, [roll.rollId]: roll },
  };
}

function applyRollCompleted(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  if (event.payload.case !== 'rollCompleted') return state;
  const completed = event.payload.value;
  const active = state.activeRolls[completed.rollId];
  if (!active || completed.rollerId !== active.rollerId ||
      completed.result?.rollId !== active.rollId) return state;
  const dice = { ...state.dice };
  for (const entry of completed.changedDice) {
    const die = tableDieFromProto(entry);
    if (!die || !dice[die.dieId]) return state;
    dice[die.dieId] = die;
  }
  const activeRolls = { ...state.activeRolls };
  delete activeRolls[active.rollId];
  return {
    ...state,
    revision: event.revision,
    physicsTick: completed.completedTick,
    bounds: cloneBounds(event.bounds) ?? state.bounds,
    dice,
    activeRolls,
    lastResult: completed.result,
  };
}

function applyDragEvent(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  const payload = event.payload;
  if (payload.case !== 'dragStarted' && payload.case !== 'dragUpdated' &&
      payload.case !== 'dragEnded') return state;
  const drag = payload.value;
  const die = state.dice[drag.dieId];
  const transform = die && transformAtPoint(
    die.transform, drag.target, payload.case === 'dragEnded' ? 0.5 : 0.58,
  );
  if (!die || !transform || die.ownerPlayerId !== drag.playerId ||
      die.mode === 'rolling') return state;
  if (payload.case === 'dragStarted' &&
      (die.interaction || drag.sequence !== 0n)) return state;
  if (payload.case !== 'dragStarted' &&
      (!die.interaction ||
       die.interaction.interactionId !== drag.interactionId ||
       drag.sequence <= die.interaction.sequence)) return state;
  const ending = payload.case === 'dragEnded';
  return {
    ...state,
    revision: event.revision,
    bounds: cloneBounds(event.bounds) ?? state.bounds,
    dice: {
      ...state.dice,
      [die.dieId]: {
        ...die,
        revision: event.revision,
        transform,
        mode: ending ? 'settled' : 'held',
        interaction: ending ? undefined : {
          interactionId: drag.interactionId,
          playerId: drag.playerId,
          sequence: drag.sequence,
        },
      },
    },
  };
}

export function applyPhysicsFrame(
  state: DiceTableState,
  frame: PhysicsFrame,
): DiceTableState {
  const bounds = cloneBounds(frame.bounds);
  if (frame.tick <= state.physicsTick || !bounds) return state;
  const dice = { ...state.dice };
  for (const update of frame.dice) {
    const die = dice[update.dieId];
    const transform = cloneWorldTransform(update.transform);
    const mode = modeFromProto(update.motion);
    if (!die || !transform || !mode) continue;
    dice[update.dieId] = {
      ...die,
      revision: update.revision,
      transform,
      mode,
    };
  }
  return { ...state, physicsTick: frame.tick, bounds, dice };
}

export function applyTableEvent(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  if (event.tableId !== state.tableId || event.revision <= state.revision) {
    return state;
  }
  if (event.payload.case === 'rollStarted') return applyRollStarted(state, event);
  if (event.payload.case === 'rollCompleted') return applyRollCompleted(state, event);
  if (event.payload.case === 'dragStarted' ||
      event.payload.case === 'dragUpdated' ||
      event.payload.case === 'dragEnded') return applyDragEvent(state, event);
  if (event.payload.case === 'snapshot') {
    return applyTableSnapshot(state, event.payload.value);
  }
  return state;
}

export function diceTableReducer(
  state: DiceTableState,
  action: DiceTableAction,
): DiceTableState {
  if (action.type === 'event') return applyTableEvent(state, action.event);
  if (action.type === 'snapshot') return applyTableSnapshot(state, action.snapshot);
  if (action.type === 'frame') return applyPhysicsFrame(state, action.frame);
  const selectedDieIds = [...new Set(action.dieIds)].filter((dieId) =>
    state.dice[dieId]?.mode === 'settled');
  return { ...state, selectedDieIds };
}

export function playableTableFace(die: TableDie): PlayableDieFace | undefined {
  return isPlayableDieFace(die.face) ? die.face : undefined;
}
