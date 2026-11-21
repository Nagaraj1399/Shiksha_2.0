import React, { memo, useEffect, useRef } from 'react';
import {
  FileImage,
  ImagePlus,
  Loader2,
  Printer,
  RotateCcw,
  SendHorizontal,
  X,
} from 'lucide-react';
import { WELCOME_MESSAGE_IDS } from '../../../shared/config';
import type { ChatMessage } from '../../../shared/types';
import { detectMessageLanguage, prefersReducedMotion } from '../../utils/accessibility';
import { type EncodedImageAttachment, formatByteSize } from '../../utils/imageHelper';
import { MarkdownText } from '../MarkdownText';

const TEACHER_TEMPLATES = [
  {
    label: '6th Grade Fractions (40-min)',
    prompt:
      'I need to teach fractions to my 6th graders tomorrow. Give me a 40-minute lesson plan with a short 3-question exit quiz and a separate "## Answer Key" section.',
  },
  {
    label: 'Bilingual Science Worksheet',
    prompt:
      'Create a bilingual (English + Hindi) 5-question practice worksheet on Photosynthesis for Class 6 state-board students, and include all solutions at the end under a "## Answer Key" heading.',
  },
  {
    label: 'Struggling Student Intervention',
    prompt:
      'Review our recent struggling student logs and active dropout alerts, and recommend a concrete 15-minute remediation plan.',
  },
] as const;

const TeacherChatMessageRow = memo(function TeacherChatMessageRow({
  msg,
  onPrint,
}: {
  msg: ChatMessage;
  onPrint: (msg: ChatMessage) => void;
}) {
  const isUser = msg.role === 'user';
  const messageLang = detectMessageLanguage(msg.text);
  const canPrint = !isUser && msg.id !== WELCOME_MESSAGE_IDS.TEACHER;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        lang={messageLang}
        className={`max-w-[92%] sm:max-w-[85%] px-4 sm:px-5 py-3.5 ${
          isUser
            ? 'bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE] rounded-[22px] rounded-br-md'
            : 'bg-white text-[#1A1C1E] dark:bg-[#22262E] dark:text-[#E2E2E9] rounded-[22px] rounded-bl-md border border-[#E2E7F0] dark:border-[#2F333D]'
        }`}
      >
        {msg.imageUrl && (
          <div className="mb-3 overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
            <img
              src={msg.imageUrl}
              alt="Uploaded syllabus textbook page"
              referrerPolicy="no-referrer"
              className="max-h-56 w-auto max-w-full object-cover rounded-2xl"
            />
          </div>
        )}
        <MarkdownText text={msg.text} />
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          {canPrint ? (
            <button
              type="button"
              onClick={() => onPrint(msg)}
              className="min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E8F0FE] transition-colors"
            >
              <Printer className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>Print / Export Sheet</span>
            </button>
          ) : (
            <span />
          )}
          <div
            className={`text-xs font-mono-tabular text-right ${
              isUser
                ? 'text-[#041E49] dark:text-[#E8F0FE]'
                : 'text-[#44474F] dark:text-[#C4C6D0]'
            }`}
          >
            {msg.timestamp}
          </div>
        </div>
      </div>
    </div>
  );
});

export interface TeacherChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  errorMessage: string | null;
  inputText: string;
  onChangeInputText: (value: string) => void;
  attachment: EncodedImageAttachment | null;
  isCompressing: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onResetChat: () => void;
  onPrintMessage: (msg: ChatMessage) => void;
  onTemplateClick: (prompt: string) => void;
  onAttachSampleSyllabus: () => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

/**
 * Structured Teacher Aide conversation column with printable sheet export
 * buttons, lesson-plan templates, syllabus photo upload, and composer.
 */
export function TeacherChat({
  messages,
  isLoading,
  errorMessage,
  inputText,
  onChangeInputText,
  attachment,
  isCompressing,
  fileInputRef,
  inputRef,
  onResetChat,
  onPrintMessage,
  onTemplateClick,
  onAttachSampleSyllabus,
  onFileChange,
  onRemoveAttachment,
  onSubmit,
}: TeacherChatProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages.length, isLoading]);

  return (
    <div className="lg:col-span-8 min-w-0 flex flex-col rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] overflow-hidden min-h-[440px] h-[min(78dvh,760px)] lg:h-[calc(100vh-220px)]">
      <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E7F0] dark:border-[#282B33] bg-white/70 dark:bg-[#1F2229]/80 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] break-words">
            AI Teaching Assistant
          </h2>
          <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
            Generate lesson plans, printable bilingual worksheets, or syllabus photo
            diagnostics
          </p>
        </div>

        <button
          type="button"
          onClick={onResetChat}
          aria-label="Reset teacher aide session"
          className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
          <span>New Session</span>
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Teacher aide conversation"
        data-testid="teacher-chat-feed"
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4"
      >
        {messages.map((msg) => (
          <TeacherChatMessageRow key={msg.id} msg={msg} onPrint={onPrintMessage} />
        ))}

        {isLoading && (
          <div role="status" aria-live="polite" className="flex items-start">
            <div className="px-4 py-3 rounded-[22px] rounded-bl-md bg-white dark:bg-[#22262E] border border-[#E2E7F0] dark:border-[#2F333D] flex items-center gap-2 text-sm text-[#44474F] dark:text-[#C4C6D0]">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
              <span>Shiksha is thinking…</span>
            </div>
          </div>
        )}
        <div ref={feedEndRef} />
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="mx-3 sm:mx-4 mb-2 px-4 py-2.5 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
        >
          {errorMessage}
        </div>
      )}

      <div className="px-3 sm:px-5 pt-2 pb-1.5 border-t border-[#E2E7F0] dark:border-[#282B33] bg-white/50 dark:bg-[#1F2229]/60">
        <div className="flex flex-wrap items-center gap-2">
          {TEACHER_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              disabled={isLoading || isCompressing}
              onClick={() => onTemplateClick(tpl.prompt)}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E8F0FE] transition-colors disabled:opacity-50 text-left"
            >
              {tpl.label}
            </button>
          ))}
          <button
            type="button"
            title="Attach a sample Class 6 Science textbook syllabus page"
            disabled={isLoading || isCompressing}
            onClick={onAttachSampleSyllabus}
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
            <span>Compressing syllabus photo...</span>
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
              aria-label="Remove attached syllabus photo"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#44474F] dark:text-[#C4C6D0] shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            className="hidden"
            aria-label="Upload syllabus photo"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isCompressing}
            aria-label="Attach syllabus photo"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-2xl bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors shrink-0 disabled:opacity-50"
          >
            <FileImage className="w-5 h-5" aria-hidden="true" />
          </button>

          <label htmlFor="teacher-message-input" className="sr-only">
            Ask Teacher Aide for lesson plans, worksheets, or student interventions
          </label>
          <input
            ref={inputRef}
            id="teacher-message-input"
            type="text"
            maxLength={2000}
            value={inputText}
            onChange={(e) => onChangeInputText(e.target.value)}
            placeholder="Request a lesson plan, bilingual worksheet, or intervention..."
            className="flex-1 min-w-0 min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-2xl bg-white dark:bg-[#111318] text-sm text-[#1A1C1E] dark:text-[#E2E2E9] placeholder:text-[#575A63] dark:placeholder:text-[#A0A4B0] border border-[#C4C6D0] dark:border-[#44474F] focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
          />

          <button
            type="submit"
            disabled={isLoading || isCompressing || (!inputText.trim() && !attachment)}
            aria-label="Send teacher request"
            className="min-w-[44px] min-h-[44px] px-3.5 sm:px-4 flex items-center justify-center gap-2 rounded-2xl bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] font-medium text-sm transition-colors disabled:opacity-45 shrink-0"
          >
            <SendHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="hidden sm:inline">Generate</span>
          </button>
        </div>
      </form>
    </div>
  );
}
