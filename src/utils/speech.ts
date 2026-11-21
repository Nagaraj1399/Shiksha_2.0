import type { SpeechLanguageCode } from '../../shared/types';

/** Minimal cross-browser typing for a single speech recognition alternative. */
export interface BrowserSpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

/** Minimal cross-browser typing for a speech recognition result entry. */
export interface BrowserSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

/** Minimal cross-browser typing for the results list on `onresult`. */
export interface BrowserSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: BrowserSpeechRecognitionResult;
}

/** Event payload passed to `SpeechRecognition.onresult`. */
export interface BrowserSpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: BrowserSpeechRecognitionResultList;
}

/** Event payload passed to `SpeechRecognition.onerror`. */
export interface BrowserSpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message?: string;
}

/** Minimal cross-browser typing for `SpeechRecognition` / `webkitSpeechRecognition`. */
export interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

/** Constructor type for `SpeechRecognition` / `webkitSpeechRecognition`. */
export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

interface WindowWithSpeechRecognition extends Window {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
}

/**
 * Returns the browser's `SpeechRecognition` constructor (standard or WebKit-prefixed),
 * or `null` when unavailable.
 */
export function getSpeechRecognitionConstructor(): BrowserSpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as WindowWithSpeechRecognition;
  const ctor = win.SpeechRecognition ?? win.webkitSpeechRecognition;
  return typeof ctor === 'function' ? ctor : null;
}

/**
 * Returns `true` when the browser supports live speech-to-text recognition via
 * the Web Speech API.
 */
export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

/**
 * Returns `true` when the browser supports text-to-speech playback via
 * `window.speechSynthesis` and `SpeechSynthesisUtterance`.
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    typeof window.speechSynthesis !== 'undefined' &&
    typeof window.speechSynthesis?.speak === 'function' &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/**
 * Maps a student's `preferredLanguage` profile string (e.g. `"Tamil / English"`)
 * to the closest supported Indian BCP-47 voice language code.
 */
export function inferSpeechLanguageFromProfile(
  preferredLanguage?: string
): SpeechLanguageCode {
  if (!preferredLanguage) return 'en-IN';
  const normalized = preferredLanguage.toLowerCase();
  if (normalized.includes('tamil')) return 'ta-IN';
  if (normalized.includes('marathi')) return 'mr-IN';
  if (normalized.includes('hindi')) return 'hi-IN';
  return 'en-IN';
}

/**
 * Combines finalized and interim Web Speech API results into a single live
 * transcript string appended to any pre-existing composer prefix.
 */
export function combineLiveTranscript(
  prefix: string,
  results: BrowserSpeechRecognitionResultList
): string {
  const parts: string[] = [];
  for (let i = 0; i < results.length; i += 1) {
    const chunk = results[i]?.[0]?.transcript?.trim();
    if (chunk) {
      parts.push(chunk);
    }
  }
  const spoken = parts.join(' ').trim();
  const cleanPrefix = prefix.trim();
  if (!cleanPrefix) return spoken;
  if (!spoken) return cleanPrefix;
  return `${cleanPrefix} ${spoken}`;
}

/**
 * Strips Markdown formatting and inline math delimiters so `speechSynthesis`
 * reads tutor replies naturally without pronouncing punctuation markup.
 */
export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/^\s*[-*•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Selects the best available `SpeechSynthesisVoice` matching the chosen Indian
 * locale (exact BCP-47 match first, then primary language prefix fallback).
 */
export function pickMatchingVoice(
  voices: readonly SpeechSynthesisVoice[],
  lang: SpeechLanguageCode
): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const target = lang.toLowerCase();
  const exact = voices.find((v) => v.lang.toLowerCase() === target);
  if (exact) return exact;
  const primary = target.split('-')[0];
  const byPrefix = voices.find((v) => v.lang.toLowerCase().startsWith(`${primary}-`));
  if (byPrefix) return byPrefix;
  return voices.find((v) => v.lang.toLowerCase() === primary) ?? null;
}

/**
 * Converts a Web Speech API `SpeechRecognitionErrorEvent.error` code into a
 * calm, actionable message for the student. Returns `null` for intentional aborts.
 */
export function formatSpeechError(errorCode: string): string | null {
  switch (errorCode) {
    case 'aborted':
      return null;
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission was blocked. Please allow microphone access in your browser to dictate questions.';
    case 'no-speech':
      return 'No speech was detected. Tap the mic and speak clearly near your device.';
    case 'audio-capture':
      return 'No microphone was found on this device. You can still type your question below.';
    case 'network':
      return 'Voice recognition needs an internet connection right now. Please try again or type your question.';
    default:
      return 'Voice input stopped unexpectedly. Please tap the mic to try again.';
  }
}
