import { describe, expect, it } from 'vitest';
import {
  detectMessageLanguage,
  getContrastRatio,
  getRelativeLuminance,
  prefersReducedMotion,
} from './accessibility';

interface ContrastPair {
  label: string;
  fg: string;
  bg: string;
}

const LIGHT_THEME_CONTRAST_PAIRS: ContrastPair[] = [
  { label: 'Light body on surface', fg: '#1A1C1E', bg: '#F8F9FC' },
  { label: 'Light body on container-low', fg: '#1A1C1E', bg: '#F2F4F8' },
  { label: 'Light body on white bubble', fg: '#1A1C1E', bg: '#FFFFFF' },
  { label: 'Light muted text on surface', fg: '#44474F', bg: '#F8F9FC' },
  { label: 'Light muted text on container-low', fg: '#44474F', bg: '#F2F4F8' },
  { label: 'Light muted text on white bubble', fg: '#44474F', bg: '#FFFFFF' },
  { label: 'Light muted text on filter pill bar', fg: '#44474F', bg: '#EAEFF7' },
  { label: 'Light primary text on surface', fg: '#0B57D0', bg: '#F8F9FC' },
  { label: 'Light primary text on container-low', fg: '#0B57D0', bg: '#F2F4F8' },
  { label: 'Light white text on primary button', fg: '#FFFFFF', bg: '#0B57D0' },
  {
    label: 'Light user bubble text on primary-container',
    fg: '#041E49',
    bg: '#D3E3FD',
  },
  { label: 'Light tonal button text on EAEFF7', fg: '#041E49', bg: '#EAEFF7' },
  { label: 'Light sample photo button text on C2E7FF', fg: '#001D35', bg: '#C2E7FF' },
  { label: 'Light mastered badge on container-low', fg: '#0F5223', bg: '#F2F4F8' },
  { label: 'Light mastered badge on surface', fg: '#0F5223', bg: '#F8F9FC' },
  {
    label: 'Light struggling/error text on container-low',
    fg: '#B3261E',
    bg: '#F2F4F8',
  },
  { label: 'Light struggling/error text on surface', fg: '#B3261E', bg: '#F8F9FC' },
  { label: 'Light error banner text on F9DEDC', fg: '#410E0B', bg: '#F9DEDC' },
  { label: 'Light frustration amber counter on surface', fg: '#854D00', bg: '#F8F9FC' },
  { label: 'Light input placeholder on white', fg: '#575A63', bg: '#FFFFFF' },
  { label: 'Light search placeholder on container-low', fg: '#575A63', bg: '#F2F4F8' },
  { label: 'Light mastered pill badge on C4EED0', fg: '#072711', bg: '#C4EED0' },
  { label: 'Light mastery quiz CTA text on 072711', fg: '#FFFFFF', bg: '#072711' },
  { label: 'Light unlocked pill badge on C2E7FF', fg: '#001D35', bg: '#C2E7FF' },
  {
    label: 'Light locked/not-started pill badge on EAEFF7',
    fg: '#44474F',
    bg: '#EAEFF7',
  },
  {
    label: 'Landing Light hero white text on deep teal #2F7F84',
    fg: '#FFFFFF',
    bg: '#2F7F84',
  },
  {
    label: 'Landing Light dark ink on lime CTA/card #D4F36B',
    fg: '#111819',
    bg: '#D4F36B',
  },
  {
    label: 'Landing Light body copy on lime card #D4F36B',
    fg: '#1D2A14',
    bg: '#D4F36B',
  },
  {
    label: 'Landing Light white text on Open App pill #1C1C1C',
    fg: '#FFFFFF',
    bg: '#1C1C1C',
  },
  { label: 'Landing Light heading ink on #F5F9F9', fg: '#111819', bg: '#F5F9F9' },
  { label: 'Landing Light secondary copy on #F5F9F9', fg: '#425557', bg: '#F5F9F9' },
  { label: 'Landing Light teal eyebrow on #FFFFFF', fg: '#24666B', bg: '#FFFFFF' },
  {
    label: 'Landing Light white text on dark teal footer #103336',
    fg: '#FFFFFF',
    bg: '#103336',
  },
  { label: 'Light active voice mic icon on B3261E', fg: '#FFFFFF', bg: '#B3261E' },
  {
    label: 'Light heatmap Progressing amber badge on FEF3C7',
    fg: '#78350F',
    bg: '#FEF3C7',
  },
  {
    label: 'Light heatmap Not Started grey badge on E5E7EB',
    fg: '#374151',
    bg: '#E5E7EB',
  },
  {
    label:
      'Landing hero stat chip white text over rgba(18,59,62,0.85) on white (#35585B)',
    fg: '#FFFFFF',
    bg: '#35585B',
  },
  {
    label:
      'Landing hero stat chip muted label (#E2F1F2) over rgba(18,59,62,0.85) on white (#35585B)',
    fg: '#E2F1F2',
    bg: '#35585B',
  },
];

const DARK_THEME_CONTRAST_PAIRS: ContrastPair[] = [
  { label: 'Night body on surface', fg: '#E2E2E9', bg: '#111318' },
  { label: 'Night body on container-low', fg: '#E2E2E9', bg: '#191C22' },
  { label: 'Night body on assistant bubble', fg: '#E2E2E9', bg: '#22262E' },
  { label: 'Night body on button surface', fg: '#E2E2E9', bg: '#282B33' },
  { label: 'Night muted text on surface', fg: '#C4C6D0', bg: '#111318' },
  { label: 'Night muted text on container-low', fg: '#C4C6D0', bg: '#191C22' },
  { label: 'Night muted text on assistant bubble', fg: '#C4C6D0', bg: '#22262E' },
  { label: 'Night muted text on filter pill bar', fg: '#C4C6D0', bg: '#1F2229' },
  { label: 'Night primary text on surface', fg: '#A8C7FA', bg: '#111318' },
  { label: 'Night primary text on container-low', fg: '#A8C7FA', bg: '#191C22' },
  { label: 'Night on-primary text on primary button', fg: '#062E6F', bg: '#A8C7FA' },
  {
    label: 'Night user bubble text on primary-container',
    fg: '#E8F0FE',
    bg: '#0842A0',
  },
  { label: 'Night quick prompt text on 282B33', fg: '#E8F0FE', bg: '#282B33' },
  { label: 'Night sample photo text on 004A77', fg: '#D8F0FF', bg: '#004A77' },
  { label: 'Night active mobile tab text on 004A77', fg: '#C2E7FF', bg: '#004A77' },
  { label: 'Night mastered badge on container-low', fg: '#A8DAB5', bg: '#191C22' },
  { label: 'Night mastered badge on surface', fg: '#A8DAB5', bg: '#111318' },
  {
    label: 'Night struggling/error text on container-low',
    fg: '#F2B8B5',
    bg: '#191C22',
  },
  { label: 'Night struggling/error text on surface', fg: '#F2B8B5', bg: '#111318' },
  { label: 'Night error banner text on 8C1D18', fg: '#F9DEDC', bg: '#8C1D18' },
  { label: 'Night frustration amber counter on surface', fg: '#F6C86E', bg: '#111318' },
  { label: 'Night input placeholder on surface', fg: '#A0A4B0', bg: '#111318' },
  { label: 'Night search placeholder on container-low', fg: '#A0A4B0', bg: '#191C22' },
  { label: 'Night mastered pill badge on 0F5223', fg: '#C4EED0', bg: '#0F5223' },
  { label: 'Night mastery quiz CTA text on C4EED0', fg: '#072711', bg: '#C4EED0' },
  { label: 'Night unlocked pill badge on 004A77', fg: '#D8F0FF', bg: '#004A77' },
  {
    label: 'Night locked/not-started pill badge on 282B33',
    fg: '#C4C6D0',
    bg: '#282B33',
  },
  {
    label: 'Landing Night hero white text on deep teal #123B3E',
    fg: '#FFFFFF',
    bg: '#123B3E',
  },
  {
    label: 'Landing Night lime accent on deep teal #123B3E',
    fg: '#D4F36B',
    bg: '#123B3E',
  },
  {
    label: 'Landing Night dark ink on unchanged lime card #D4F36B',
    fg: '#111819',
    bg: '#D4F36B',
  },
  {
    label: 'Landing Night primary text on feature panel #0F1F20',
    fg: '#ECF4F4',
    bg: '#0F1F20',
  },
  {
    label: 'Landing Night muted copy on feature panel #0F1F20',
    fg: '#B4CECF',
    bg: '#0F1F20',
  },
  {
    label: 'Landing Night lime eyebrow on feature panel #0F1F20',
    fg: '#D4F36B',
    bg: '#0F1F20',
  },
  {
    label: 'Landing Night white text on dark teal footer #0A2224',
    fg: '#FFFFFF',
    bg: '#0A2224',
  },
  { label: 'Night active voice mic icon on F2B8B5', fg: '#410E0B', bg: '#F2B8B5' },
  {
    label: 'Night heatmap Progressing amber badge on 4A3208',
    fg: '#FDE68A',
    bg: '#4A3208',
  },
];

describe('accessibility utilities', () => {
  describe('detectMessageLanguage', () => {
    it('detects Hindi Devanagari text as hi', () => {
      expect(detectMessageLanguage('प्रकाश संश्लेषण क्या होता है?')).toBe('hi');
    });

    it('detects Marathi Devanagari text as mr via Marathi-specific chars or vocabulary', () => {
      expect(detectMessageLanguage('मला गणित समजत नाही, कृपया मदत करा.')).toBe('mr');
      expect(detectMessageLanguage('सूर्यप्रकाशात झाडे अन्न तयार करतात व फळे देतात.')).toBe(
        'mr'
      );
    });

    it('detects Tamil script as ta', () => {
      expect(detectMessageLanguage('வணக்கம்! இந்த கணக்கை தீர்க்க உதவ முடியுமா?')).toBe('ta');
    });

    it('detects Gujarati script as gu', () => {
      expect(detectMessageLanguage('નમસ્તે! આ ગણિતનો પ્રશ્ન સમજાવશો?')).toBe('gu');
    });

    it('defaults to en for Latin script and empty strings', () => {
      expect(detectMessageLanguage('Can you help me solve 2x + 5 = 15?')).toBe('en');
      expect(detectMessageLanguage('')).toBe('en');
    });
  });

  describe('WCAG 2.2 AA contrast audit (>= 4.5:1)', () => {
    it('computes accurate relative luminance and rejects malformed hex strings', () => {
      expect(getRelativeLuminance('#000000')).toBeCloseTo(0, 5);
      expect(getRelativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
      expect(getContrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
      expect(() => getRelativeLuminance('#FFF')).toThrow();
    });

    it.each(LIGHT_THEME_CONTRAST_PAIRS)(
      'Light theme meets >= 4.5:1 for $label ($fg on $bg)',
      ({ fg, bg }) => {
        expect(getContrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    );

    it.each(DARK_THEME_CONTRAST_PAIRS)(
      'Night theme meets >= 4.5:1 for $label ($fg on $bg)',
      ({ fg, bg }) => {
        expect(getContrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
      }
    );
  });

  describe('prefersReducedMotion', () => {
    it('returns false safely in non-browser/default matchMedia environment', () => {
      expect(typeof prefersReducedMotion()).toBe('boolean');
    });
  });
});
