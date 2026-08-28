import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  DiePlacement,
  DragEnded,
  DragStarted,
  DragUpdated,
  NormalizedTablePosition,
  RollCompleted,
  RollMode,
  RollStarted,
  TableEvent,
} from '../../rpc/proto/dice/v1/dice_pb';
import { MAX_DICE, MIN_DICE } from './constants';
import {
  createRollResultFromSettledEvent,
  createLocalRollSpec,
  RollSettledEvent,
} from './rollModel';
import {
  createInitialDiceTableState,
  diceTableReducer,
  DiceTableState,
} from './tableModel';
import {
  createLocalTableEventAdapter,
  DiceTableEventAdapter,
} from './tableEventAdapter';

let fallbackId = 0;
function uniqueId(prefix: string): string {
  const browserCrypto = typeof crypto === 'undefined'
    ? undefined
    : crypto as Crypto & { randomUUID?: () => string };
  if (browserCrypto?.randomUUID) {
    return `${prefix}-${browserCrypto.randomUUID()}`;
  }
  fallbackId += 1;
  return `${prefix}-${Date.now()}-${fallbackId}`;
}

export type DiceTableController = DiceTableState & {
  localPlayerId: string;
  phase: 'idle' | 'rolling' | 'settled';
  changeCount: (delta: number) => void;
  rollNew: (count?: number) => boolean;
  reroll: (dieIds: readonly string[]) => boolean;
  rerollSelected: () => boolean;
  setSelectedDieIds: (dieIds: readonly string[]) => void;
  reportSettled: (event: RollSettledEvent) => void;
  startDrag: (
    dieId: string,
    position: NormalizedTablePosition,
  ) => string | undefined;
  updateDrag: (
    dieId: string,
    interactionId: string,
    position: NormalizedTablePosition,
  ) => void;
  endDrag: (
    dieId: string,
    interactionId: string,
    position: NormalizedTablePosition,
  ) => void;
  applyEvent: (event: TableEvent) => void;
};

export type UseDiceTableOptions = {
  tableId?: string;
  playerId?: string;
  adapter?: DiceTableEventAdapter;
};

export function useDiceTable(
  options: UseDiceTableOptions = {},
): DiceTableController {
  const tableId = options.tableId ?? 'local-dice-table';
  const playerId = useMemo(
    () => options.playerId ?? uniqueId('local-player'),
    [options.playerId],
  );
  const localAdapter = useMemo(
    () => options.adapter ?? createLocalTableEventAdapter(tableId),
    [options.adapter, tableId],
  );
  const [state, dispatch] = useReducer(
    diceTableReducer,
    tableId,
    createInitialDiceTableState,
  );
  const stateRef = useRef(state);
  const dragSequences = useRef(new Map<string, bigint>());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(
    () => localAdapter.subscribe((event) => dispatch({ type: 'event', event })),
    [localAdapter],
  );

  const changeCount = useCallback((delta: number) => {
    dispatch({ type: 'change-count', delta });
  }, []);

  const startRoll = useCallback((mode: RollMode, dieIds: readonly string[]) => {
    const current = stateRef.current;
    if (current.activeRoll || dieIds.length < MIN_DICE || dieIds.length > MAX_DICE) {
      return false;
    }
    const rollId = uniqueId('roll');
    const targets = dieIds.map((dieId) => ({
      dieId,
      position: mode === RollMode.REROLL_EXISTING
        ? current.dice[dieId]?.position
        : undefined,
    }));
    if (targets.some(({ position }) =>
      mode === RollMode.REROLL_EXISTING && !position)) {
      return false;
    }
    const animationSpec = createLocalRollSpec(targets, rollId);
    localAdapter.publish({
      case: 'rollStarted',
      value: new RollStarted({ rollId, rollerId: playerId, mode, animationSpec }),
    });
    return true;
  }, [localAdapter, playerId]);

  const rollNew = useCallback((count = stateRef.current.count) => {
    const dieIds = Array.from({ length: count }, () => uniqueId('die'));
    return startRoll(RollMode.ADD_NEW, dieIds);
  }, [startRoll]);

  const reroll = useCallback((dieIds: readonly string[]) =>
    startRoll(RollMode.REROLL_EXISTING, [...new Set(dieIds)]), [startRoll]);

  const reportSettled = useCallback((event: RollSettledEvent) => {
    const current = stateRef.current;
    const active = current.activeRoll;
    if (!active || active.rollerId !== playerId || active.rollId !== event.rollId) {
      return;
    }
    const result = createRollResultFromSettledEvent(active.spec, event);
    if (!result) {
      return;
    }
    localAdapter.publish({
      case: 'rollCompleted',
      value: new RollCompleted({
        rollId: active.rollId,
        rollerId: playerId,
        animationSpec: active.spec,
        result,
        changedPlacements: event.placements.map(({ dieId, position }) =>
          new DiePlacement({ dieId, position })),
      }),
    });
  }, [localAdapter, playerId]);

  const startDrag = useCallback((
    dieId: string,
    position: NormalizedTablePosition,
  ) => {
    const die = stateRef.current.dice[dieId];
    if (!die || die.mode !== 'settled') {
      return undefined;
    }
    const interactionId = uniqueId('drag');
    dragSequences.current.set(interactionId, 0n);
    localAdapter.publish({
      case: 'dragStarted',
      value: new DragStarted({
        dieId,
        playerId,
        interactionId,
        sequence: 0n,
        position,
      }),
    });
    return interactionId;
  }, [localAdapter, playerId]);

  const publishDrag = useCallback((
    ending: boolean,
    dieId: string,
    interactionId: string,
    position: NormalizedTablePosition,
  ) => {
    const previous = dragSequences.current.get(interactionId);
    if (previous === undefined) {
      return;
    }
    const sequence = previous + 1n;
    dragSequences.current.set(interactionId, sequence);
    localAdapter.publish(ending ? {
      case: 'dragEnded',
      value: new DragEnded({ dieId, playerId, interactionId, sequence, position }),
    } : {
      case: 'dragUpdated',
      value: new DragUpdated({ dieId, playerId, interactionId, sequence, position }),
    });
    if (ending) {
      dragSequences.current.delete(interactionId);
    }
  }, [localAdapter, playerId]);

  const setSelectedDieIds = useCallback((dieIds: readonly string[]) => {
    dispatch({ type: 'select', dieIds });
  }, []);

  return {
    ...state,
    localPlayerId: playerId,
    phase: state.activeRoll ? 'rolling' : state.lastResult ? 'settled' : 'idle',
    changeCount,
    rollNew,
    reroll,
    rerollSelected: () => reroll(stateRef.current.selectedDieIds),
    setSelectedDieIds,
    reportSettled,
    startDrag,
    updateDrag: (dieId, interactionId, position) =>
      publishDrag(false, dieId, interactionId, position),
    endDrag: (dieId, interactionId, position) =>
      publishDrag(true, dieId, interactionId, position),
    applyEvent: localAdapter.receive,
  };
}
