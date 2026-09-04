export type TouchPoint = { x: number; y: number };
export type CameraTouchUpdate = {
  previousCentroid: TouchPoint;
  centroid: TouchPoint;
  scale: number;
};

type TrackedTouch = {
  point: TouchPoint;
  source: 'felt' | 'die';
  cancelDieDrag?: () => void;
  dragCancelled: boolean;
};

function metrics(touches: Iterable<TrackedTouch>) {
  const values = [...touches].slice(0, 2);
  if (values.length < 2) return undefined;
  const [first, second] = values;
  return {
    centroid: {
      x: (first.point.x + second.point.x) / 2,
      y: (first.point.y + second.point.y) / 2,
    },
    distance: Math.max(1, Math.hypot(
      first.point.x - second.point.x,
      first.point.y - second.point.y,
    )),
  };
}

export function createCameraTouchTracker() {
  const touches = new Map<number, TrackedTouch>();
  let active = false;
  return {
    start(
      pointerId: number,
      point: TouchPoint,
      source: 'felt' | 'die',
      cancelDieDrag?: () => void,
    ) {
      touches.set(pointerId, {
        point,
        source,
        cancelDieDrag,
        dragCancelled: false,
      });
      if (touches.size >= 2) {
        active = true;
        for (const touch of touches.values()) {
          if (touch.source === 'die' && !touch.dragCancelled) {
            touch.dragCancelled = true;
            touch.cancelDieDrag?.();
          }
        }
      }
      return active;
    },
    move(pointerId: number, point: TouchPoint): CameraTouchUpdate | undefined {
      const touch = touches.get(pointerId);
      if (!touch || !active) return undefined;
      const previous = metrics(touches.values());
      touch.point = point;
      const current = metrics(touches.values());
      if (!previous || !current) return undefined;
      return {
        previousCentroid: previous.centroid,
        centroid: current.centroid,
        scale: previous.distance / current.distance,
      };
    },
    end(pointerId: number) {
      touches.delete(pointerId);
      if (touches.size < 2) active = false;
      return active;
    },
    isActive: () => active,
    clear() {
      touches.clear();
      active = false;
    },
  };
}
