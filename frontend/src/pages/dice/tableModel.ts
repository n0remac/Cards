import {
  DieThrowSpec,
  DieValue,
  NormalizedTablePosition,
  RollMode,
  RollResult,
  RollSpec,
  TableEvent,
} from '../../rpc/proto/dice/v1/dice_pb';
import { DEFAULT_DICE, MAX_DICE, MIN_DICE } from './constants';
import { isPlayableDieValue, PlayableDieValue } from './diceMath';
import { validateRollSpec } from './rollModel';

export type DieBodyMode = 'rolling' | 'settled' | 'held';

export type TableDie = {
  dieId: string;
  ownerPlayerId: string;
  revision: bigint;
  value: DieValue;
  position: NormalizedTablePosition;
  mode: DieBodyMode;
  activeRollId?: string;
  throwSpec?: DieThrowSpec;
  interaction?: {
    interactionId: string;
    playerId: string;
    sequence: bigint;
  };
  canonicalRevision?: bigint;
  canonicalSourcePlayerId?: string;
};

export type ActiveTableRoll = {
  rollId: string;
  rollerId: string;
  mode: RollMode;
  spec: RollSpec;
};

export type DiceTableState = {
  tableId: string;
  revision: bigint;
  count: number;
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  activeRoll?: ActiveTableRoll;
  lastResult?: RollResult;
  selectedDieIds: readonly string[];
};

export type DiceTableAction =
  | { type: 'event'; event: TableEvent }
  | { type: 'change-count'; delta: number }
  | { type: 'select'; dieIds: readonly string[] };

export function createInitialDiceTableState(
  tableId = 'local-table',
): DiceTableState {
  return {
    tableId,
    revision: 0n,
    count: DEFAULT_DICE,
    dice: {},
    dieOrder: [],
    selectedDieIds: [],
  };
}

function clonePosition(
  position: NormalizedTablePosition | undefined,
): NormalizedTablePosition | undefined {
  if (!position || !Number.isFinite(position.u) || !Number.isFinite(position.v)) {
    return undefined;
  }
  return new NormalizedTablePosition({
    u: Math.min(1, Math.max(0, position.u)),
    v: Math.min(1, Math.max(0, position.v)),
  });
}

function applyRollStarted(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  if (event.payload.case !== 'rollStarted' || state.activeRoll) {
    return state;
  }
  const started = event.payload.value;
  const spec = started.animationSpec;
  if (!spec || started.rollId !== spec.rollId ||
      validateRollSpec(spec).length > 0 ||
      (started.mode !== RollMode.ADD_NEW &&
       started.mode !== RollMode.REROLL_EXISTING)) {
    return state;
  }

  const targetIds = spec.dice.map((die) => die.dieId);
  const isAdd = started.mode === RollMode.ADD_NEW;
  const targetsAreValid = isAdd
    ? targetIds.every((dieId) => !state.dice[dieId])
    : targetIds.every((dieId) => Boolean(state.dice[dieId]));
  if (!targetsAreValid) {
    return state;
  }

  const dice = { ...state.dice };
  const dieOrder = [...state.dieOrder];
  for (const throwSpec of spec.dice) {
    const position = clonePosition(throwSpec.tablePosition);
    if (!position) {
      return state;
    }
    const existing = dice[throwSpec.dieId];
    dice[throwSpec.dieId] = {
      dieId: throwSpec.dieId,
      ownerPlayerId: existing?.ownerPlayerId || started.rollerId,
      revision: event.revision,
      value: existing?.value ?? DieValue.UNSPECIFIED,
      position,
      mode: 'rolling',
      activeRollId: started.rollId,
      throwSpec,
    };
    if (!existing) {
      dieOrder.push(throwSpec.dieId);
    }
  }

  return {
    ...state,
    revision: event.revision,
    dice,
    dieOrder,
    activeRoll: {
      rollId: started.rollId,
      rollerId: started.rollerId,
      mode: started.mode,
      spec,
    },
  };
}

function applyRollCompleted(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  if (event.payload.case !== 'rollCompleted' || !state.activeRoll) {
    return state;
  }
  const completed = event.payload.value;
  const result = completed.result;
  if (completed.rollId !== state.activeRoll.rollId || !result ||
      result.rollId !== completed.rollId ||
      result.simulationVersion !== state.activeRoll.spec.simulationVersion ||
      !completed.animationSpec ||
      !RollSpec.equals(completed.animationSpec, state.activeRoll.spec)) {
    return state;
  }

  const expected = new Set(state.activeRoll.spec.dice.map((die) => die.dieId));
  const resultIds = result.dice.map((die) => die.dieId);
  if (result.dice.length !== expected.size ||
      new Set(resultIds).size !== expected.size ||
      result.dice.some((die) =>
        !expected.has(die.dieId) || !isPlayableDieValue(die.value)) ||
      result.total !== result.dice.reduce((total, die) => total + die.value, 0)) {
    return state;
  }
  const resultById = new Map(result.dice.map((die) => [die.dieId, die.value]));
  const placementById = new Map(completed.changedPlacements.flatMap((placement) => {
    const position = clonePosition(placement.position);
    return position ? [[placement.dieId, position] as const] : [];
  }));
  const dice = { ...state.dice };

  for (const [dieId, die] of Object.entries(dice)) {
    const canonicalValue = resultById.get(dieId);
    const placement = placementById.get(dieId);
    if (canonicalValue !== undefined) {
      dice[dieId] = {
        ...die,
        value: canonicalValue,
        revision: event.revision,
        position: placement ?? die.position,
        mode: 'settled',
        activeRollId: undefined,
        throwSpec: undefined,
        interaction: undefined,
        canonicalRevision: event.revision,
        canonicalSourcePlayerId: completed.rollerId,
      };
    } else if (placement) {
      dice[dieId] = {
        ...die,
        revision: event.revision,
        position: placement,
        canonicalRevision: event.revision,
        canonicalSourcePlayerId: completed.rollerId,
      };
    }
  }

  return {
    ...state,
    revision: event.revision,
    dice,
    activeRoll: undefined,
    lastResult: result,
  };
}

function applyDragEvent(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  const payload = event.payload;
  if (payload.case !== 'dragStarted' && payload.case !== 'dragUpdated' &&
      payload.case !== 'dragEnded') {
    return state;
  }
  const drag = payload.value;
  const die = state.dice[drag.dieId];
  const position = clonePosition(drag.position);
  if (!die || !position || die.mode === 'rolling') {
    return state;
  }

  if (payload.case === 'dragStarted') {
    if (die.interaction) {
      return state;
    }
    return {
      ...state,
      revision: event.revision,
      dice: {
        ...state.dice,
        [die.dieId]: {
          ...die,
          revision: event.revision,
          position,
          mode: 'held',
          interaction: {
            interactionId: drag.interactionId,
            playerId: drag.playerId,
            sequence: drag.sequence,
          },
        },
      },
    };
  }

  if (!die.interaction || die.interaction.interactionId !== drag.interactionId ||
      die.interaction.playerId !== drag.playerId ||
      drag.sequence <= die.interaction.sequence) {
    return state;
  }
  const ending = payload.case === 'dragEnded';
  return {
    ...state,
    revision: event.revision,
    dice: {
      ...state.dice,
      [die.dieId]: {
        ...die,
        revision: event.revision,
        position,
        mode: ending ? 'settled' : 'held',
        interaction: ending ? undefined : {
          ...die.interaction,
          sequence: drag.sequence,
        },
      },
    },
  };
}

function applySnapshot(state: DiceTableState, event: TableEvent): DiceTableState {
  if (event.payload.case !== 'snapshot') {
    return state;
  }
  const snapshot = event.payload.value;
  if (snapshot.tableId !== state.tableId || snapshot.revision !== event.revision) {
    return state;
  }
  const dice: Record<string, TableDie> = {};
  const dieOrder: string[] = [];
  for (const entry of snapshot.dice) {
    const position = clonePosition(entry.position);
    if (!entry.dieId || !position || !isPlayableDieValue(entry.value) ||
        dice[entry.dieId]) {
      return state;
    }
    dice[entry.dieId] = {
      dieId: entry.dieId,
      ownerPlayerId: entry.ownerPlayerId,
      revision: entry.revision,
      value: entry.value,
      position,
      mode: 'settled',
    };
    dieOrder.push(entry.dieId);
  }
  return {
    ...state,
    revision: event.revision,
    dice,
    dieOrder,
    activeRoll: undefined,
    selectedDieIds: state.selectedDieIds.filter((dieId) => dice[dieId]),
  };
}

export function applyTableEvent(
  state: DiceTableState,
  event: TableEvent,
): DiceTableState {
  if (event.tableId !== state.tableId || event.revision <= state.revision) {
    return state;
  }
  switch (event.payload.case) {
    case 'rollStarted':
      return applyRollStarted(state, event);
    case 'rollCompleted':
      return applyRollCompleted(state, event);
    case 'dragStarted':
    case 'dragUpdated':
    case 'dragEnded':
      return applyDragEvent(state, event);
    case 'snapshot':
      return applySnapshot(state, event);
    default:
      return state;
  }
}

export function diceTableReducer(
  state: DiceTableState,
  action: DiceTableAction,
): DiceTableState {
  if (action.type === 'event') {
    return applyTableEvent(state, action.event);
  }
  if (action.type === 'change-count') {
    if (state.activeRoll) {
      return state;
    }
    return {
      ...state,
      count: Math.min(MAX_DICE, Math.max(MIN_DICE, state.count + action.delta)),
    };
  }
  const selectedDieIds = [...new Set(action.dieIds)]
    .filter((dieId) => state.dice[dieId]?.mode === 'settled')
    .slice(0, MAX_DICE);
  return { ...state, selectedDieIds };
}

export function playableTableValue(die: TableDie): PlayableDieValue | undefined {
  return isPlayableDieValue(die.value) ? die.value : undefined;
}
