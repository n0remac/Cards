import { useCallback, useRef, useState } from 'react';
import { RollResult, RollSpec } from '../../rpc/proto/dice/v1/dice_pb';
import {
  DEFAULT_DICE,
  MAX_DICE,
  MAX_ROLL_ID,
  MIN_DICE,
} from './constants';
import {
  assertValidRollSpec,
  createLocalRollSpec,
  DieSettledEvent,
  recordSettledEvent,
} from './rollModel';
import { PlayableDieValue } from './diceMath';

export type RollPhase = 'idle' | 'rolling' | 'settled';

export type DiceRollController = {
  count: number;
  activeSpec?: RollSpec;
  phase: RollPhase;
  result?: RollResult;
  changeCount: (delta: number) => void;
  roll: () => void;
  startRoll: (spec: RollSpec) => void;
  reportSettled: (event: DieSettledEvent) => void;
};

export function useDiceRoll(): DiceRollController {
  const [count, setCount] = useState(DEFAULT_DICE);
  const [activeSpec, setActiveSpec] = useState<RollSpec>();
  const [phase, setPhase] = useState<RollPhase>('idle');
  const [result, setResult] = useState<RollResult>();
  const activeSpecRef = useRef<RollSpec>();
  const settledRef = useRef<ReadonlyMap<number, PlayableDieValue>>(new Map());
  const rollIdRef = useRef(0);
  const phaseRef = useRef<RollPhase>('idle');

  const setCurrentPhase = useCallback((nextPhase: RollPhase) => {
    phaseRef.current = nextPhase;
    setPhase(nextPhase);
  }, []);

  const startRoll = useCallback(
    (spec: RollSpec) => {
      assertValidRollSpec(spec);
      rollIdRef.current = spec.rollId;
      activeSpecRef.current = spec;
      settledRef.current = new Map();
      setActiveSpec(spec);
      setResult(undefined);
      setCurrentPhase('rolling');
    },
    [setCurrentPhase],
  );

  const roll = useCallback(() => {
    const nextRollId = rollIdRef.current >= MAX_ROLL_ID
      ? 1
      : rollIdRef.current + 1;
    startRoll(createLocalRollSpec(count, nextRollId));
  }, [count, startRoll]);

  const changeCount = useCallback(
    (delta: number) => {
      if (phaseRef.current === 'rolling') {
        return;
      }
      setCount((current) => Math.min(MAX_DICE, Math.max(MIN_DICE, current + delta)));
      activeSpecRef.current = undefined;
      settledRef.current = new Map();
      setActiveSpec(undefined);
      setResult(undefined);
      setCurrentPhase('idle');
    },
    [setCurrentPhase],
  );

  const reportSettled = useCallback(
    (event: DieSettledEvent) => {
      const spec = activeSpecRef.current;
      if (!spec) {
        return;
      }
      const recorded = recordSettledEvent(spec, settledRef.current, event);
      if (recorded.settled === settledRef.current) {
        return;
      }
      settledRef.current = recorded.settled;
      if (recorded.result) {
        setResult(recorded.result);
        setCurrentPhase('settled');
      }
    },
    [setCurrentPhase],
  );

  return {
    count,
    activeSpec,
    phase,
    result,
    changeCount,
    roll,
    startRoll,
    reportSettled,
  };
}
