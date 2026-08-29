export type LetterMaterialCache<T> = {
  get: (letter: string) => T;
  size: () => number;
};

export function createLetterMaterialCache<T>(
  createMaterial: (letter: string) => T,
): LetterMaterialCache<T> {
  const materials = new Map<string, T>();
  return {
    get(letter) {
      const normalizedLetter = letter.toUpperCase();
      const existing = materials.get(normalizedLetter);
      if (existing) {
        return existing;
      }
      const material = createMaterial(normalizedLetter);
      materials.set(normalizedLetter, material);
      return material;
    },
    size: () => materials.size,
  };
}
