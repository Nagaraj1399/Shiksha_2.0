import type { DetectedLanguageCode } from '../../shared/types';

const TAMIL_SCRIPT_RE = /[\u0B80-\u0BFF]/;
const GUJARATI_SCRIPT_RE = /[\u0A80-\u0AFF]/;
const DEVANAGARI_SCRIPT_RE = /[\u0900-\u097F]/;

/** Characters and high-frequency function words distinguishing Marathi from Hindi in Devanagari. */
const MARATHI_CHAR_RE = /[\u0933\u0931]/; // ळ, ऱ
const MARATHI_WORD_LIST = [
  'आहे',
  'आहेत',
  'नाही',
  'तुम्ही',
  'मला',
  'मराठी',
  'पाहिजे',
  'आणि',
  'कसे',
  'करतो',
  'करते',
  'शकतो',
  'होते',
  'काय',
] as const;

/**
 * Detects the primary writing script/language of a chat message so assistive
 * technologies select the appropriate speech synthesis voice via the HTML
 * `lang` attribute.
 *
 * Returns `'ta'` for Tamil, `'gu'` for Gujarati, `'mr'` for Marathi
 * (Devanagari with Marathi-specific characters or function words), `'hi'` for
 * Hindi/general Devanagari, and `'en'` otherwise.
 */
export function detectMessageLanguage(text: string): DetectedLanguageCode {
  if (!text) return 'en';
  if (TAMIL_SCRIPT_RE.test(text)) return 'ta';
  if (GUJARATI_SCRIPT_RE.test(text)) return 'gu';
  if (DEVANAGARI_SCRIPT_RE.test(text)) {
    if (MARATHI_CHAR_RE.test(text)) return 'mr';
    const tokens = text.split(/[\s,.;:!?()[\]"'—–-]+/).filter(Boolean);
    if (
      tokens.some((token) => (MARATHI_WORD_LIST as readonly string[]).includes(token))
    ) {
      return 'mr';
    }
    return 'hi';
  }
  return 'en';
}

/**
 * Checks whether the user prefers reduced motion via the OS/browser media query.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Computes WCAG 2.x relative luminance (`0` black to `1` white) for a 6-digit
 * hex colour string (with or without leading `#`).
 */
export function getRelativeLuminance(hex: string): number {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new Error(`Invalid 6-digit hex color: ${hex}`);
  }
  const channels = [0, 2, 4].map((offset) => {
    const srgb = parseInt(clean.slice(offset, offset + 2), 16) / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * Computes the WCAG 2.x contrast ratio (`1` to `21`) between foreground and
 * background 6-digit hex colours.
 */
export function getContrastRatio(fgHex: string, bgHex: string): number {
  const l1 = getRelativeLuminance(fgHex);
  const l2 = getRelativeLuminance(bgHex);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Returns all currently keyboard-focusable elements inside a container (used
 * for modal focus trapping).
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute('aria-hidden') !== 'true'
  );
}
