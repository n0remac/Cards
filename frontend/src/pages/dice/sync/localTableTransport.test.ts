import { describe, expect, it } from 'vitest';
import {
  ClientMessage,
  RollMode,
  StartRollCommand,
} from '../../../rpc/proto/dice/v1/dice_pb';
import { createLocalTableTransport } from './localTableTransport';

describe('local table transport', () => {
  it('emulates server allocation without a client-authored roll spec', () => {
    const transport = createLocalTableTransport();
    const cases: string[] = [];
    transport.subscribe((message) => {
      if (message.payload.case) cases.push(message.payload.case);
    }, () => {});
    expect(transport.send(new ClientMessage({
      requestId: 'roll',
      payload: {
        case: 'startRoll',
        value: new StartRollCommand({ mode: RollMode.ADD_NEW }),
      },
    }))).toBe(true);
    expect(cases).toEqual(['welcome', 'event']);
  });
});
