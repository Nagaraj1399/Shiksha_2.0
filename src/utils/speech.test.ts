import { describe, expect, it } from 'vitest';
import {
  combineLiveTranscript,
  formatSpeechError,
  inferSpeechLanguageFromProfile,
  pickMatchingVoice,
  stripMarkdownForSpeech,
  type BrowserSpeechRecognitionResultList,
} from './speech';

describe('speech utilities', () => {
  it('inferSpeechLanguageFromProfile maps Indian student language preferences to BCP-47 locales', () => {
    expect(inferSpeechLanguageFromProfile('Hindi / English')).toBe('hi-IN');
    expect(inferSpeechLanguageFromProfile('Tamil / English')).toBe('ta-IN');
    expect(inferSpeechLanguageFromProfile('Marathi / English')).toBe('mr-IN');
    expect(inferSpeechLanguageFromProfile('Gujarati / English')).toBe('en-IN');
    expect(inferSpeechLanguageFromProfile(undefined)).toBe('en-IN');
  });

  it('combineLiveTranscript joins finalized and interim speech chunks onto any existing prefix', () => {
    const fakeResults = {
      length: 2,
      0: {
        isFinal: true,
        length: 1,
        0: { transcript: 'Photosynthesis kya', confidence: 0.95 },
      },
      1: {
        isFinal: false,
        length: 1,
        0: { transcript: 'hota hai', confidence: 0.7 },
      },
    } as unknown as BrowserSpeechRecognitionResultList;

    expect(combineLiveTranscript('', fakeResults)).toBe('Photosynthesis kya hota hai');
    expect(combineLiveTranscript('Sir,', fakeResults)).toBe(
      'Sir, Photosynthesis kya hota hai'
    );
  });

  it('stripMarkdownForSpeech removes markdown syntax and math delimiters cleanly', () => {
    const raw =
      '## Step 1\n- Try solving **$2x + 5 = 15$**\n- Subtract _5_ from `both sides`';
    expect(stripMarkdownForSpeech(raw)).toBe(
      'Step 1 Try solving 2x + 5 = 15 Subtract 5 from both sides'
    );
  });

  it('pickMatchingVoice prefers exact locale match then primary prefix fallback', () => {
    const voices = [
      { lang: 'en-US', name: 'English US' },
      { lang: 'hi-IN', name: 'Hindi India' },
      { lang: 'ta-SG', name: 'Tamil SG' },
    ] as SpeechSynthesisVoice[];

    expect(pickMatchingVoice(voices, 'hi-IN')?.name).toBe('Hindi India');
    expect(pickMatchingVoice(voices, 'ta-IN')?.name).toBe('Tamil SG');
    expect(pickMatchingVoice(voices, 'mr-IN')).toBeNull();
    expect(pickMatchingVoice([], 'en-IN')).toBeNull();
  });

  it('formatSpeechError returns null on abort and helpful messages for mic errors', () => {
    expect(formatSpeechError('aborted')).toBeNull();
    expect(formatSpeechError('not-allowed')).toMatch(/permission/i);
    expect(formatSpeechError('no-speech')).toMatch(/No speech/i);
    expect(formatSpeechError('audio-capture')).toMatch(/No microphone/i);
    expect(formatSpeechError('network')).toMatch(/internet/i);
    expect(formatSpeechError('unknown-code')).toMatch(/try again/i);
  });
});
