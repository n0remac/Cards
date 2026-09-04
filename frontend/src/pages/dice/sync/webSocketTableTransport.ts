import {
  ClientMessage,
  JoinRoom,
  ServerMessage,
} from '../../../rpc/proto/dice/v1/dice_pb';
import {
  ConnectionStatusListener,
  DiceConnectionStatus,
  DiceTableTransport,
  ServerMessageListener,
} from './tableTransport';

export const DICE_RESUME_TOKEN_KEY = 'dice-room-resume-token';

export function diceWebSocketUrl(apiBaseUrl = process.env.BASE_URL): string {
  const url = new URL('/dice/ws', apiBaseUrl || window.location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.toString();
}

type WebSocketLike = Pick<WebSocket,
  'binaryType' | 'readyState' | 'send' | 'close' |
  'onopen' | 'onmessage' | 'onerror' | 'onclose'>;

export type WebSocketTableTransportOptions = {
  url?: string;
  createSocket?: (url: string) => WebSocketLike;
  storage?: Pick<Storage, 'getItem' | 'setItem'>;
  random?: () => number;
  setTimer?: typeof setTimeout;
  clearTimer?: typeof clearTimeout;
};

export function createWebSocketTableTransport(
  options: WebSocketTableTransportOptions = {},
): DiceTableTransport {
  const createSocket = options.createSocket ?? ((url: string) => new WebSocket(url));
  const storage = options.storage ?? (typeof localStorage === 'undefined'
    ? undefined
    : localStorage);
  const random = options.random ?? Math.random;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const listeners = new Set<ServerMessageListener>();
  const statusListeners = new Set<ConnectionStatusListener>();
  let socket: WebSocketLike | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let reconnectAttempt = 0;
  let status: DiceConnectionStatus = 'offline';
  let joined = false;
  let stopped = true;
  let lastRevision: bigint | undefined;
  let lastPhysicsTick: bigint | undefined;
  const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;
  const browserWindow = typeof window === 'undefined' ? undefined : window;
  const readResumeToken = () => {
    try {
      return storage?.getItem(DICE_RESUME_TOKEN_KEY) ?? '';
    } catch {
      return '';
    }
  };
  const saveResumeToken = (token: string) => {
    try {
      storage?.setItem(DICE_RESUME_TOKEN_KEY, token);
    } catch {
      // Storage can be disabled; the connection still works for this page load.
    }
  };

  const publishStatus = (next: DiceConnectionStatus) => {
    status = next;
    statusListeners.forEach((listener) => listener(next));
  };

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer !== undefined) return;
    if (!isOnline()) {
      publishStatus('offline');
      return;
    }
    publishStatus('reconnecting');
    const baseDelay = Math.min(5_000, 250 * 2 ** reconnectAttempt++);
    const delay = baseDelay * (0.75 + random() * 0.5);
    reconnectTimer = setTimer(() => {
      reconnectTimer = undefined;
      connect();
    }, delay);
  };

  const reconnectForSnapshot = () => {
    joined = false;
    socket?.close(1008, 'event revision gap');
  };

  const receive = (message: ServerMessage) => {
    if (message.payload.case === 'welcome') {
      const welcome = message.payload.value;
      if (!welcome.snapshot) {
        reconnectForSnapshot();
        return;
      }
      saveResumeToken(welcome.resumeToken);
      lastRevision = welcome.snapshot.revision;
      lastPhysicsTick = welcome.snapshot.physicsTick;
      reconnectAttempt = 0;
      joined = true;
      publishStatus('connected');
      listeners.forEach((listener) => listener(message));
      return;
    }
    if (message.payload.case === 'event') {
      const expected = (lastRevision ?? message.payload.value.revision - 1n) + 1n;
      if (!joined || message.payload.value.revision !== expected) {
        reconnectForSnapshot();
        return;
      }
      lastRevision = message.payload.value.revision;
    }
    if (message.payload.case === 'physicsFrame') {
      if (!joined || (lastPhysicsTick !== undefined &&
          message.payload.value.tick <= lastPhysicsTick)) {
        return;
      }
      lastPhysicsTick = message.payload.value.tick;
    }
    listeners.forEach((listener) => listener(message));
  };

  function connect() {
    if (stopped) return;
    if (!isOnline()) {
      publishStatus('offline');
      return;
    }
    publishStatus(reconnectAttempt === 0 ? 'connecting' : 'reconnecting');
    const nextSocket = createSocket(options.url ?? diceWebSocketUrl());
    socket = nextSocket;
    nextSocket.binaryType = 'arraybuffer';
    nextSocket.onopen = () => {
      const join = new ClientMessage({
        requestId: `join-${Date.now()}`,
        payload: {
          case: 'join',
          value: new JoinRoom({
            resumeToken: readResumeToken(),
          }),
        },
      });
      nextSocket.send(join.toBinary());
    };
    nextSocket.onmessage = (event: MessageEvent) => {
      try {
        const bytes = event.data instanceof ArrayBuffer
          ? new Uint8Array(event.data)
          : new Uint8Array(event.data as ArrayBufferLike);
        receive(ServerMessage.fromBinary(bytes));
      } catch {
        reconnectForSnapshot();
      }
    };
    nextSocket.onerror = () => nextSocket.close();
    nextSocket.onclose = () => {
      if (socket !== nextSocket) return;
      socket = undefined;
      joined = false;
      scheduleReconnect();
    };
  }

  const handleOffline = () => {
    publishStatus('offline');
    socket?.close(1001, 'browser offline');
  };

  return {
    subscribe(onMessage, onStatus) {
      listeners.add(onMessage);
      statusListeners.add(onStatus);
      onStatus(status);
      if (stopped) {
        stopped = false;
        reconnectAttempt = 0;
        browserWindow?.addEventListener('online', scheduleReconnect);
        browserWindow?.addEventListener('offline', handleOffline);
        connect();
      }
      return () => {
        listeners.delete(onMessage);
        statusListeners.delete(onStatus);
        if (listeners.size > 0 || statusListeners.size > 0) return;
        stopped = true;
        browserWindow?.removeEventListener('online', scheduleReconnect);
        browserWindow?.removeEventListener('offline', handleOffline);
        joined = false;
        lastPhysicsTick = undefined;
        if (reconnectTimer !== undefined) clearTimer(reconnectTimer);
        reconnectTimer = undefined;
        socket?.close(1000, 'page left');
        socket = undefined;
        publishStatus('offline');
      };
    },
    send(message) {
      if (!joined || !socket || socket.readyState !== 1) return false;
      try {
        socket.send(message.toBinary());
        return true;
      } catch {
        socket.close(1011, 'send failed');
        return false;
      }
    },
  };
}
