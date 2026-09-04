import { describe, expect, it, vi } from 'vitest';
import {
  ClientMessage,
  PhysicsFrame,
  RollStarted,
  ServerMessage,
  TableEvent,
  TableSnapshot,
  Welcome,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  createWebSocketTableTransport,
  DICE_RESUME_TOKEN_KEY,
  diceWebSocketUrl,
} from './webSocketTableTransport';

class FakeSocket {
  binaryType = '';
  readyState = 0;
  sent: Uint8Array[] = [];
  closes: Array<{ code?: number; reason?: string }> = [];
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    this.sent.push(data as Uint8Array);
  }

  close(code?: number, reason?: string) {
    this.closes.push({ code, reason });
  }

  open() {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  receive(message: ServerMessage) {
    const bytes = message.toBinary();
    this.onmessage?.({ data: bytes.buffer } as MessageEvent);
  }
}

describe('WebSocket table transport', () => {
  it('derives the websocket endpoint from the API base URL', () => {
    expect(diceWebSocketUrl('https://example.test/api')).toBe(
      'wss://example.test/dice/ws',
    );
  });

  it('joins with a resume token and sends only after welcome', () => {
    const socket = new FakeSocket();
    const values = new Map([[DICE_RESUME_TOKEN_KEY, 'old-token']]);
    const statuses: string[] = [];
    const messages: ServerMessage[] = [];
    const transport = createWebSocketTableTransport({
      url: 'ws://example.test/dice/ws',
      createSocket: () => socket as unknown as WebSocket,
      storage: {
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => { values.set(key, value); },
      },
    });
    transport.subscribe(
      (message) => messages.push(message),
      (status) => statuses.push(status),
    );
    expect(transport.send(new ClientMessage({ requestId: 'early' }))).toBe(false);
    socket.open();
    const join = ClientMessage.fromBinary(socket.sent[0]);
    expect(join.payload.case).toBe('join');
    expect(join.payload.case === 'join' && join.payload.value.resumeToken)
      .toBe('old-token');

    socket.receive(new ServerMessage({ payload: {
      case: 'welcome',
      value: new Welcome({
        playerId: 'player-a',
        resumeToken: 'new-token',
        snapshot: new TableSnapshot({
          tableId: 'global-dice-table', revision: 4n,
        }),
      }),
    } }));
    expect(values.get(DICE_RESUME_TOKEN_KEY)).toBe('new-token');
    expect(statuses.at(-1)).toBe('connected');
    expect(messages).toHaveLength(1);
    expect(transport.send(new ClientMessage({ requestId: 'ready' }))).toBe(true);
  });

  it('closes and resynchronizes when an event revision is skipped', () => {
    const socket = new FakeSocket();
    const transport = createWebSocketTableTransport({
      url: 'ws://example.test/dice/ws',
      createSocket: () => socket as unknown as WebSocket,
      storage: { getItem: () => null, setItem: vi.fn() },
    });
    const received: ServerMessage[] = [];
    transport.subscribe((message) => received.push(message), () => undefined);
    socket.open();
    socket.receive(new ServerMessage({ payload: {
      case: 'welcome',
      value: new Welcome({
        playerId: 'player', resumeToken: 'token',
        snapshot: new TableSnapshot({ tableId: 'global-dice-table', revision: 2n }),
      }),
    } }));
    socket.receive(new ServerMessage({ payload: {
      case: 'event',
      value: new TableEvent({
        tableId: 'global-dice-table', revision: 4n,
        payload: { case: 'rollStarted', value: new RollStarted() },
      }),
    } }));
    expect(socket.closes).toContainEqual({ code: 1008, reason: 'event revision gap' });
    expect(received).toHaveLength(1);
  });

  it('drops stale physics frames without requiring consecutive ticks', () => {
    const socket = new FakeSocket();
    const transport = createWebSocketTableTransport({
      url: 'ws://example.test/dice/ws',
      createSocket: () => socket as unknown as WebSocket,
      storage: { getItem: () => null, setItem: vi.fn() },
    });
    const received: ServerMessage[] = [];
    transport.subscribe((message) => received.push(message), () => undefined);
    socket.open();
    socket.receive(new ServerMessage({ payload: {
      case: 'welcome',
      value: new Welcome({
        playerId: 'player', resumeToken: 'token',
        snapshot: new TableSnapshot({
          tableId: 'global-dice-table', physicsTick: 10n,
        }),
      }),
    } }));
    socket.receive(new ServerMessage({ payload: {
      case: 'physicsFrame', value: new PhysicsFrame({ tick: 9n }),
    } }));
    socket.receive(new ServerMessage({ payload: {
      case: 'physicsFrame', value: new PhysicsFrame({ tick: 13n }),
    } }));
    expect(received.map(({ payload }) => payload.case))
      .toEqual(['welcome', 'physicsFrame']);
  });
});
