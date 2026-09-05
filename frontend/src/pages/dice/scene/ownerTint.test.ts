import { describe, expect, it } from 'vitest';
import { ownerDieMaterial } from './Die';
import { ownerDieStyle, ownerTint } from './ownerTint';

describe('owner tint', () => {
  it('is stable and distinguishes player identities', () => {
    expect(ownerTint('player-a')).toBe(ownerTint('player-a'));
    expect(ownerTint('player-a')).not.toBe(ownerTint('player-b'));
    expect(ownerDieStyle('player-a')).toEqual(ownerDieStyle('player-a'));
    expect(ownerDieStyle('player-a')).not.toEqual(ownerDieStyle('player-b'));
    expect(ownerDieStyle('player-a').pattern)
      .not.toBe(ownerDieStyle('player-b').pattern);
  });

  it('reuses a body material for the same tint', () => {
    const first = ownerDieMaterial('player-a');
    const second = ownerDieMaterial('player-a');
    const other = ownerDieMaterial('player-b');
    expect(first).toBe(second);
    expect(first).not.toBe(other);
    expect(`#${first.color.getHexString()}`)
      .toBe(ownerDieStyle('player-a').bodyColor);
  });
});
