export const OWNER_DIE_PATTERNS = [
  'corner-brackets',
  'double-bars',
  'corner-dots',
  'diagonal-cuts',
  'edge-blocks',
  'diamonds',
] as const;

export type OwnerDiePattern = typeof OWNER_DIE_PATTERNS[number];

export type OwnerDieStyle = {
  key: string;
  bodyColor: string;
  accentColor: string;
  pattern: OwnerDiePattern;
};

const OWNER_DIE_PALETTES = [
  { bodyColor: '#f29b9b', accentColor: '#6f1d2b' },
  { bodyColor: '#f2c56f', accentColor: '#704214' },
  { bodyColor: '#b8d879', accentColor: '#355e1c' },
  { bodyColor: '#80d7ac', accentColor: '#145943' },
  { bodyColor: '#78ced8', accentColor: '#15556a' },
  { bodyColor: '#86baf2', accentColor: '#173f7a' },
  { bodyColor: '#a9a0ed', accentColor: '#3b287a' },
  { bodyColor: '#c89be8', accentColor: '#572271' },
  { bodyColor: '#e79bc3', accentColor: '#74204f' },
  { bodyColor: '#eea27d', accentColor: '#71341f' },
  { bodyColor: '#d6d878', accentColor: '#575d17' },
  { bodyColor: '#83d7cb', accentColor: '#185c58' },
] as const;

// FNV-1a plus a final fold gives each anonymous owner a stable palette and
// motif without adding presence metadata to the multiplayer protocol.
function ownerHash(ownerPlayerId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < ownerPlayerId.length; index += 1) {
    hash ^= ownerPlayerId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function ownerDieStyle(ownerPlayerId: string): OwnerDieStyle {
  const hash = ownerHash(ownerPlayerId);
  const folded = (hash ^ (hash >>> 16)) >>> 0;
  const paletteIndex = folded % OWNER_DIE_PALETTES.length;
  const patternIndex = ((hash ^ (hash >>> 8)) >>> 0) % OWNER_DIE_PATTERNS.length;
  const palette = OWNER_DIE_PALETTES[paletteIndex];
  const pattern = OWNER_DIE_PATTERNS[patternIndex];
  return {
    key: `${paletteIndex}-${patternIndex}`,
    bodyColor: palette.bodyColor,
    accentColor: palette.accentColor,
    pattern,
  };
}

export function ownerTint(ownerPlayerId: string): string {
  return ownerDieStyle(ownerPlayerId).bodyColor;
}
