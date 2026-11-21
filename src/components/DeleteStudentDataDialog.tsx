import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import type { TeacherStudentProfile } from '../../shared/types';
import { getFocusableElements } from '../utils/accessibility';

interface DeleteStudentDataDialogProps {
  isOpen: boolean;
  student: TeacherStudentProfile | null;
  logCount: number;
  alertCount: number;
  isDeleting: boolean;
  errorMessage: string | null;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/**
 * Accessible confirmation dialog before permanently removing a student's
 * progress logs and dropout alerts from `data/shiksha_store.json`.
 */
export function DeleteStudentDataDialog({
  isOpen,
  student,
  logCount,
  alertCount,
  isDeleting,
  errorMessage,
  onConfirm,
  onClose,
}: DeleteStudentDataDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelBtnRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusTimer = window.setTimeout(() => {
      cancelBtnRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) {
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
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !student) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-student-data-title"
        aria-describedby="delete-student-data-desc"
        className="w-full max-w-md rounded-[28px] bg-white dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-6 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#F9DEDC] dark:bg-[#8C1D18] text-[#410E0B] dark:text-[#F9DEDC] flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="delete-student-data-title"
                className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]"
              >
                Delete Student Data?
              </h2>
              <p className="text-xs font-mono-tabular text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
                {student.name} · {student.id}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            aria-label="Close delete confirmation dialog"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-[#44474F] dark:text-[#C4C6D0] hover:bg-[#EAEFF7] dark:hover:bg-[#282B33] shrink-0 disabled:opacity-50"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p
          id="delete-student-data-desc"
          className="text-sm text-[#44474F] dark:text-[#C4C6D0] leading-relaxed"
        >
          This will permanently remove{' '}
          <strong className="text-[#1A1C1E] dark:text-[#E2E2E9]">
            {logCount} progress {logCount === 1 ? 'log' : 'logs'}
          </strong>{' '}
          and{' '}
          <strong className="text-[#1A1C1E] dark:text-[#E2E2E9]">
            {alertCount} dropout {alertCount === 1 ? 'alert' : 'alerts'}
          </strong>{' '}
          for {student.name} from{' '}
          <code className="font-mono-tabular text-xs">data/shiksha_store.json</code>.
          This action cannot be undone.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="px-3.5 py-2.5 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
          >
            {errorMessage}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            ref={cancelBtnRef}
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => void onConfirm()}
            className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#B3261E] hover:bg-[#931E17] text-white dark:bg-[#F2B8B5] dark:hover:bg-[#F7CBC8] dark:text-[#410E0B] transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2
                  className="w-3.5 h-3.5 animate-spin shrink-0"
                  aria-hidden="true"
                />
                <span>Deleting…</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Confirm Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
