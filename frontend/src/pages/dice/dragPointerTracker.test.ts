import { describe, expect, it } from 'vitest';
import { createDragPointerTracker } from './dragPointerTracker';

describe('drag pointer tracker', () => {
  it('tracks only the pointer that started the drag', () => {
    const tracker = createDragPointerTracker();
    tracker.begin(7, 'drag-1');

    expect(tracker.interactionFor(8)).toBeUndefined();
    expect(tracker.finish(8)).toBeUndefined();
    expect(tracker.interactionFor(7)).toBe('drag-1');
  });

  it('finishes an interaction exactly once', () => {
    const tracker = createDragPointerTracker();
    tracker.begin(7, 'drag-1');

    expect(tracker.finish(7)).toBe('drag-1');
    expect(tracker.finish(7)).toBeUndefined();
    expect(tracker.interactionFor(7)).toBeUndefined();
  });
});
