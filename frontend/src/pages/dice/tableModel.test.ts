import { describe, expect, it } from 'vitest';
import {
  DiePlacement,
  DieValue,
  DragEnded,
  DragStarted,
  DragUpdated,
  NormalizedTablePosition,
  RollCompleted,
  RollMode,
  RollStarted,
  TableEvent,
} from '../../rpc/proto/dice/v1/dice_pb';
import { createLocalRollSpec, createRollResult } from './rollModel';
import { PlayableDieValue } from './diceMath';
import {
  applyTableEvent,
  createInitialDiceTableState,
  DiceTableState,
} from './tableModel';

const midpointRandom = () => 0.5;
const tableId = 'table';

function startEvent(
  revision: bigint,
  mode: RollMode,
  rollId: string,
  dieIds: readonly string[],
  state?: DiceTableState,
) {
  const spec = createLocalRollSpec(dieIds.map((dieId) => ({
    dieId,
    position: state?.dice[dieId]?.position,
  })), rollId, midpointRandom);
  return {
    spec,
    event: new TableEvent({
      tableId,
      revision,
      payload: {
        case: 'rollStarted',
        value: new RollStarted({
          rollId,
          rollerId: 'player-a',
          mode,
          animationSpec: spec,
        }),
      },
    }),
  };
}

function completeEvent(
  revision: bigint,
  state: DiceTableState,
  values: readonly PlayableDieValue[],
  extraPlacements: DiePlacement[] = [],
) {
  const active = state.activeRoll!;
  const settled = new Map(active.spec.dice.map((die, index) => [
    die.dieId,
    values[index]!,
  ]));
  const result = createRollResult(active.spec, settled);
  const rolledPlacements = active.spec.dice.map((die, index) =>
    new DiePlacement({
      dieId: die.dieId,
      position: new NormalizedTablePosition({
        u: 0.2 + index * 0.1,
        v: 0.7,
      }),
    }));
  return new TableEvent({
    tableId,
    revision,
    payload: {
      case: 'rollCompleted',
      value: new RollCompleted({
        rollId: active.rollId,
        rollerId: active.rollerId,
        animationSpec: active.spec,
        result,
        changedPlacements: [...rolledPlacements, ...extraPlacements],
      }),
    },
  });
}

function addSettledDice(dieIds: readonly string[]) {
  const initial = createInitialDiceTableState(tableId);
  const started = startEvent(1n, RollMode.ADD_NEW, 'roll-1', dieIds);
  const rolling = applyTableEvent(initial, started.event);
  return applyTableEvent(
    rolling,
    completeEvent(2n, rolling, dieIds.map(() => DieValue.THREE)),
  );
}

describe('dice table reducer', () => {
  it('keeps prior dice mounted when an additive roll completes', () => {
    const first = addSettledDice(['die-a']);
    const secondStart = startEvent(
      3n,
      RollMode.ADD_NEW,
      'roll-2',
      ['die-b', 'die-c'],
    );
    const rolling = applyTableEvent(first, secondStart.event);
    expect(rolling.dieOrder).toEqual(['die-a', 'die-b', 'die-c']);
    expect(rolling.dice['die-a'].mode).toBe('settled');
    expect(rolling.dice['die-b'].mode).toBe('rolling');

    const complete = applyTableEvent(
      rolling,
      completeEvent(4n, rolling, [DieValue.ONE, DieValue.SIX]),
    );
    expect(complete.dieOrder).toEqual(['die-a', 'die-b', 'die-c']);
    expect(complete.dice['die-a'].value).toBe(DieValue.THREE);
    expect(complete.dice['die-b'].value).toBe(DieValue.ONE);
    expect(complete.dice['die-c'].value).toBe(DieValue.SIX);
  });

  it('rerolls existing stable IDs without replacing or reordering them', () => {
    const settled = addSettledDice(['die-a', 'die-b']);
    const reroll = startEvent(
      3n,
      RollMode.REROLL_EXISTING,
      'roll-2',
      ['die-b'],
      settled,
    );
    const rolling = applyTableEvent(settled, reroll.event);
    expect(rolling.dieOrder).toEqual(['die-a', 'die-b']);
    expect(rolling.dice['die-a'].mode).toBe('settled');
    expect(rolling.dice['die-b'].mode).toBe('rolling');
    const complete = applyTableEvent(
      rolling,
      completeEvent(4n, rolling, [DieValue.FIVE]),
    );
    expect(complete.dice['die-b'].value).toBe(DieValue.FIVE);
  });

  it('enforces one active roll and rejects stale completions', () => {
    const initial = createInitialDiceTableState(tableId);
    const first = startEvent(1n, RollMode.ADD_NEW, 'roll-1', ['die-a']);
    const rolling = applyTableEvent(initial, first.event);
    const second = startEvent(2n, RollMode.ADD_NEW, 'roll-2', ['die-b']);
    expect(applyTableEvent(rolling, second.event)).toBe(rolling);

    const stale = completeEvent(3n, rolling, [DieValue.ONE]);
    stale.payload.case === 'rollCompleted' &&
      (stale.payload.value.rollId = 'old-roll');
    expect(applyTableEvent(rolling, stale)).toBe(rolling);
  });

  it('applies a remote completion value and displaced existing placement', () => {
    const settled = addSettledDice(['rerolled', 'displaced']);
    const next = startEvent(
      3n,
      RollMode.REROLL_EXISTING,
      'remote-roll',
      ['rerolled'],
      settled,
    );
    const rolling = applyTableEvent(settled, next.event);
    const completed = completeEvent(4n, rolling, [DieValue.SIX], [
      new DiePlacement({
        dieId: 'displaced',
        position: new NormalizedTablePosition({ u: 0.91, v: 0.12 }),
      }),
    ]);
    if (completed.payload.case === 'rollCompleted') {
      completed.payload.value.rollerId = 'remote-player';
    }
    const reconciled = applyTableEvent(rolling, completed);
    expect(reconciled.dice.rerolled.value).toBe(DieValue.SIX);
    expect(reconciled.dice.rerolled.canonicalSourcePlayerId)
      .toBe('remote-player');
    expect(reconciled.dice.displaced.position.u).toBeCloseTo(0.91);
  });

  it('moves held dice through sequenced drag events and preserves value', () => {
    const settled = addSettledDice(['die-a']);
    const drag = (revision: bigint, caseName: 'dragStarted' | 'dragUpdated' | 'dragEnded', sequence: bigint) =>
      new TableEvent({
        tableId,
        revision,
        payload: {
          case: caseName,
          value: caseName === 'dragStarted'
            ? new DragStarted({
              dieId: 'die-a', playerId: 'player-a', interactionId: 'drag-1',
              sequence, position: new NormalizedTablePosition({ u: 0.4, v: 0.4 }),
            })
            : caseName === 'dragUpdated'
              ? new DragUpdated({
                dieId: 'die-a', playerId: 'player-a', interactionId: 'drag-1',
                sequence, position: new NormalizedTablePosition({ u: 0.6, v: 0.5 }),
              })
              : new DragEnded({
                dieId: 'die-a', playerId: 'player-a', interactionId: 'drag-1',
                sequence, position: new NormalizedTablePosition({ u: 0.7, v: 0.6 }),
              }),
        } as TableEvent['payload'],
      });
    const held = applyTableEvent(settled, drag(3n, 'dragStarted', 0n));
    expect(held.dice['die-a'].mode).toBe('held');
    const moved = applyTableEvent(held, drag(4n, 'dragUpdated', 1n));
    expect(moved.dice['die-a'].position.u).toBeCloseTo(0.6);
    const ended = applyTableEvent(moved, drag(5n, 'dragEnded', 2n));
    expect(ended.dice['die-a'].mode).toBe('settled');
    expect(ended.dice['die-a'].value).toBe(DieValue.THREE);
    expect(ended.dice['die-a'].position.u).toBeCloseTo(0.7);
  });
});
