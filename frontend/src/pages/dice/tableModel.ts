import {
  DieFace,
  DieThrowSpec,
  NormalizedTablePosition,
  RollMode,
  RollResult,
  RollSpec,
  TableEvent,
} from '../../rpc/proto/dice/v1/dice_pb';
import { MAX_DEFINITIONS_PER_ADD } from './constants';
import { isPlayableDieFace, PlayableDieFace } from './diceMath';
import { isKnownLetterDieDefinitionId } from './letterDice';
import { validateRollSpec } from './rollModel';

export type DieBodyMode = 'rolling' | 'settled' | 'held';

export type TableDie = {
  dieId: string;
  dieDefinitionId: string;
  ownerPlayerId: string;
  revision: bigint;
  face: DieFace;
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
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  activeRoll?: ActiveTableRoll;
  lastResult?: RollResult;
  selectedDieIds: readonly string[];
};

export type DiceTableAction =
  | { type: 'event'; event: TableEvent }
  | { type: 'select'; dieIds: readonly string[] };

export function createInitialDiceTableState(
  tableId = 'local-table',
): DiceTableState {
  return {
    tableId,
    revision: 0n,
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
    ? spec.dice.length <= MAX_DEFINITIONS_PER_ADD &&
      targetIds.every((dieId) => !state.dice[dieId])
    : spec.dice.every((throwSpec) =>
      state.dice[throwSpec.dieId]?.dieDefinitionId ===
        throwSpec.dieDefinitionId);
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
      dieDefinitionId: throwSpec.dieDefinitionId,
      ownerPlayerId: existing?.ownerPlayerId || started.rollerId,
      revision: event.revision,
      face: existing?.face ?? DieFace.UNSPECIFIED,
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

  const expected = new Map(state.activeRoll.spec.dice.map((die) => [
    die.dieId,
    die,
  ]));
  const resultIds = result.dice.map((die) => die.dieId);
  if (result.dice.length !== expected.size ||
      new Set(resultIds).size !== expected.size ||
      result.dice.some((die) => {
        const expectedDie = expected.get(die.dieId);
        return !expectedDie || die.dieIndex !== expectedDie.dieIndex ||
          die.dieDefinitionId !== expectedDie.dieDefinitionId ||
          !isKnownLetterDieDefinitionId(die.dieDefinitionId) ||
          !isPlayableDieFace(die.face);
      })) {
    return state;
  }
  const resultById = new Map(result.dice.map((die) => [die.dieId, die.face]));
  const placementById = new Map(completed.changedPlacements.flatMap((placement) => {
    const position = clonePosition(placement.position);
    return position ? [[placement.dieId, position] as const] : [];
  }));
  const dice = { ...state.dice };

  for (const [dieId, die] of Object.entries(dice)) {
    const canonicalFace = resultById.get(dieId);
    const placement = placementById.get(dieId);
    if (canonicalFace !== undefined) {
      dice[dieId] = {
        ...die,
        face: canonicalFace,
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
    if (!entry.dieId || !position || !isPlayableDieFace(entry.face) ||
        !isKnownLetterDieDefinitionId(entry.dieDefinitionId) ||
        dice[entry.dieId]) {
      return state;
    }
    dice[entry.dieId] = {
      dieId: entry.dieId,
      dieDefinitionId: entry.dieDefinitionId,
      ownerPlayerId: entry.ownerPlayerId,
      revision: entry.revision,
      face: entry.face,
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
  const selectedDieIds = [...new Set(action.dieIds)]
    .filter((dieId) => state.dice[dieId]?.mode === 'settled');
  return { ...state, selectedDieIds };
}

export function playableTableFace(die: TableDie): PlayableDieFace | undefined {
  return isPlayableDieFace(die.face) ? die.face : undefined;
}
