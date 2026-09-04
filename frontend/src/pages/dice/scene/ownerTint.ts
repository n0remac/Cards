// FNV-1a gives a stable, inexpensive owner hue without synchronizing presence.
export function ownerTint(ownerPlayerId: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < ownerPlayerId.length; index += 1) {
    hash ^= ownerPlayerId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  const hue = (hash >>> 0) % 360;
  return `hsl(${hue} 38% 85%)`;
}
