import { TableEvent } from '../../rpc/proto/dice/v1/dice_pb';

export type TableEventPayload = TableEvent['payload'];
export type TableEventListener = (event: TableEvent) => void;

export interface DiceTableEventAdapter {
  publish(payload: TableEventPayload): TableEvent;
  receive(event: TableEvent): void;
  subscribe(listener: TableEventListener): () => void;
}

// This synchronous loopback is deliberately transport-shaped: replacing it
// with a WebSocket adapter does not change reducer inputs or scene callbacks.
export function createLocalTableEventAdapter(
  tableId: string,
): DiceTableEventAdapter {
  let revision = 0n;
  const listeners = new Set<TableEventListener>();

  const receive = (event: TableEvent) => {
    if (event.tableId !== tableId) {
      return;
    }
    revision = event.revision > revision ? event.revision : revision;
    listeners.forEach((listener) => listener(event));
  };

  return {
    publish(payload) {
      revision += 1n;
      const event = new TableEvent({ tableId, revision, payload });
      receive(event);
      return event;
    },
    receive,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
