import React, { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import { MAX_DICE, MIN_DICE } from './constants';
import { DiceScene } from './DiceScene';
import { orderedValues } from './rollModel';
import { useDiceRoll } from './useDiceRoll';

type SceneStatus = 'loading' | 'ready' | 'unsupported' | 'error';

type ErrorBoundaryProps = {
  children: ReactNode;
  onError: () => void;
};

type ErrorBoundaryState = {
  error?: Error;
};

class DiceSceneErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Dice scene failed to initialize.', error, info);
    this.props.onError();
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid h-full place-items-center bg-[#171b1a] px-6 text-center text-stone-200">
          <div>
            <p className="text-lg font-semibold">The dice scene could not start.</p>
            <p className="mt-2 text-sm text-stone-400">
              Try reloading the page or using a browser with WebGL enabled.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DiceGame() {
  const controller = useDiceRoll();
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading');
  const values = orderedValues(controller.result);
  const countLocked = controller.phase === 'rolling';
  const rollDisabled = sceneStatus !== 'ready';

  const markReady = useCallback(() => setSceneStatus('ready'), []);
  const markUnsupported = useCallback(() => setSceneStatus('unsupported'), []);
  const markError = useCallback(() => setSceneStatus('error'), []);

  const statusText = sceneStatus === 'loading'
    ? 'Loading the physics engine…'
    : sceneStatus === 'unsupported'
      ? 'WebGL is unavailable in this browser.'
      : sceneStatus === 'error'
        ? 'The physics engine could not initialize.'
        : controller.phase === 'rolling'
          ? `Rolling ${controller.count} ${controller.count === 1 ? 'die' : 'dice'}…`
          : controller.phase === 'settled'
            ? `Roll complete. Total ${controller.result?.total}.`
            : 'Choose your dice and roll.';

  const rollLabel = controller.phase === 'idle' ? 'Roll dice' : 'Roll again';

  return (
    <main className="min-h-[calc(100vh-3rem)] bg-[#111513] px-4 py-7 text-stone-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">
            Physics playground
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Dice
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400 sm:text-base">
            Every result comes from the face that is physically pointing upward after the dice settle.
          </p>
        </header>

        <section className="overflow-hidden rounded-2xl border border-[#6d4228] bg-[#26170f] shadow-2xl shadow-black/40">
          <div className="relative h-[56vh] min-h-[360px] max-h-[650px] w-full sm:min-h-[470px]">
            <DiceSceneErrorBoundary onError={markError}>
              <DiceScene
                activeSpec={controller.activeSpec}
                onSettled={controller.reportSettled}
                onReady={markReady}
                onWebGLUnavailable={markUnsupported}
              />
            </DiceSceneErrorBoundary>
            {sceneStatus === 'loading' && (
              <div className="pointer-events-none absolute inset-0 grid place-items-center bg-[#171b1a]/90 text-sm text-stone-300">
                Loading physics…
              </div>
            )}
          </div>

          <div className="grid gap-5 border-t border-[#6d4228] bg-[#21140e] p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div>
              <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                Number of dice
              </span>
              <div className="mt-2 flex items-center gap-3">
                <button
                  type="button"
                  aria-label="Remove one die"
                  disabled={countLocked || controller.count <= MIN_DICE}
                  onClick={() => controller.changeCount(-1)}
                  className="h-10 w-10 rounded-lg border border-stone-600 bg-stone-800 text-xl font-semibold transition hover:border-emerald-400 hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  −
                </button>
                <output
                  aria-label={`${controller.count} ${controller.count === 1 ? 'die' : 'dice'} selected`}
                  className="min-w-10 text-center text-2xl font-bold tabular-nums"
                >
                  {controller.count}
                </output>
                <button
                  type="button"
                  aria-label="Add one die"
                  disabled={countLocked || controller.count >= MAX_DICE}
                  onClick={() => controller.changeCount(1)}
                  className="h-10 w-10 rounded-lg border border-stone-600 bg-stone-800 text-xl font-semibold transition hover:border-emerald-400 hover:bg-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  +
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={rollDisabled}
              onClick={controller.roll}
              className="min-h-12 rounded-xl bg-emerald-600 px-8 py-3 text-base font-bold uppercase tracking-[0.12em] text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#21140e] disabled:cursor-not-allowed disabled:bg-stone-700 disabled:text-stone-400"
            >
              {rollLabel}
            </button>
          </div>

          <div
            className="border-t border-[#4d3121] bg-[#1a110c] px-5 py-5 sm:px-6"
            aria-live="polite"
            aria-busy={controller.phase === 'rolling'}
          >
            <p className="text-sm text-stone-400">{statusText}</p>
            {controller.result && (
              <p className="mt-2 text-2xl font-semibold tracking-wide text-stone-100">
                {values.join(' + ')} ={' '}
                <strong className="text-emerald-300">{controller.result.total}</strong>
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
