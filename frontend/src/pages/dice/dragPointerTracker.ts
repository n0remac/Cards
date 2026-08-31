export type ActivePointerDrag = {
  pointerId: number;
  interactionId: string;
};

export type DragPointerTracker = {
  begin: (pointerId: number, interactionId: string) => void;
  interactionFor: (pointerId: number) => string | undefined;
  finish: (pointerId: number) => string | undefined;
};

export function createDragPointerTracker(): DragPointerTracker {
  let active: ActivePointerDrag | undefined;

  return {
    begin(pointerId, interactionId) {
      active = { pointerId, interactionId };
    },
    interactionFor(pointerId) {
      return active?.pointerId === pointerId
        ? active.interactionId
        : undefined;
    },
    finish(pointerId) {
      if (active?.pointerId !== pointerId) {
        return undefined;
      }
      const { interactionId } = active;
      active = undefined;
      return interactionId;
    },
  };
}
