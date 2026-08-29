import { describe, expect, it } from 'vitest';
import {
  DieFace,
  NormalizedTablePosition,
  RollMode,
} from '../../rpc/proto/dice/v1/dice_pb';
import { STANDARD_LETTER_DIE_DEFINITION_IDS } from './letterDice';
import {
  createAddRollTargets,
  createRollAllRequest,
} from './tableCommands';
import { createInitialDiceTableState, DiceTableState } from './tableModel';

describe('table roll commands', () => {
  it('creates the standard twelve definitions on the first roll', () => {
    let nextId = 0;
    const request = createRollAllRequest(
      createInitialDiceTableState(),
      () => `instance-${nextId += 1}`,
    );

    expect(request?.mode).toBe(RollMode.ADD_NEW);
    expect(request?.targets.map(({ dieDefinitionId }) => dieDefinitionId))
      .toEqual(STANDARD_LETTER_DIE_DEFINITION_IDS);
    expect(new Set(request?.targets.map(({ dieId }) => dieId)).size).toBe(12);
  });

  it('rerolls every stable instance, including extras, at current positions', () => {
    const dieOrder = Array.from({ length: 13 }, (_, index) => `die-${index}`);
    const state: DiceTableState = {
      ...createInitialDiceTableState(),
      dieOrder,
      dice: Object.fromEntries(dieOrder.map((dieId, index) => [dieId, {
        dieId,
        dieDefinitionId: STANDARD_LETTER_DIE_DEFINITION_IDS[
          index % STANDARD_LETTER_DIE_DEFINITION_IDS.length
        ],
        ownerPlayerId: 'player',
        revision: 1n,
        face: DieFace.ONE,
        position: new NormalizedTablePosition({
          u: 0.1 + index * 0.01,
          v: 0.8 - index * 0.01,
        }),
        mode: 'settled',
      }])),
    };

    const request = createRollAllRequest(state, () => 'unused');
    expect(request?.mode).toBe(RollMode.REROLL_EXISTING);
    expect(request?.targets).toHaveLength(13);
    expect(request?.targets.map(({ dieId }) => dieId)).toEqual(dieOrder);
    expect(request?.targets[12].position).toBe(state.dice['die-12'].position);
  });

  it('keeps definition-based additions capped at twelve', () => {
    expect(createAddRollTargets([], () => 'die')).toBeUndefined();
    expect(createAddRollTargets([
      ...STANDARD_LETTER_DIE_DEFINITION_IDS,
      'letter-die-01',
    ], () => 'die')).toBeUndefined();
  });
});
