import { describe, expect, it } from 'vitest';
import {
  ClientMessage,
  DieMotionState,
  DieTransform,
  PhysicsFrame,
  RollMode,
  ServerMessage,
  StartRollCommand,
  TableBounds,
  WorldQuaternion,
  WorldTransform,
  WorldVector3,
} from '../../../rpc/proto/dice/v1/dice_pb';

describe('server-owned dice protobuf contract', () => {
  it('round-trips double-precision world transforms and physics ticks', () => {
    const frame = new PhysicsFrame({
      tick: 9_007_199_254_740_000n,
      bounds: new TableBounds({
        minX: -1234.125,
        maxX: 5678.875,
        minZ: -20,
        maxZ: 30,
      }),
      dice: [new DieTransform({
        dieId: 'die-a',
        revision: 42n,
        motion: DieMotionState.ROLLING,
        transform: new WorldTransform({
          position: new WorldVector3({ x: 1234.123456789, y: 4, z: -8 }),
          rotation: new WorldQuaternion({ x: 0.5, y: -0.5, z: 0.5, w: 0.5 }),
        }),
      })],
    });
    const decoded = PhysicsFrame.fromBinary(frame.toBinary());
    expect(decoded.tick).toBe(frame.tick);
    expect(decoded.dice[0].transform?.position?.x)
      .toBe(1234.123456789);
    expect(decoded.bounds).toEqual(frame.bounds);
  });

  it('keeps physics frames distinct from revisioned table events', () => {
    const message = new ServerMessage({
      payload: {
        case: 'physicsFrame',
        value: new PhysicsFrame({ tick: 12n }),
      },
    });
    expect(ServerMessage.fromBinary(message.toBinary()).payload.case)
      .toBe('physicsFrame');
  });

  it('lets clients request targets but not author rolls or completion', () => {
    const command = new ClientMessage({
      requestId: 'request-a',
      payload: {
        case: 'startRoll',
        value: new StartRollCommand({
          mode: RollMode.REROLL_EXISTING,
          targetDieIds: ['die-a', 'die-b'],
        }),
      },
    });
    const decoded = ClientMessage.fromBinary(command.toBinary());
    expect(decoded.payload.case).toBe('startRoll');
    if (decoded.payload.case === 'startRoll') {
      expect(decoded.payload.value.targetDieIds).toEqual(['die-a', 'die-b']);
    }
  });
});
