import {
  ClientMessage,
  ServerMessage,
} from '../../../rpc/proto/dice/v1/dice_pb';

export type DiceConnectionStatus =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'offline';

export type ServerMessageListener = (message: ServerMessage) => void;
export type ConnectionStatusListener = (status: DiceConnectionStatus) => void;

export interface DiceTableTransport {
  subscribe(
    onMessage: ServerMessageListener,
    onStatus: ConnectionStatusListener,
  ): () => void;
  send(message: ClientMessage): boolean;
}
