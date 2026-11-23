/** Character sets without look-alikes (0/O, 1/l/I) so a password read aloud or typed from a screen works. */
const SETS = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '!@#$%&*?-_'];

function randomIndex(max: number): number {
  const buffer = new Uint32Array(1);
  // Rejection sampling: no modulo bias.
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(buffer); while (buffer[0] >= limit);
  return buffer[0] % max;
}

/** A random strong password with at least one upper, lower, digit and symbol (crypto.getRandomValues). */
export function generateStrongPassword(length = 14): string {
  const size = Math.max(length, SETS.length);
  const all = SETS.join('');
  const chars = SETS.map((set) => set[randomIndex(set.length)]);
  while (chars.length < size) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}
