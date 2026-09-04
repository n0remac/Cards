import { describe, expect, it } from 'vitest';
import {
  ActiveRoll,
  DieFace,
  DieMotionState,
  DieResult,
  DieTransform,
  DragEnded,
  DragStarted,
  PhysicsFrame,
  RollCompleted,
  RollMode,
  RollResult,
  RollStarted,
  TableBounds,
  TableDieState,
  TableEvent,
  TablePoint,
  TableSnapshot,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  applyPhysicsFrame,
  applyTableEvent,
  applyTableSnapshot,
  createInitialDiceTableState,
  identityWorldTransform,
} from './tableModel';

const bounds = new TableBounds({ minX: -8, maxX: 8, minZ: -6, maxZ: 6 });

function die(
  dieId: string,
  ownerPlayerId: string,
  x: number,
  motion = DieMotionState.SETTLED,
) {
  return new TableDieState({
    dieId,
    ownerPlayerId,
    dieDefinitionId: 'letter-die-01',
    face: motion === DieMotionState.ROLLING ? DieFace.UNSPECIFIED : DieFace.ONE,
    revision: 1n,
    motion,
    transform: identityWorldTransform(x, motion === DieMotionState.ROLLING ? 3 : 0.5, 0),
  });
}

function event(revision: bigint, payload: TableEvent['payload']) {
  return new TableEvent({
    tableId: 'global-dice-table',
    revision,
    bounds,
    payload,
  });
}

describe('authoritative table reducer', () => {
  it('hydrates active rolls and absolute transforms from a snapshot', () => {
    const snapshot = new TableSnapshot({
      tableId: 'global-dice-table',
      revision: 4n,
      physicsTick: 90n,
      bounds,
      dice: [die('a', 'player-a', 100.125, DieMotionState.ROLLING)],
      activeRolls: [new ActiveRoll({
        rollId: 'roll-a',
        rollerId: 'player-a',
        mode: RollMode.ADD_NEW,
        targetDieIds: ['a'],
        startTick: 80n,
      })],
    });
    const state = applyTableSnapshot(createInitialDiceTableState(), snapshot);
    expect(state.physicsTick).toBe(90n);
    expect(state.dice.a.transform.position?.x).toBe(100.125);
    expect(state.activeRolls['roll-a'].targetDieIds).toEqual(['a']);
  });

  it('allows concurrent disjoint rolls and completes them independently', () => {
    let state = createInitialDiceTableState();
    state = applyTableEvent(state, event(1n, {
      case: 'rollStarted',
      value: new RollStarted({
        rollId: 'roll-a', rollerId: 'player-a', mode: RollMode.ADD_NEW,
        startTick: 1n,
        dice: [die('a', 'player-a', -1, DieMotionState.ROLLING)],
      }),
    }));
    state = applyTableEvent(state, event(2n, {
      case: 'rollStarted',
      value: new RollStarted({
        rollId: 'roll-b', rollerId: 'player-b', mode: RollMode.ADD_NEW,
        startTick: 2n,
        dice: [die('b', 'player-b', 1, DieMotionState.ROLLING)],
      }),
    }));
    expect(Object.keys(state.activeRolls)).toHaveLength(2);
    const settled = die('a', 'player-a', -2, DieMotionState.SETTLED);
    settled.face = DieFace.FOUR;
    state = applyTableEvent(state, event(3n, {
      case: 'rollCompleted',
      value: new RollCompleted({
        rollId: 'roll-a', rollerId: 'player-a', completedTick: 100n,
        result: new RollResult({
          rollId: 'roll-a',
          dice: [new DieResult({ dieId: 'a', face: DieFace.FOUR })],
        }),
        changedDice: [settled],
      }),
    }));
    expect(state.activeRolls['roll-a']).toBeUndefined();
    expect(state.activeRolls['roll-b']).toBeDefined();
    expect(state.dice.a.face).toBe(DieFace.FOUR);
  });

  it('applies only newer physics frames', () => {
    let state = applyTableSnapshot(createInitialDiceTableState(), new TableSnapshot({
      tableId: 'global-dice-table', bounds, physicsTick: 5n,
      dice: [die('a', 'player-a', 0)],
    }));
    const next = applyPhysicsFrame(state, new PhysicsFrame({
      tick: 8n,
      bounds: new TableBounds({ minX: -8, maxX: 10, minZ: -6, maxZ: 6 }),
      dice: [new DieTransform({
        dieId: 'a', motion: DieMotionState.SETTLED, revision: 2n,
        transform: identityWorldTransform(7, 0.5, 2),
      })],
    }));
    expect(next.dice.a.transform.position?.x).toBe(7);
    expect(applyPhysicsFrame(next, new PhysicsFrame({
      tick: 7n, bounds, dice: [],
    }))).toBe(next);
  });

  it('tracks authoritative drag sequences in world coordinates', () => {
    let state = applyTableSnapshot(createInitialDiceTableState(), new TableSnapshot({
      tableId: 'global-dice-table', bounds,
      dice: [die('a', 'player-a', 0)],
    }));
    state = applyTableEvent(state, event(1n, {
      case: 'dragStarted',
      value: new DragStarted({
        dieId: 'a', playerId: 'player-a', interactionId: 'drag',
        target: new TablePoint({ x: 20, z: -10 }),
      }),
    }));
    expect(state.dice.a.mode).toBe('held');
    expect(state.dice.a.transform.position).toMatchObject({ x: 20, z: -10 });
    state = applyTableEvent(state, event(2n, {
      case: 'dragEnded',
      value: new DragEnded({
        dieId: 'a', playerId: 'player-a', interactionId: 'drag', sequence: 1n,
        target: new TablePoint({ x: 21, z: -11 }),
      }),
    }));
    expect(state.dice.a.mode).toBe('settled');
    expect(state.dice.a.transform.position?.y).toBe(0.5);
  });
});
