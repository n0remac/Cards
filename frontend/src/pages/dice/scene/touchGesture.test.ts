import { describe, expect, it, vi } from 'vitest';
import { createCameraTouchTracker } from './touchGesture';

describe('mobile table gestures', () => {
  it('leaves one-finger felt touches idle and activates on the second touch', () => {
    const tracker = createCameraTouchTracker();
    expect(tracker.start(1, { x: 0, y: 0 }, 'felt')).toBe(false);
    expect(tracker.start(2, { x: 10, y: 0 }, 'felt')).toBe(true);
    expect(tracker.move(2, { x: 20, y: 0 })).toMatchObject({ scale: 0.5 });
  });

  it('cancels an active die drag when a second touch starts', () => {
    const cancel = vi.fn();
    const tracker = createCameraTouchTracker();
    tracker.start(1, { x: 0, y: 0 }, 'die', cancel);
    tracker.start(2, { x: 20, y: 0 }, 'felt');
    expect(cancel).toHaveBeenCalledOnce();
  });
});
