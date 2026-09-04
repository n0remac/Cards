import {
  ClientMessage,
  DieFace,
  DieMotionState,
  DragEnded,
  DragStarted,
  DragUpdated,
  RollMode,
  RollStarted,
  ServerMessage,
  TableBounds,
  TableDieState,
  TableEvent,
  TableSnapshot,
  Welcome,
  WorldQuaternion,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { STANDARD_LETTER_DIE_DEFINITION_IDS } from '../table/letterDice';
import { DiceTableTransport, ServerMessageListener } from './tableTransport';

const bounds = new TableBounds({ minX: -8, maxX: 8, minZ: -6, maxZ: 6 });

function transform(index: number): WorldTransform {
  return new WorldTransform({
    position: new WorldVector3({
      x: (index % 4 - 1.5) * 1.35,
      y: 3 + index * 0.005,
      z: (Math.floor(index / 4) - 1) * 1.35,
    }),
    rotation: new WorldQuaternion({ w: 1 }),
  });
}

// Controller tests use this in-process authority. Production never falls back
// to it when the WebSocket service is unavailable.
export function createLocalTableTransport(
  tableId = 'global-dice-table',
  playerId = 'local-player',
): DiceTableTransport {
  let revision = 0n;
  let physicsTick = 0n;
  const listeners = new Set<ServerMessageListener>();
  const dice = new Map<string, TableDieState>();

  const emitEvent = (requestId: string, payload: TableEvent['payload']) => {
    const event = new TableEvent({
      tableId,
      revision: ++revision,
      sourceRequestId: requestId,
      bounds,
      payload,
    });
    listeners.forEach((listener) => listener(new ServerMessage({
      payload: { case: 'event', value: event },
    })));
  };

  return {
    subscribe(onMessage, onStatus) {
      listeners.add(onMessage);
      onStatus('connected');
      onMessage(new ServerMessage({
        payload: {
          case: 'welcome',
          value: new Welcome({
            playerId,
            resumeToken: 'local-resume-token',
            snapshot: new TableSnapshot({
              tableId,
              revision,
              physicsTick,
              bounds,
              dice: [...dice.values()],
            }),
          }),
        },
      }));
      return () => listeners.delete(onMessage);
    },
    send(message: ClientMessage) {
      const command = message.payload;
      if (command.case === 'startRoll') {
        const targetIds = command.value.mode === RollMode.ADD_NEW
          ? STANDARD_LETTER_DIE_DEFINITION_IDS.map((_, index) =>
            `local-die-${index + 1}`)
          : command.value.targetDieIds;
        if (targetIds.length === 0) return false;
        const rollId = `local-roll-${Number(++physicsTick)}`;
        const startedDice = targetIds.map((dieId, index) => {
          const existing = dice.get(dieId);
          const die = new TableDieState({
            dieId,
            dieDefinitionId: existing?.dieDefinitionId ??
              STANDARD_LETTER_DIE_DEFINITION_IDS[index],
            ownerPlayerId: playerId,
            face: DieFace.UNSPECIFIED,
            revision: revision + 1n,
            transform: transform(index),
            motion: DieMotionState.ROLLING,
            activeRollId: rollId,
          });
          dice.set(dieId, die);
          return die;
        });
        emitEvent(message.requestId, {
          case: 'rollStarted',
          value: new RollStarted({
            rollId,
            rollerId: playerId,
            mode: command.value.mode,
            dice: startedDice,
            startTick: physicsTick,
          }),
        });
      } else if (command.case === 'startDrag' && command.value.target) {
        emitEvent(message.requestId, {
          case: 'dragStarted',
          value: new DragStarted({ ...command.value, playerId }),
        });
      } else if (command.case === 'updateDrag' && command.value.target) {
        emitEvent(message.requestId, {
          case: 'dragUpdated',
          value: new DragUpdated({ ...command.value, playerId }),
        });
      } else if (command.case === 'endDrag' && command.value.target) {
        emitEvent(message.requestId, {
          case: 'dragEnded',
          value: new DragEnded({ ...command.value, playerId }),
        });
      } else {
        return false;
      }
      return true;
    },
  };
}
