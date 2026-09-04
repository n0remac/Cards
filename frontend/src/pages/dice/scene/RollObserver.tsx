import { MutableRefObject, useRef } from 'react';
import { RapierRigidBody, useAfterPhysicsStep } from '@react-three/rapier';
import {
  ArenaLayout,
  containArenaMotion,
} from './arenaLayout';
import { advanceRollSettling, getUpwardFace } from '../table/diceMath';
import { RollSettledEvent } from '../table/rollModel';
import { ActiveTableRoll, TableDie } from '../table/tableModel';
import { collectChangedPlacements } from './reconciliation';

export type DiceBodyRegistry = MutableRefObject<Map<string, RapierRigidBody>>;

type RollObserverProps = {
  activeRoll?: ActiveTableRoll;
  dice: Readonly<Record<string, TableDie>>;
  bodies: DiceBodyRegistry;
  layout: ArenaLayout;
  onSettled: (event: RollSettledEvent) => void;
};

export function RollObserver({
  activeRoll,
  dice,
  bodies,
  layout,
  onSettled,
}: RollObserverProps) {
  const observedRollId = useRef<string>();
  const reportedRollId = useRef<string>();
  const stableSteps = useRef(0);

  useAfterPhysicsStep(() => {
    for (const [dieId, body] of bodies.current) {
      if (dice[dieId]?.mode === 'held') {
        continue;
      }
      const correction = containArenaMotion(
        layout,
        body.translation(),
        body.linvel(),
      );
      if (correction.corrected) {
        body.setTranslation(correction.position, true);
        body.setLinvel(correction.velocity, true);
      }
    }

    if (!activeRoll) {
      observedRollId.current = undefined;
      reportedRollId.current = undefined;
      stableSteps.current = 0;
      return;
    }
    if (observedRollId.current !== activeRoll.rollId) {
      observedRollId.current = activeRoll.rollId;
      reportedRollId.current = undefined;
      stableSteps.current = 0;
    }
    if (reportedRollId.current === activeRoll.rollId) {
      return;
    }

    const rollBodies = activeRoll.spec.dice.flatMap((throwSpec) => {
      const body = bodies.current.get(throwSpec.dieId);
      return body ? [{ body, throwSpec }] : [];
    });
    if (rollBodies.length !== activeRoll.spec.dice.length) {
      stableSteps.current = 0;
      return;
    }

    const observedBodies = [...bodies.current].flatMap(([dieId, body]) =>
      dice[dieId]?.mode === 'held' ? [] : [body]);
    const progress = advanceRollSettling(
      stableSteps.current,
      observedBodies.map((body) => ({
        linearVelocity: body.linvel(),
        angularVelocity: body.angvel(),
      })),
    );
    stableSteps.current = progress.stableSteps;
    if (!progress.settled) {
      return;
    }

    const activeIds = new Set(activeRoll.spec.dice.map((die) => die.dieId));
    const placements = collectChangedPlacements(
      layout,
      activeIds,
      Object.fromEntries(Object.entries(dice).map(([dieId, die]) => [
        dieId,
        die.position,
      ])),
      new Map([...bodies.current].map(([dieId, body]) => [
        dieId,
        body.translation(),
      ])),
    );

    reportedRollId.current = activeRoll.rollId;
    const event: RollSettledEvent = {
      rollId: activeRoll.rollId,
      dice: rollBodies.map(({ body, throwSpec }) => ({
        dieId: throwSpec.dieId,
        dieIndex: throwSpec.dieIndex,
        face: getUpwardFace(body.rotation()),
      })),
      placements,
    };
    onSettled(event);
  });

  return null;
}
