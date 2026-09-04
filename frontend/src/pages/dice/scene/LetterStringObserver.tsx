import { useEffect, useRef } from 'react';
import { DICE_TABLE_CONFIG } from '../constants';
import {
  detectLetterLayout,
  DetectedLetterLayout,
} from '../words/letterStringDetection';
import { letterForFace } from '../table/letterDice';
import { playableTableFace, TableDie } from '../table/tableModel';

type LetterStringObserverProps = {
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  onLayoutChanged: (layout: DetectedLetterLayout) => void;
};

export function LetterStringObserver({
  dice,
  dieOrder,
  onLayoutChanged,
}: LetterStringObserverProps) {
  const previousSignature = useRef<string>();
  useEffect(() => {
    const letters = dieOrder.flatMap((dieId) => {
      const die = dice[dieId];
      const face = die ? playableTableFace(die) : undefined;
      const position = die?.transform.position;
      if (!die || die.mode !== 'settled' || face === undefined || !position) {
        return [];
      }
      return [{
        dieId,
        letter: letterForFace(die.dieDefinitionId, face),
        position: { x: position.x, z: position.z },
      }];
    });
    const layout = detectLetterLayout(letters, {
      dieWidth: DICE_TABLE_CONFIG.die.size,
      ...DICE_TABLE_CONFIG.letterStrings,
    });
    const signature = JSON.stringify(layout);
    if (signature !== previousSignature.current) {
      previousSignature.current = signature;
      onLayoutChanged(layout);
    }
  }, [dice, dieOrder, onLayoutChanged]);
  return null;
}
