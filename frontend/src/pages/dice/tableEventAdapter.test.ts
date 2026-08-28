import { describe, expect, it } from 'vitest';
import { RollStarted, TableEvent } from '../../rpc/proto/dice/v1/dice_pb';
import { createLocalTableEventAdapter } from './tableEventAdapter';

describe('local table event adapter', () => {
  it('loops local and remote events through one ordered subscription', () => {
    const adapter = createLocalTableEventAdapter('table');
    const received: TableEvent[] = [];
    const unsubscribe = adapter.subscribe((event) => received.push(event));
    adapter.publish({ case: 'rollStarted', value: new RollStarted() });
    adapter.receive(new TableEvent({
      tableId: 'table',
      revision: 8n,
      payload: { case: 'rollStarted', value: new RollStarted() },
    }));
    adapter.receive(new TableEvent({
      tableId: 'another-table',
      revision: 100n,
      payload: { case: 'rollStarted', value: new RollStarted() },
    }));
    adapter.publish({ case: 'rollStarted', value: new RollStarted() });
    unsubscribe();

    expect(received.map(({ revision }) => revision)).toEqual([1n, 8n, 9n]);
  });
});
