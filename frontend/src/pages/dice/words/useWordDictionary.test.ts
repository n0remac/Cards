import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseWordDictionary } from './useWordDictionary';

const dictionaryFile = readFileSync(
  new URL('./scrabbleDictionary.txt', import.meta.url),
  'utf8',
);

describe('parseWordDictionary', () => {
  it('loads the normalized bundled dictionary', () => {
    const words = parseWordDictionary(dictionaryFile);

    expect(words.size).toBe(178691);
    expect(words.has('CAT')).toBe(true);
    expect(words.has('DAG')).toBe(true);
  });

  it('creates an uppercase word lookup set', () => {
    const words = parseWordDictionary('CAT\nDAG\nTO\n');

    expect(words.has('CAT')).toBe(true);
    expect(words.has('DOG')).toBe(false);
  });

  it.each([
    undefined,
    '',
    'cat',
    'A',
    'TWO-WORDS',
    'CAT ',
    'CAT\n\nDOG',
    'CAT\nCAT',
  ])('rejects invalid dictionary data %#', (value) => {
    expect(() => parseWordDictionary(value)).toThrow(/invalid format/);
  });
});
