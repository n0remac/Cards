import { describe, expect, it, vi } from 'vitest';
import { createLetterMaterialCache } from './letterMaterialCache';

describe('letter material cache', () => {
  it('creates one shared material per normalized uppercase letter', () => {
    const createMaterial = vi.fn((letter: string) => ({ letter }));
    const cache = createLetterMaterialCache(createMaterial);

    expect(cache.get('m')).toBe(cache.get('M'));
    expect(cache.get('L')).toEqual({ letter: 'L' });
    expect(createMaterial).toHaveBeenCalledTimes(2);
    expect(cache.size()).toBe(2);
  });
});
