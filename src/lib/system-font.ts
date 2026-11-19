/**
 * The system font chosen by the owner (Super Admin), applied to every page from sign-in on.
 * Cairo when nothing is set. The same font covers Arabic and English; when a chosen font has
 * no Arabic letters, Arabic falls back to Cairo instead of the device font.
 */
export const DEFAULT_SYSTEM_FONT = 'Cairo';

const FONT_PATTERN = /^[A-Za-z0-9 -]{1,40}$/;

export function normalizeSystemFont(value: unknown): string {
  const font = typeof value === 'string' ? value.trim() : '';
  return FONT_PATTERN.test(font) ? font : DEFAULT_SYSTEM_FONT;
}

export function isDefaultSystemFont(font: string): boolean {
  return font.toLowerCase() === DEFAULT_SYSTEM_FONT.toLowerCase();
}

/** CSS value for --font-platform: the chosen font, then Cairo for any letters it lacks. */
export function systemFontStack(font: string): string {
  return `"${font}", var(--font-cairo), "Cairo"`;
}

export function systemFontStylesheet(font: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(font).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
}

/** Server side: read the public owner font (cached for a minute). Falls back to Cairo on any error. */
export async function fetchSystemFont(apiBaseUrl: string): Promise<string> {
  try {
    const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/v1/branding/font`, {
      headers: { Accept: 'application/json' },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(2500),
    });
    if (!res.ok) return DEFAULT_SYSTEM_FONT;
    const body = (await res.json()) as { data?: { font_family?: unknown } };
    return normalizeSystemFont(body?.data?.font_family);
  } catch {
    return DEFAULT_SYSTEM_FONT;
  }
}
