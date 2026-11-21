import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Loader2, MessageSquareHeart, RefreshCw, X } from 'lucide-react';
import { PARENT_UPDATE_LANGUAGES } from '../../shared/config';
import type {
  ParentUpdateLanguage,
  ParentUpdateResponse,
  TeacherStudentProfile,
} from '../../shared/types';
import { detectMessageLanguage, getFocusableElements } from '../utils/accessibility';

interface ParentUpdateModalProps {
  isOpen: boolean;
  student: TeacherStudentProfile | null;
  language: ParentUpdateLanguage;
  onChangeLanguage: (lang: ParentUpdateLanguage) => void;
  update: ParentUpdateResponse | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRegenerate: () => void;
  onClose: () => void;
}

/**
 * Accessible preview dialog for generating and copying a warm 4–5 line
 * regional-language parent progress update. Never sends messages automatically.
 */
export function ParentUpdateModal({
  isOpen,
  student,
  language,
  onChangeLanguage,
  update,
  isLoading,
  errorMessage,
  onRegenerate,
  onClose,
}: ParentUpdateModalProps) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = getFocusableElements(dialogRef.current);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  const handleCopy = async () => {
    if (!update?.message) return;
    try {
      await navigator.clipboard.writeText(update.message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable in restricted iframe/test environments
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="parent-update-dialog-title"
        aria-describedby="parent-update-dialog-desc"
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-[28px] bg-white dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-6 space-y-5 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#D3E3FD] dark:bg-[#0842A0] text-[#041E49] dark:text-[#E8F0FE] flex items-center justify-center shrink-0">
              <MessageSquareHeart className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="parent-update-dialog-title"
                className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]"
              >
                Parent Update · {student.name}
              </h2>
              <p
                id="parent-update-dialog-desc"
                className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5"
              >
                {student.id} · {student.grade}
                {student.maskedPhone ? ` · Contact ${student.maskedPhone}` : ''}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close parent update dialog"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#44474F] dark:text-[#C4C6D0] hover:bg-[#EAEFF7] dark:hover:bg-[#282B33] shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-[#44474F] dark:text-[#C4C6D0]">
            Parent&apos;s Language
          </p>
          <div
            role="group"
            aria-label="Select parent update language"
            className="flex flex-wrap items-center gap-1.5"
          >
            {PARENT_UPDATE_LANGUAGES.map((langOption) => {
              const active = language === langOption;
              return (
                <button
                  key={langOption}
                  type="button"
                  aria-pressed={active}
                  disabled={isLoading}
                  onClick={() => {
                    setCopied(false);
                    onChangeLanguage(langOption);
                  }}
                  className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                    active
                      ? 'bg-[#0B57D0] text-white dark:bg-[#A8C7FA] dark:text-[#062E6F]'
                      : 'bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9]'
                  }`}
                >
                  {langOption}
                </button>
              );
            })}
          </div>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="px-4 py-3 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
          >
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div
            role="status"
            aria-live="polite"
            className="rounded-2xl bg-[#F2F4F8] dark:bg-[#111318] border border-[#E2E7F0] dark:border-[#282B33] p-6 flex items-center justify-center gap-3 text-sm text-[#44474F] dark:text-[#C4C6D0]"
          >
            <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />
            <span>Drafting warm parent update in {language}…</span>
          </div>
        ) : update ? (
          <div className="space-y-3">
            <div
              lang={detectMessageLanguage(update.message)}
              className="rounded-2xl bg-[#F2F4F8] dark:bg-[#111318] border border-[#E2E7F0] dark:border-[#282B33] p-4 text-sm text-[#1A1C1E] dark:text-[#E2E2E9] whitespace-pre-line leading-relaxed"
            >
              {update.message}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
              <div className="rounded-xl bg-[#C4EED0]/50 dark:bg-[#0F5223]/50 border border-[#C4EED0] dark:border-[#0F5223] px-3 py-2">
                <p className="font-semibold text-[#072711] dark:text-[#C4EED0]">
                  Strength Highlighted
                </p>
                <p className="text-[#1A1C1E] dark:text-[#E2E2E9] mt-0.5">
                  {update.strength}
                </p>
              </div>
              <div className="rounded-xl bg-[#FEF3C7]/70 dark:bg-[#4A3208]/60 border border-[#FDE68A] dark:border-[#78350F] px-3 py-2">
                <p className="font-semibold text-[#78350F] dark:text-[#FDE68A]">
                  Home Practice Area
                </p>
                <p className="text-[#1A1C1E] dark:text-[#E2E2E9] mt-0.5">
                  {update.practiceArea}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
          Preview only — nothing is sent automatically. Copy the message to share
          manually with the parent.
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => {
              setCopied(false);
              onRegenerate();
            }}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Regenerate</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors"
            >
              Close
            </button>
            <button
              type="button"
              disabled={isLoading || !update?.message}
              onClick={handleCopy}
              className="min-h-[44px] px-5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] transition-colors disabled:opacity-45"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
