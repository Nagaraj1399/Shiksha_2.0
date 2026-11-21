import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Lock, X } from 'lucide-react';
import { getFocusableElements } from '../utils/accessibility';

interface TeacherLoginDialogProps {
  isOpen: boolean;
  isSubmitting: boolean;
  errorMessage: string | null;
  onSubmit: (code: string) => Promise<void>;
  onClose: () => void;
}

/**
 * Accessible modal dialog prompting teachers for the school access code.
 * Traps keyboard focus inside the dialog, closes on Escape, and restores
 * focus to the previously focused element upon closing.
 */
export function TeacherLoginDialog(props: TeacherLoginDialogProps) {
  if (!props.isOpen) return null;
  return <TeacherLoginDialogContent {...props} />;
}

function TeacherLoginDialogContent({
  isSubmitting,
  errorMessage,
  onSubmit,
  onClose,
}: TeacherLoginDialogProps) {
  const [code, setCode] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Move focus into dialog on open and restore focus to opener on unmount
  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    inputRef.current?.focus();

    return () => {
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  // Keyboard focus trap (Tab / Shift+Tab) and Escape-to-close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = getFocusableElements(dialogRef.current);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (e.shiftKey) {
          if (!active || active === first || !dialogRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (!active || active === last || !dialogRef.current.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (
        !isSubmitting &&
        dialogRef.current &&
        e.target instanceof Node &&
        !dialogRef.current.contains(e.target)
      ) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setLocalError('Please enter your teacher access code.');
      inputRef.current?.focus();
      return;
    }
    setLocalError(null);
    await onSubmit(trimmed);
  };

  const displayError = localError || errorMessage;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-login-title"
        aria-describedby="teacher-login-description"
        className="relative z-10 w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[#F8F9FC] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-5 sm:p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="teacher-login-title"
                className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]"
              >
                Teacher Login
              </h2>
              <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
                Protected classroom workspace
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close teacher login dialog"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#44474F] dark:text-[#C4C6D0] disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p
          id="teacher-login-description"
          className="text-sm text-[#44474F] dark:text-[#C4C6D0] mt-4 leading-relaxed"
        >
          Enter the school teacher access code to open Teacher Aide, Student Progress,
          and Dropout Alerts. Student Tutor remains open without signing in.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label
              htmlFor="teacher-access-code"
              className="block text-xs font-medium text-[#1A1C1E] dark:text-[#E2E2E9] mb-1.5"
            >
              Teacher Access Code
            </label>
            <input
              ref={inputRef}
              id="teacher-access-code"
              type="password"
              autoComplete="current-password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter teacher access code"
              className="w-full min-h-[44px] px-4 py-2.5 rounded-2xl bg-white dark:bg-[#111318] text-sm text-[#1A1C1E] dark:text-[#E2E2E9] placeholder:text-[#575A63] dark:placeholder:text-[#A0A4B0] border border-[#C4C6D0] dark:border-[#44474F] focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
            />
          </div>

          {displayError && (
            <div
              role="alert"
              className="px-3.5 py-2.5 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
            >
              {displayError}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2 rounded-2xl text-xs font-medium inline-flex items-center gap-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] transition-colors disabled:opacity-50"
            >
              {isSubmitting && (
                <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              )}
              <span>Sign In</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
