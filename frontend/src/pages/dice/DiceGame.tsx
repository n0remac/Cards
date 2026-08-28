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
        <div className="grid h-full place-items-center bg-[#185438] px-6 text-center text-stone-100">
          <div className="max-w-sm rounded-xl bg-[#0e2f22]/85 p-5 shadow-xl">
            <p className="text-lg font-semibold">The dice scene could not start.</p>
            <p className="mt-2 text-sm text-stone-300">
              Try reloading the page or using a browser with WebGL enabled.
            </p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const WOOD_GRAIN = {
  backgroundImage: [
    'linear-gradient(90deg, rgba(255,255,255,0.055), transparent 18%, rgba(0,0,0,0.16) 58%, transparent 82%)',
    'linear-gradient(174deg, #704329 0%, #4b2818 46%, #30170e 100%)',
  ].join(', '),
};

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
            ? `${values.join(' + ')} =`
            : 'Choose your dice and roll.';

  const rollLabel = controller.phase === 'idle' ? 'Roll dice' : 'Roll again';

  return (
    <main
      className="relative h-screen h-[100dvh] w-full overflow-hidden bg-[#4b2818] p-2 pb-0 text-stone-100 sm:p-3 sm:pb-0 lg:p-4 lg:pb-0"
      style={WOOD_GRAIN}
    >
      <section
        aria-label="Dice table"
        className="relative flex h-full min-h-0 flex-col shadow-2xl shadow-black/60"
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-t-lg bg-[#185438] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_8px_18px_rgba(0,0,0,0.32)] sm:rounded-t-xl">
          <DiceSceneErrorBoundary onError={markError}>
            <DiceScene
              activeSpec={controller.activeSpec}
              onSettled={controller.reportSettled}
              onReady={markReady}
              onWebGLUnavailable={markUnsupported}
            />
          </DiceSceneErrorBoundary>

          <header className="pointer-events-none absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-emerald-100/70">
              Physics table
            </p>
            <h1 className="mt-0.5 text-2xl font-black uppercase tracking-[0.08em] text-stone-50 [text-shadow:0_2px_8px_rgba(0,0,0,0.55)] sm:text-3xl">
              Dice
            </h1>
          </header>

          {sceneStatus === 'loading' && (
            <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-[#164a33]/90 text-sm font-medium tracking-wide text-emerald-50">
              Loading physics…
            </div>
          )}
        </div>

        <div className="shrink-0 border-t-4 border-[#8e5a37] bg-[#422317]/65 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_22px_rgba(0,0,0,0.4)] sm:px-3 sm:pt-2">
          <div
            className="flex min-h-9 items-center justify-between gap-3 border-b border-[#96613d]/45 px-1 pb-1.5"
            aria-live="polite"
            aria-busy={controller.phase === 'rolling'}
          >
            <p className="min-w-0 truncate text-xs font-medium tracking-wide text-stone-200/80 sm:text-sm">
              {statusText}
            </p>
            {controller.result && (
              <p className="flex shrink-0 items-baseline gap-1.5" aria-label={`Total ${controller.result.total}`}>
                <span className="text-[0.6rem] font-bold uppercase tracking-[0.18em] text-emerald-200/70">
                  Total
                </span>
                <strong className="text-2xl leading-none tabular-nums text-emerald-200">
                  {controller.result.total}
                </strong>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5 py-2 sm:gap-4 sm:py-3">
            <div
              className="flex shrink-0 items-center rounded-xl border border-[#9b6848]/60 bg-[#25130d]/70 p-1 shadow-inner shadow-black/40"
              aria-label="Number of dice"
              role="group"
            >
              <button
                type="button"
                aria-label="Remove one die"
                disabled={countLocked || controller.count <= MIN_DICE}
                onClick={() => controller.changeCount(-1)}
                className="grid h-10 w-10 place-items-center rounded-lg text-xl font-semibold text-stone-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11"
              >
                −
              </button>
              <output
                aria-label={`${controller.count} ${controller.count === 1 ? 'die' : 'dice'} selected`}
                className="min-w-8 text-center text-xl font-black tabular-nums text-[#f4dfb4] sm:min-w-10 sm:text-2xl"
              >
                {controller.count}
              </output>
              <button
                type="button"
                aria-label="Add one die"
                disabled={countLocked || controller.count >= MAX_DICE}
                onClick={() => controller.changeCount(1)}
                className="grid h-10 w-10 place-items-center rounded-lg text-xl font-semibold text-stone-100 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-30 sm:h-11 sm:w-11"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={rollDisabled}
              onClick={controller.roll}
              className="h-12 min-w-0 flex-1 rounded-xl border border-[#fff1ca]/60 bg-[#efd8a7] px-3 text-sm font-black uppercase tracking-[0.12em] text-[#173c2a] shadow-lg shadow-black/35 transition hover:bg-[#ffe9bb] focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#422317] disabled:cursor-not-allowed disabled:border-stone-600 disabled:bg-stone-700 disabled:text-stone-400 sm:h-14 sm:text-base"
            >
              {rollLabel}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
