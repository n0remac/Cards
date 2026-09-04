import {
  useCallback, useEffect, useMemo, useReducer, useRef, useState,
} from 'react';
import {
  ClientMessage,
  EndDragCommand,
  PhysicsFrame,
  RollMode,
  ServerMessage,
  StartDragCommand,
  StartRollCommand,
  TablePoint,
  UpdateDragCommand,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { DiceConnectionStatus, DiceTableTransport } from '../sync/tableTransport';
import { createWebSocketTableTransport } from '../sync/webSocketTableTransport';
import {
  LetterDieDefinitionId,
  STANDARD_LETTER_DIE_DEFINITION_IDS,
} from './letterDice';
import {
  createRerollTargetIds,
  createRollAllRequest,
  isStandardFirstRoll,
} from './tableCommands';
import {
  createInitialDiceTableState,
  diceTableReducer,
  DiceTableState,
} from './tableModel';

let fallbackId = 0;
function uniqueId(prefix: string): string {
  const browserCrypto = typeof crypto === 'undefined'
    ? undefined
    : crypto as Crypto & { randomUUID?: () => string };
  if (browserCrypto?.randomUUID) return `${prefix}-${browserCrypto.randomUUID()}`;
  fallbackId += 1;
  return `${prefix}-${Date.now()}-${fallbackId}`;
}

type LocalDrag = {
  dieId: string;
  interactionId: string;
  sequence: bigint;
  target: TablePoint;
  lastSentAt: number;
};

export type DiceTableController = DiceTableState & {
  localPlayerId: string;
  connectionStatus: DiceConnectionStatus;
  connectionError?: string;
  roomReady: boolean;
  pendingRoll: boolean;
  localRollActive: boolean;
  activeRollCount: number;
  ownedDieIds: readonly string[];
  latestPhysicsFrame?: PhysicsFrame;
  roomGeneration: number;
  phase: 'idle' | 'rolling' | 'settled';
  rollAll: () => boolean;
  rollNew: (definitionIds: readonly LetterDieDefinitionId[]) => boolean;
  reroll: (dieIds: readonly string[]) => boolean;
  rerollSelected: () => boolean;
  setSelectedDieIds: (dieIds: readonly string[]) => void;
  startDrag: (dieId: string, target: TablePoint) => string | undefined;
  updateDrag: (
    dieId: string,
    interactionId: string,
    target: TablePoint,
  ) => void;
  endDrag: (
    dieId: string,
    interactionId: string,
    target: TablePoint,
  ) => void;
};

export type UseDiceTableOptions = {
  tableId?: string;
  transport?: DiceTableTransport;
};

export function useDiceTable(
  options: UseDiceTableOptions = {},
): DiceTableController {
  const tableId = options.tableId ?? 'global-dice-table';
  const transport = useMemo(
    () => options.transport ?? createWebSocketTableTransport(),
    [options.transport],
  );
  const [state, dispatch] = useReducer(
    diceTableReducer, tableId, createInitialDiceTableState,
  );
  const [localPlayerId, setLocalPlayerId] = useState('');
  const [connectionStatus, setConnectionStatus] =
    useState<DiceConnectionStatus>('connecting');
  const [connectionError, setConnectionError] = useState<string>();
  const [pendingRollRequestId, setPendingRollRequestId] = useState<string>();
  const [latestPhysicsFrame, setLatestPhysicsFrame] =
    useState<PhysicsFrame>();
  const [roomGeneration, setRoomGeneration] = useState(0);
  const [dragVersion, setDragVersion] = useState(0);
  const stateRef = useRef(state);
  const playerRef = useRef(localPlayerId);
  const pendingRollRef = useRef(pendingRollRequestId);
  const localDrags = useRef(new Map<string, LocalDrag>());

  useEffect(() => { stateRef.current = state; }, [state]);
  useEffect(() => { playerRef.current = localPlayerId; }, [localPlayerId]);
  useEffect(() => { pendingRollRef.current = pendingRollRequestId; },
    [pendingRollRequestId]);

  const clearTransientState = useCallback(() => {
    localDrags.current.clear();
    setDragVersion((version) => version + 1);
    pendingRollRef.current = undefined;
    setPendingRollRequestId(undefined);
  }, []);

  useEffect(() => transport.subscribe((message: ServerMessage) => {
    const payload = message.payload;
    if (payload.case === 'welcome') {
      if (!payload.value.snapshot) return;
      dispatch({ type: 'snapshot', snapshot: payload.value.snapshot });
      setLatestPhysicsFrame(undefined);
      setLocalPlayerId(payload.value.playerId);
      setConnectionError(undefined);
      setRoomGeneration((generation) => generation + 1);
      clearTransientState();
      return;
    }
    if (payload.case === 'physicsFrame') {
      dispatch({ type: 'frame', frame: payload.value });
      setLatestPhysicsFrame(payload.value);
      return;
    }
    if (payload.case === 'event') {
      dispatch({ type: 'event', event: payload.value });
      if (payload.value.sourceRequestId === pendingRollRef.current) {
        pendingRollRef.current = undefined;
        setPendingRollRequestId(undefined);
      }
      if (payload.value.payload.case === 'dragEnded') {
        const interactionId = payload.value.payload.value.interactionId;
        if (localDrags.current.delete(interactionId)) {
          setDragVersion((version) => version + 1);
        }
      }
      return;
    }
    if (payload.case === 'rejected') {
      setConnectionError(payload.value.message);
      if (payload.value.requestId === pendingRollRef.current) {
        pendingRollRef.current = undefined;
        setPendingRollRequestId(undefined);
      }
      localDrags.current.clear();
      setDragVersion((version) => version + 1);
    }
  }, (status) => {
    setConnectionStatus(status);
    if (status !== 'connected') clearTransientState();
  }), [clearTransientState, transport]);

  const send = useCallback((message: ClientMessage): boolean => {
    if (connectionStatus !== 'connected' || !playerRef.current) return false;
    const sent = transport.send(message);
    if (!sent) {
      setConnectionStatus('reconnecting');
      clearTransientState();
    }
    return sent;
  }, [clearTransientState, connectionStatus, transport]);

  const startRoll = useCallback((
    mode: RollMode.ADD_NEW | RollMode.REROLL_EXISTING,
    targetDieIds: readonly string[],
  ) => {
    const current = stateRef.current;
    const playerId = playerRef.current;
    if (!playerId || pendingRollRef.current ||
        Object.values(current.activeRolls).some((roll) =>
          roll.rollerId === playerId) ||
        (mode === RollMode.REROLL_EXISTING && targetDieIds.length === 0)) {
      return false;
    }
    const requestId = uniqueId('request');
    pendingRollRef.current = requestId;
    setPendingRollRequestId(requestId);
    const sent = send(new ClientMessage({
      requestId,
      payload: {
        case: 'startRoll',
        value: new StartRollCommand({ mode, targetDieIds: [...targetDieIds] }),
      },
    }));
    if (!sent) clearTransientState();
    return sent;
  }, [clearTransientState, send]);

  const rollNew = useCallback((
    definitionIds: readonly LetterDieDefinitionId[],
  ) => isStandardFirstRoll(definitionIds) &&
    startRoll(RollMode.ADD_NEW, []), [startRoll]);

  const reroll = useCallback((dieIds: readonly string[]) => {
    const targets = createRerollTargetIds(
      stateRef.current, dieIds, playerRef.current,
    );
    return targets ? startRoll(RollMode.REROLL_EXISTING, targets) : false;
  }, [startRoll]);

  const rollAll = useCallback(() => {
    const playerId = playerRef.current;
    if (!playerId) return false;
    const request = createRollAllRequest(stateRef.current, playerId);
    return request ? startRoll(request.mode, request.targetDieIds) : false;
  }, [startRoll]);

  const startDrag = useCallback((dieId: string, target: TablePoint) => {
    const die = stateRef.current.dice[dieId];
    if (!die || die.mode !== 'settled' ||
        die.ownerPlayerId !== playerRef.current) return undefined;
    const interactionId = uniqueId('drag');
    const drag: LocalDrag = {
      dieId,
      interactionId,
      sequence: 0n,
      target,
      lastSentAt: performance.now(),
    };
    localDrags.current.set(interactionId, drag);
    setDragVersion((version) => version + 1);
    const sent = send(new ClientMessage({
      requestId: uniqueId('request'),
      payload: {
        case: 'startDrag',
        value: new StartDragCommand({
          dieId, interactionId, sequence: 0n, target,
        }),
      },
    }));
    if (!sent) {
      localDrags.current.delete(interactionId);
      setDragVersion((version) => version + 1);
      return undefined;
    }
    return interactionId;
  }, [send]);

  const publishDrag = useCallback((
    ending: boolean,
    dieId: string,
    interactionId: string,
    target: TablePoint,
  ) => {
    const drag = localDrags.current.get(interactionId);
    if (!drag || drag.dieId !== dieId) return;
    drag.target = target;
    setDragVersion((version) => version + 1);
    const now = performance.now();
    if (!ending && now - drag.lastSentAt < 1000 / 30) return;
    drag.sequence += 1n;
    drag.lastSentAt = now;
    const payload = ending
      ? {
        case: 'endDrag' as const,
        value: new EndDragCommand({
          dieId, interactionId, sequence: drag.sequence, target,
        }),
      }
      : {
        case: 'updateDrag' as const,
        value: new UpdateDragCommand({
          dieId, interactionId, sequence: drag.sequence, target,
        }),
      };
    send(new ClientMessage({ requestId: uniqueId('request'), payload }));
  }, [send]);

  const setSelectedDieIds = useCallback((dieIds: readonly string[]) => {
    dispatch({
      type: 'select',
      dieIds: dieIds.filter((dieId) =>
        stateRef.current.dice[dieId]?.ownerPlayerId === playerRef.current),
    });
  }, []);

  const dice = useMemo(() => {
    void dragVersion;
    let decorated = state.dice;
    for (const drag of localDrags.current.values()) {
      const die = decorated[drag.dieId];
      if (!die?.transform.rotation) continue;
      decorated = {
        ...decorated,
        [drag.dieId]: {
          ...die,
          transform: new WorldTransform({
            position: new WorldVector3({
              x: drag.target.x,
              y: 0.58,
              z: drag.target.z,
            }),
            rotation: die.transform.rotation,
          }),
          mode: 'held',
          interaction: {
            interactionId: drag.interactionId,
            playerId: localPlayerId,
            sequence: drag.sequence,
          },
        },
      };
    }
    return decorated;
  }, [dragVersion, localPlayerId, state.dice]);

  const ownedDieIds = state.dieOrder.filter((dieId) =>
    state.dice[dieId]?.ownerPlayerId === localPlayerId);
  const localRollActive = Object.values(state.activeRolls).some((roll) =>
    roll.rollerId === localPlayerId);
  return {
    ...state,
    dice,
    localPlayerId,
    connectionStatus,
    connectionError,
    roomReady: connectionStatus === 'connected' && Boolean(localPlayerId),
    pendingRoll: Boolean(pendingRollRequestId),
    localRollActive,
    activeRollCount: Object.keys(state.activeRolls).length,
    ownedDieIds,
    latestPhysicsFrame,
    roomGeneration,
    phase: localRollActive ? 'rolling' : ownedDieIds.length ? 'settled' : 'idle',
    rollAll,
    rollNew,
    reroll,
    rerollSelected: () => reroll(stateRef.current.selectedDieIds),
    setSelectedDieIds,
    startDrag,
    updateDrag: (dieId, interactionId, target) =>
      publishDrag(false, dieId, interactionId, target),
    endDrag: (dieId, interactionId, target) =>
      publishDrag(true, dieId, interactionId, target),
  };
}

export const STANDARD_FIRST_ROLL_DEFINITIONS =
  STANDARD_LETTER_DIE_DEFINITION_IDS;
