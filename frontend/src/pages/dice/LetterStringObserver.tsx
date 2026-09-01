import { useRef } from 'react';
import { useAfterPhysicsStep } from '@react-three/rapier';
import { DICE_TABLE_CONFIG } from './constants';
import {
  detectLetterLayout,
} from './letterStringDetection';
import type { DetectedLetterLayout } from './letterStringDetection';
import { letterForFace } from './letterDice';
import type { DiceBodyRegistry } from './RollObserver';
import { playableTableFace } from './tableModel';
import type { TableDie } from './tableModel';

type LetterStringObserverProps = {
  dice: Readonly<Record<string, TableDie>>;
  dieOrder: readonly string[];
  bodies: DiceBodyRegistry;
  onLayoutChanged: (layout: DetectedLetterLayout) => void;
};

function layoutSignature(layout: DetectedLetterLayout): string {
  return JSON.stringify(layout);
}

export function LetterStringObserver({
  dice,
  dieOrder,
  bodies,
  onLayoutChanged,
}: LetterStringObserverProps) {
  const previousSignature = useRef<string>();

  useAfterPhysicsStep(() => {
    const letters = dieOrder.flatMap((dieId) => {
      const die = dice[dieId];
      const body = bodies.current.get(dieId);
      const face = die ? playableTableFace(die) : undefined;
      if (!die || die.mode === 'rolling' || !body || face === undefined) {
        return [];
      }
      const position = body.translation();
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
    const signature = layoutSignature(layout);
    if (signature === previousSignature.current) {
      return;
    }
    previousSignature.current = signature;
    onLayoutChanged(layout);
  });

  return null;
}
