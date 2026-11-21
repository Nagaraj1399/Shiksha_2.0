import { useEffect, useMemo, useRef } from 'react';
import { Printer, X } from 'lucide-react';
import { getFocusableElements } from '../utils/accessibility';
import { splitPrintableContent } from '../../shared/educationLogic';
import { MarkdownText } from './MarkdownText';

interface PrintableContentModalProps {
  isOpen: boolean;
  title: string;
  markdown: string;
  onClose: () => void;
}

/**
 * Accessible print preview and export modal for Teacher Aide lesson plans and
 * worksheets. Automatically splits any Answer Key onto a dedicated print page
 * using `@media print` page-break CSS.
 */
export function PrintableContentModal(props: PrintableContentModalProps) {
  if (!props.isOpen) return null;
  return <PrintableContentModalBody {...props} />;
}

function PrintableContentModalBody({
  title,
  markdown,
  onClose,
}: PrintableContentModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const printBtnRef = useRef<HTMLButtonElement>(null);

  const { mainContent, answerKey } = useMemo(
    () => splitPrintableContent(markdown),
    [markdown]
  );

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    printBtnRef.current?.focus();

    return () => {
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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
  }, [onClose]);

  return (
    <div className="print-sheet-wrapper fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="printable-sheet-title"
        className="print-sheet-body relative z-10 w-full max-w-3xl max-h-[90dvh] overflow-y-auto rounded-[28px] bg-white dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-5 sm:p-8 shadow-xl"
      >
        <div className="no-print flex flex-wrap items-center justify-between gap-3 pb-4 mb-5 border-b border-[#E2E7F0] dark:border-[#282B33]">
          <div className="min-w-0">
            <h2
              id="printable-sheet-title"
              className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]"
            >
              Printable Classroom Sheet
            </h2>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
              {answerKey
                ? 'Formatted for print with the Answer Key placed on a separate page.'
                : 'Formatted for clean black-and-white classroom printing.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              ref={printBtnRef}
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-1.5 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F]"
            >
              <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close print preview"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#44474F] dark:text-[#C4C6D0]"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Page 1+: Lesson Plan / Student Worksheet */}
        <article className="space-y-4 text-[#1A1C1E] dark:text-[#E2E2E9]">
          <header className="border-b border-[#C4C6D0] dark:border-[#44474F] pb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#44474F] dark:text-[#C4C6D0]">
              Shiksha-Agent · Classroom Resource
            </p>
            <h3 className="font-display text-xl font-bold mt-1">{title}</h3>
          </header>

          <MarkdownText text={mainContent} />
        </article>

        {/* Separate Page: Teacher Answer Key */}
        {answerKey && (
          <article
            aria-label="Answer Key"
            className="print-answer-key mt-8 pt-6 border-t-2 border-dashed border-[#C4C6D0] dark:border-[#44474F] space-y-4 text-[#1A1C1E] dark:text-[#E2E2E9]"
          >
            <header className="border-b border-[#C4C6D0] dark:border-[#44474F] pb-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#44474F] dark:text-[#C4C6D0]">
                Teacher Copy · Separate Print Page
              </p>
              <h3 className="font-display text-xl font-bold mt-1">Answer Key</h3>
            </header>

            <MarkdownText text={answerKey} />
          </article>
        )}
      </div>
    </div>
  );
}
