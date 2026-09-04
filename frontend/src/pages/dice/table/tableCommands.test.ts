import { describe, expect, it } from 'vitest';
import { DieFace, RollMode } from '../../../rpc/proto/dice/v1/dice_pb';
import { STANDARD_LETTER_DIE_DEFINITION_IDS } from './letterDice';
import {
  createRerollTargetIds,
  createRollAllRequest,
  isStandardFirstRoll,
} from './tableCommands';
import {
  createInitialDiceTableState,
  DiceTableState,
  identityWorldTransform,
} from './tableModel';

function stateWithDice(owners: readonly string[]): DiceTableState {
  const dieOrder = owners.map((_, index) => `die-${index}`);
  return {
    ...createInitialDiceTableState(),
    dieOrder,
    dice: Object.fromEntries(dieOrder.map((dieId, index) => [dieId, {
      dieId,
      dieDefinitionId: STANDARD_LETTER_DIE_DEFINITION_IDS[
        index % STANDARD_LETTER_DIE_DEFINITION_IDS.length
      ],
      ownerPlayerId: owners[index],
      revision: 1n,
      face: DieFace.ONE,
      transform: identityWorldTransform(index, 0.5, 0),
      mode: 'settled' as const,
    }])),
  };
}

describe('table roll commands', () => {
  it('asks the server to allocate the first standard twelve', () => {
    const request = createRollAllRequest(
      createInitialDiceTableState(), 'player-a',
    );
    expect(request).toEqual({ mode: RollMode.ADD_NEW, targetDieIds: [] });
    expect(isStandardFirstRoll(STANDARD_LETTER_DIE_DEFINITION_IDS)).toBe(true);
  });

  it('rerolls only the local player’s settled dice', () => {
    const state = stateWithDice(['player-a', 'player-b', 'player-a']);
    expect(createRollAllRequest(state, 'player-a')).toEqual({
      mode: RollMode.REROLL_EXISTING,
      targetDieIds: ['die-0', 'die-2'],
    });
    expect(createRerollTargetIds(state, ['die-1'], 'player-a'))
      .toBeUndefined();
  });
});
