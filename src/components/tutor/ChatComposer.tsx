import React from 'react';
import {
  Camera,
  ImagePlus,
  Loader2,
  Mic,
  MicOff,
  SendHorizontal,
  X,
} from 'lucide-react';
import { MAX_MESSAGE_CHARS, SPEECH_LANGUAGE_OPTIONS } from '../../../shared/config';
import type { SpeechLanguageCode } from '../../../shared/types';
import { type EncodedImageAttachment, formatByteSize } from '../../utils/imageHelper';

const QUICK_STUDENT_PROMPTS = [
  {
    label: 'Solve 2x + 5 = 15',
    prompt: 'Can you solve this for me? $2x + 5 = 15$',
  },
  {
    label: 'Photosynthesis in Hindi',
    prompt: 'Photosynthesis kya hota hai? Mujhe samajh nahi aa raha.',
  },
  {
    label: 'I feel like giving up',
    prompt:
      'I give up on algebra. I have failed this topic three times and nothing makes sense to me anymore.',
  },
] as const;

export interface ChatComposerProps {
  inputText: string;
  onChangeInputText: (value: string) => void;
  attachment: EncodedImageAttachment | null;
  isCompressing: boolean;
  isLoading: boolean;
  hasActiveStudent: boolean;
  hasAnyVoiceFeature: boolean;
  speechRecognitionSupported: boolean;
  speechLang: SpeechLanguageCode;
  isListening: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAttachSampleHomework: () => void;
  onRemoveAttachment: () => void;
  onQuickPrompt: (prompt: string) => void;
  onChangeSpeechLang: (lang: SpeechLanguageCode) => void;
  onToggleListening: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Student Tutor composer bar including quick-try starters, sample homework
 * photo loader, compressed attachment preview, Web Speech voice selector/mic,
 * and message input form.
 */
export function ChatComposer({
  inputText,
  onChangeInputText,
  attachment,
  isCompressing,
  isLoading,
  hasActiveStudent,
  hasAnyVoiceFeature,
  speechRecognitionSupported,
  speechLang,
  isListening,
  fileInputRef,
  inputRef,
  onFileChange,
  onAttachSampleHomework,
  onRemoveAttachment,
  onQuickPrompt,
  onChangeSpeechLang,
  onToggleListening,
  onSubmit,
}: ChatComposerProps) {
  const controlsDisabled = isLoading || isCompressing || !hasActiveStudent;

  return (
    <>
      <div className="px-3 sm:px-5 pt-2 pb-1.5 border-t border-[#E2E7F0] dark:border-[#282B33] bg-white/50 dark:bg-[#1F2229]/60">
        <div className="flex flex-wrap items-center gap-2">
          {QUICK_STUDENT_PROMPTS.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={controlsDisabled}
              onClick={() => onQuickPrompt(item.prompt)}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E8F0FE] transition-colors disabled:opacity-50 text-left"
            >
              {item.label}
            </button>
          ))}

          <button
            type="button"
            title="Attach a sample handwritten math homework photo"
            disabled={controlsDisabled}
            onClick={onAttachSampleHomework}
            className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#C2E7FF] hover:bg-[#A8DCFF] text-[#001D35] dark:bg-[#004A77] dark:hover:bg-[#005B92] dark:text-[#D8F0FF] transition-colors disabled:opacity-50"
          >
            <ImagePlus className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Try a sample</span>
          </button>
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="p-3 sm:px-5 sm:py-3.5 bg-white/70 dark:bg-[#1F2229]/80"
      >
        {isCompressing && (
          <div
            role="status"
            aria-live="polite"
            className="mb-2.5 flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#EAEFF7] dark:bg-[#282B33] text-xs text-[#44474F] dark:text-[#C4C6D0]"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" aria-hidden="true" />
            <span>Compressing image for fast upload...</span>
          </div>
        )}

        {attachment && !isCompressing && (
          <div className="mb-2.5 flex items-center gap-3 p-2 rounded-2xl bg-[#EAEFF7] dark:bg-[#282B33]">
            <img
              src={attachment.previewUrl}
              alt={attachment.label}
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#1A1C1E] dark:text-[#E2E2E9] truncate">
                {attachment.label}
              </p>
              <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] font-mono-tabular">
                {attachment.width}×{attachment.height} · Compressed:{' '}
                {formatByteSize(attachment.compressedBytes)}
              </p>
            </div>
            <button
              type="button"
              onClick={onRemoveAttachment}
              aria-label="Remove attached homework photo"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#44474F] dark:text-[#C4C6D0] shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {hasAnyVoiceFeature && (
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <label
                htmlFor="student-voice-lang"
                className="text-xs font-medium text-[#44474F] dark:text-[#C4C6D0]"
              >
                Voice language
              </label>
              <select
                id="student-voice-lang"
                value={speechLang}
                onChange={(e) =>
                  onChangeSpeechLang(e.target.value as SpeechLanguageCode)
                }
                className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#282B33] text-[#1A1C1E] dark:text-[#E2E2E9] border border-[#C4C6D0] dark:border-[#44474F] focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
              >
                {SPEECH_LANGUAGE_OPTIONS.map((opt) => (
                  <option key={opt.code} value={opt.code}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {isListening && (
              <div
                role="status"
                aria-live="polite"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B3261E] dark:text-[#F2B8B5]"
              >
                <span
                  aria-hidden="true"
                  className="w-2 h-2 rounded-full bg-[#B3261E] dark:bg-[#F2B8B5] animate-pulse"
                />
                <span>Listening ({speechLang})…</span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="hidden"
            aria-label="Upload textbook or homework photo"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            aria-label="Attach homework photo"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors shrink-0 disabled:opacity-50"
          >
            <Camera className="w-5 h-5" aria-hidden="true" />
          </button>

          {speechRecognitionSupported && (
            <button
              type="button"
              onClick={onToggleListening}
              disabled={controlsDisabled}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl transition-colors shrink-0 disabled:opacity-50 ${
                isListening
                  ? 'bg-[#B3261E] hover:bg-[#931E17] text-white dark:bg-[#F2B8B5] dark:hover:bg-[#F7CBC8] dark:text-[#410E0B]'
                  : 'bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9]'
              }`}
            >
              {isListening ? (
                <MicOff className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Mic className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
          )}

          <label htmlFor="student-message-input" className="sr-only">
            Ask a question in Hindi, Tamil, Marathi, or English
          </label>
          <input
            ref={inputRef}
            id="student-message-input"
            type="text"
            maxLength={MAX_MESSAGE_CHARS}
            value={inputText}
            onChange={(e) => onChangeInputText(e.target.value)}
            placeholder="Ask in Hindi, Tamil, Marathi, or English..."
            className="flex-1 min-w-0 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#111318] text-sm text-[#1A1C1E] dark:text-[#E2E2E9] placeholder:text-[#575A63] dark:placeholder:text-[#A0A4B0] border border-[#C4C6D0] dark:border-[#44474F] focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
          />

          <button
            type="submit"
            disabled={controlsDisabled || (!inputText.trim() && !attachment)}
            aria-label="Send student message"
            className="min-w-[44px] min-h-[44px] px-3.5 sm:px-4 flex items-center justify-center gap-2 rounded-2xl bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] font-medium text-sm transition-colors disabled:opacity-45 shrink-0"
          >
            <SendHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
      </form>
    </>
  );
}
