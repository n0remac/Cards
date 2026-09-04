import { RollMode } from '../../../rpc/proto/dice/v1/dice_pb';
import {
  LetterDieDefinitionId,
  STANDARD_LETTER_DIE_DEFINITION_IDS,
} from './letterDice';
import { DiceTableState } from './tableModel';

export type TableRollRequest = {
  mode: RollMode.ADD_NEW | RollMode.REROLL_EXISTING;
  targetDieIds: readonly string[];
};

export function createRerollTargetIds(
  state: DiceTableState,
  dieIds: readonly string[],
  ownerPlayerId: string,
): string[] | undefined {
  const targetDieIds = [...new Set(dieIds)];
  if (targetDieIds.length === 0 || targetDieIds.some((dieId) => {
    const die = state.dice[dieId];
    return !die || die.ownerPlayerId !== ownerPlayerId ||
      die.mode !== 'settled';
  })) return undefined;
  return targetDieIds;
}

export function isStandardFirstRoll(
  definitionIds: readonly LetterDieDefinitionId[],
): boolean {
  return definitionIds.length === STANDARD_LETTER_DIE_DEFINITION_IDS.length &&
    definitionIds.every((definitionId, index) =>
      definitionId === STANDARD_LETTER_DIE_DEFINITION_IDS[index]);
}

export function createRollAllRequest(
  state: DiceTableState,
  ownerPlayerId: string,
): TableRollRequest | undefined {
  const ownedDieIds = state.dieOrder.filter((dieId) =>
    state.dice[dieId]?.ownerPlayerId === ownerPlayerId);
  if (ownedDieIds.length === 0) {
    return { mode: RollMode.ADD_NEW, targetDieIds: [] };
  }
  const targetDieIds = createRerollTargetIds(
    state, ownedDieIds, ownerPlayerId,
  );
  return targetDieIds
    ? { mode: RollMode.REROLL_EXISTING, targetDieIds }
    : undefined;
}
