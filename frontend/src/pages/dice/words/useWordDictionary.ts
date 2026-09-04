import { useEffect, useState } from 'react';
import dictionaryAsset from './scrabbleDictionary.txt';

export type WordDictionaryState =
  | { status: 'loading' }
  | { status: 'ready'; words: ReadonlySet<string> }
  | { status: 'error' };

const dictionaryUrl = new URL(dictionaryAsset, import.meta.url);
let dictionaryPromise: Promise<ReadonlySet<string>> | undefined;

export function parseWordDictionary(value: unknown): ReadonlySet<string> {
  if (typeof value !== 'string') {
    throw new Error('The bundled word dictionary has an invalid format.');
  }

  const text = value.replace(/^\uFEFF/, '').replace(/\r?\n$/, '');
  const words = text === '' ? [] : text.split(/\r?\n/);
  const uniqueWords = new Set(words);
  if (
    words.length === 0
    || words.some((word) => !/^[A-Z]{2,}$/.test(word))
    || uniqueWords.size !== words.length
  ) {
    throw new Error('The bundled word dictionary has an invalid format.');
  }

  return uniqueWords;
}

function loadWordDictionary(): Promise<ReadonlySet<string>> {
  dictionaryPromise ??= fetch(dictionaryUrl)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Dictionary request failed with ${response.status}.`);
      }
      return response.text();
    })
    .then(parseWordDictionary);
  return dictionaryPromise;
}

export function useWordDictionary(): WordDictionaryState {
  const [state, setState] = useState<WordDictionaryState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    loadWordDictionary().then(
      (words) => active && setState({ status: 'ready', words }),
      (error) => {
        console.error('Could not load the letter-dice dictionary.', error);
        if (active) {
          setState({ status: 'error' });
        }
      },
    );
    return () => {
      active = false;
    };
  }, []);

  return state;
}
