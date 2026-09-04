import { DieFace } from '../../../rpc/proto/dice/v1/dice_pb';
import { PlayableDieFace } from './diceMath';

const DEFINITIONS = [
  { id: 'letter-die-01', faceString: 'MMLLBY' },
  { id: 'letter-die-02', faceString: 'VFGKPP' },
  { id: 'letter-die-03', faceString: 'HHNNRR' },
  { id: 'letter-die-04', faceString: 'DFRLLW' },
  { id: 'letter-die-05', faceString: 'RRDLGG' },
  { id: 'letter-die-06', faceString: 'XKBSZN' },
  { id: 'letter-die-07', faceString: 'WHHTTP' },
  { id: 'letter-die-08', faceString: 'CCBTJD' },
  { id: 'letter-die-09', faceString: 'CCMTTS' },
  { id: 'letter-die-10', faceString: 'OIINNY' },
  { id: 'letter-die-11', faceString: 'AEIOUU' },
  { id: 'letter-die-12', faceString: 'AAEEOO' },
] as const;

export type LetterDieDefinition = typeof DEFINITIONS[number];
export type LetterDieDefinitionId = LetterDieDefinition['id'];

export const LETTER_DIE_DEFINITIONS: readonly LetterDieDefinition[] = DEFINITIONS;
export const STANDARD_LETTER_DIE_DEFINITION_IDS = DEFINITIONS.map(
  ({ id }) => id,
) as readonly LetterDieDefinitionId[];

const DEFINITIONS_BY_ID = new Map<string, LetterDieDefinition>(
  DEFINITIONS.map((definition) => [definition.id, definition]),
);

export function getLetterDieDefinition(
  dieDefinitionId: string,
): LetterDieDefinition | undefined {
  return DEFINITIONS_BY_ID.get(dieDefinitionId);
}

export function isKnownLetterDieDefinitionId(
  dieDefinitionId: string,
): dieDefinitionId is LetterDieDefinitionId {
  return DEFINITIONS_BY_ID.has(dieDefinitionId);
}

export function letterForFace(
  dieDefinitionId: string,
  face: PlayableDieFace,
): string {
  const definition = getLetterDieDefinition(dieDefinitionId);
  if (!definition) {
    throw new Error(`Unknown letter die definition ${dieDefinitionId}.`);
  }
  if (face < DieFace.ONE || face > DieFace.SIX) {
    throw new Error(`Invalid physical face ${face}.`);
  }
  return definition.faceString[face - 1];
}
