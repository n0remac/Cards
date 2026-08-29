import { describe, expect, it } from 'vitest';
import {
  DieResult,
  DieThrowSpec,
  DieFace,
  DragUpdated,
  NormalizedTablePosition,
  RollMode,
  RollResult,
  RollSpec,
  RollStarted,
  TableDieState,
  TableEvent,
  TableSnapshot,
} from '../../rpc/proto/dice/v1/dice_pb';
import { SIMULATION_VERSION } from './constants';

describe('dice protobuf contract', () => {
  it.each([RollMode.ADD_NEW, RollMode.REROLL_EXISTING])(
    'round-trips stable IDs, normalized positions, and roll mode %s',
    (mode) => {
      const spec = new RollSpec({
        simulationVersion: SIMULATION_VERSION,
        rollId: 'global-roll-id',
        dice: [new DieThrowSpec({
          dieIndex: 0,
          dieId: 'stable-die-id',
          dieDefinitionId: 'letter-die-01',
          tablePosition: new NormalizedTablePosition({ u: 0.25, v: 0.75 }),
        })],
      });
      const event = new TableEvent({
        tableId: 'table-id',
        revision: 9n,
        payload: {
          case: 'rollStarted',
          value: new RollStarted({
            rollId: spec.rollId,
            rollerId: 'player-id',
            mode,
            animationSpec: spec,
          }),
        },
      });
      const decoded = TableEvent.fromBinary(event.toBinary());
      expect(TableEvent.equals(decoded, event)).toBe(true);
      expect(decoded.payload.case).toBe('rollStarted');
      if (decoded.payload.case === 'rollStarted') {
        expect(decoded.payload.value.mode).toBe(mode);
        expect(decoded.payload.value.animationSpec?.dice[0].dieId)
          .toBe('stable-die-id');
        expect(decoded.payload.value.animationSpec?.dice[0].dieDefinitionId)
          .toBe('letter-die-01');
        expect(decoded.payload.value.animationSpec?.dice[0].tablePosition?.v)
          .toBeCloseTo(0.75);
      }
    },
  );

  it('round-trips a revisioned table snapshot', () => {
    const snapshot = new TableSnapshot({
      tableId: 'table-id',
      revision: 41n,
      dice: [new TableDieState({
        dieId: 'die-a',
        dieDefinitionId: 'letter-die-05',
        ownerPlayerId: 'player-a',
        face: DieFace.FIVE,
        position: new NormalizedTablePosition({ u: 0.25, v: 0.75 }),
        revision: 40n,
      })],
    });
    const event = new TableEvent({
      tableId: snapshot.tableId,
      revision: snapshot.revision,
      payload: { case: 'snapshot', value: snapshot },
    });
    expect(TableEvent.equals(
      TableEvent.fromBinary(event.toBinary()),
      event,
    )).toBe(true);
  });

  it('keeps authoritative result IDs and sequenced drag data', () => {
    const result = new RollResult({
      simulationVersion: SIMULATION_VERSION,
      rollId: 'roll',
      dice: [new DieResult({
        dieId: 'die-a',
        dieDefinitionId: 'letter-die-12',
        dieIndex: 0,
        face: DieFace.SIX,
      })],
    });
    expect(RollResult.equals(
      RollResult.fromBinary(result.toBinary()),
      result,
    )).toBe(true);
    expect('total' in result).toBe(false);

    const drag = new TableEvent({
      tableId: 'table',
      revision: 11n,
      payload: {
        case: 'dragUpdated',
        value: new DragUpdated({
          dieId: 'die-a',
          playerId: 'player-a',
          interactionId: 'interaction-a',
          sequence: 17n,
          position: new NormalizedTablePosition({ u: 0.8, v: 0.2 }),
        }),
      },
    });
    const decoded = TableEvent.fromBinary(drag.toBinary());
    expect(decoded.payload.case).toBe('dragUpdated');
    if (decoded.payload.case === 'dragUpdated') {
      expect(decoded.payload.value.sequence).toBe(17n);
      expect(decoded.payload.value.dieId).toBe('die-a');
    }
  });
});
