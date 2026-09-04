import React, { Component, ErrorInfo, ReactNode, useCallback, useState } from 'react';
import { DiceScene } from './scene/DiceScene';
import { useDiceTable } from './table/useDiceTable';
import { validateCrossword } from './words/crosswordValidation';
import type { DetectedLetterLayout } from './words/letterStringDetection';
import { useWordDictionary } from './words/useWordDictionary';

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
  const dictionary = useWordDictionary();
  const [sceneStatus, setSceneStatus] = useState<SceneStatus>('loading');
  const [detectedLayout, setDetectedLayout] = useState<DetectedLetterLayout>({
    strings: [],
    crosswords: [],
  });
  const rollDisabled = sceneStatus !== 'ready' || controller.phase === 'rolling';
  const rollingCount = controller.activeRoll?.spec.dice.length ?? 0;
  const hasDice = controller.dieOrder.length > 0;
  const validation = dictionary.status === 'ready'
    ? validateCrossword(
      detectedLayout,
      controller.dieOrder,
      dictionary.words,
    )
    : undefined;

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
              onDetectedLayoutChanged={setDetectedLayout}
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

          <aside
            aria-label="Detected crossword layout"
            aria-live="polite"
            className="pointer-events-none absolute bottom-4 left-4 z-20 max-w-[calc(100%-2rem)] rounded-lg border border-emerald-100/25 bg-[#0e2f22]/85 px-3 py-2 text-stone-100 shadow-lg shadow-black/30 backdrop-blur-sm sm:bottom-6 sm:left-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.22em] text-emerald-100/65">
                Detected crossword
              </p>
              {validation?.isValid && (
                <span
                  aria-label="Valid contiguous crossword"
                  className="grid h-6 w-6 place-items-center rounded-full border border-emerald-200/70 bg-emerald-500 text-base font-black leading-none text-white shadow-sm shadow-emerald-950/40"
                >
                  ✓
                </span>
              )}
            </div>
            {dictionary.status === 'loading' && (
              <p className="mt-1 text-[0.65rem] text-stone-300">
                Loading dictionary…
              </p>
            )}
            {dictionary.status === 'error' && (
              <p className="mt-1 text-[0.65rem] text-amber-200">
                Dictionary unavailable
              </p>
            )}
            {detectedLayout.crosswords.length === 0 ? (
              <p className="mt-1 text-xs text-stone-300">No connected crossword</p>
            ) : (
              <div className="mt-2 space-y-2">
                {detectedLayout.crosswords.map((crossword) => (
                  <div
                    key={crossword.cells.map(({ dieId }) => dieId).join(':')}
                    className="grid gap-0.5"
                    style={{
                      gridTemplateColumns: `repeat(${crossword.width}, 1.125rem)`,
                      gridTemplateRows: `repeat(${crossword.height}, 1.125rem)`,
                    }}
                  >
                    {crossword.cells.map(({ dieId, letter, row, column }) => (
                      <span
                        key={dieId}
                        className="grid h-[1.125rem] w-[1.125rem] place-items-center rounded-sm border border-stone-100/40 bg-[#f4ead4] font-mono text-[0.625rem] font-black text-[#211d19] shadow-sm"
                        style={{
                          gridColumnStart: column + 1,
                          gridRowStart: row + 1,
                        }}
                      >
                        {letter}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )}
            {validation && validation.words.length > 0 && (
              <div className="mt-2 flex max-w-64 flex-wrap gap-1">
                {validation.words.map(({ direction, text, dieIds, isValid }) => (
                  <span
                    key={`${direction}:${dieIds.join(':')}`}
                    className={isValid
                      ? 'rounded bg-emerald-500/25 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-emerald-100'
                      : 'rounded bg-red-500/25 px-1.5 py-0.5 font-mono text-[0.6rem] font-bold text-red-100'}
                  >
                    {text}
                  </span>
                ))}
              </div>
            )}
          </aside>

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
