import React, { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import { DiceScene } from './DiceScene';
import { useDiceTable } from './useDiceTable';

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
  const controller = useDiceTable();
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading');
  const rollDisabled = sceneStatus !== 'ready' || controller.phase === 'rolling';
  const rollingCount = controller.activeRoll?.spec.dice.length ?? 0;
  const hasDice = controller.dieOrder.length > 0;

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
          ? `Rolling ${rollingCount} letter ${rollingCount === 1 ? 'die' : 'dice'}…`
          : controller.phase === 'settled'
            ? 'Arrange the letters or roll again.'
            : 'Roll the twelve letter dice.';

  const rollLabel = controller.phase === 'rolling'
    ? 'Rolling…'
    : hasDice ? 'Reroll all dice' : 'Roll letter dice';

  return (
    <main
      className="relative h-[100dvh] w-full overflow-hidden bg-[#4b2818] p-2 pb-0 text-stone-100 sm:p-3 sm:pb-0 lg:p-4 lg:pb-0"
      style={WOOD_GRAIN}
    >
      <section
        aria-label="Letter dice table"
        className="relative flex h-full min-h-0 flex-col shadow-2xl shadow-black/60"
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-t-lg bg-[#185438] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),inset_0_8px_18px_rgba(0,0,0,0.32)] sm:rounded-t-xl">
          <DiceSceneErrorBoundary onError={markError}>
            <DiceScene
              dice={controller.dice}
              dieOrder={controller.dieOrder}
              activeRoll={controller.activeRoll}
              localPlayerId={controller.localPlayerId}
              onSettled={controller.reportSettled}
              onDragStart={controller.startDrag}
              onDragUpdate={controller.updateDrag}
              onDragEnd={controller.endDrag}
              onReady={markReady}
              onWebGLUnavailable={markUnsupported}
            />
          </DiceSceneErrorBoundary>

          <header className="pointer-events-none absolute left-4 top-4 z-20 sm:left-6 sm:top-6">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.28em] text-emerald-100/70">
              Letter table
            </p>
            <h1 className="mt-0.5 text-2xl font-black uppercase tracking-[0.08em] text-stone-50 [text-shadow:0_2px_8px_rgba(0,0,0,0.55)] sm:text-3xl">
              Letter Dice
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
          </div>

          <div className="py-2 sm:py-3">
            <button
              type="button"
              disabled={rollDisabled}
              onClick={controller.rollAll}
              className="h-12 w-full rounded-xl border border-[#fff1ca]/60 bg-[#efd8a7] px-3 text-sm font-black uppercase tracking-[0.12em] text-[#173c2a] shadow-lg shadow-black/35 transition hover:bg-[#ffe9bb] focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:ring-offset-2 focus:ring-offset-[#422317] disabled:cursor-not-allowed disabled:border-stone-600 disabled:bg-stone-700 disabled:text-stone-400 sm:h-14 sm:text-base"
            >
              {rollLabel}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
