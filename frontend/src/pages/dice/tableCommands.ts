import { RollMode } from '../../rpc/proto/dice/v1/dice_pb';
import { MAX_DEFINITIONS_PER_ADD } from './constants';
import {
  isKnownLetterDieDefinitionId,
  LetterDieDefinitionId,
  STANDARD_LETTER_DIE_DEFINITION_IDS,
} from './letterDice';
import { RollTarget } from './rollModel';
import { DiceTableState } from './tableModel';

export type TableRollRequest = {
  mode: RollMode.ADD_NEW | RollMode.REROLL_EXISTING;
  targets: readonly RollTarget[];
};

export function createAddRollTargets(
  definitionIds: readonly LetterDieDefinitionId[],
  createDieId: () => string,
): RollTarget[] | undefined {
  if (definitionIds.length === 0 ||
      definitionIds.length > MAX_DEFINITIONS_PER_ADD ||
      definitionIds.some((definitionId) =>
        !isKnownLetterDieDefinitionId(definitionId))) {
    return undefined;
  }
  return definitionIds.map((dieDefinitionId) => ({
    dieId: createDieId(),
    dieDefinitionId,
  }));
}

export function createRerollTargets(
  state: DiceTableState,
  dieIds: readonly string[],
): RollTarget[] | undefined {
  const uniqueDieIds = [...new Set(dieIds)];
  const targets = uniqueDieIds.flatMap((dieId) => {
    const die = state.dice[dieId];
    return die ? [{
      dieId,
      dieDefinitionId: die.dieDefinitionId,
      position: die.position,
    }] : [];
  });
  return targets.length === uniqueDieIds.length && targets.length > 0
    ? targets
    : undefined;
}

export function createRollAllRequest(
  state: DiceTableState,
  createDieId: () => string,
): TableRollRequest | undefined {
  if (state.dieOrder.length === 0) {
    const targets = createAddRollTargets(
      STANDARD_LETTER_DIE_DEFINITION_IDS,
      createDieId,
    );
    return targets ? { mode: RollMode.ADD_NEW, targets } : undefined;
  }
  const targets = createRerollTargets(state, state.dieOrder);
  return targets ? { mode: RollMode.REROLL_EXISTING, targets } : undefined;
}
