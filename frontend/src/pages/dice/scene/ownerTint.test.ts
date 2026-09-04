import { describe, expect, it } from 'vitest';
import { ownerDieMaterial } from './Die';
import { ownerTint } from './ownerTint';

describe('owner tint', () => {
  it('is stable and distinguishes player identities', () => {
    expect(ownerTint('player-a')).toBe(ownerTint('player-a'));
    expect(ownerTint('player-a')).not.toBe(ownerTint('player-b'));
  });

  it('reuses a body material for the same tint', () => {
    expect(ownerDieMaterial('player-a')).toBe(ownerDieMaterial('player-a'));
  });
});
