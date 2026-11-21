import React, { useEffect, useRef, useState } from 'react';
import { Award, CheckCircle2, Loader2, X, XCircle } from 'lucide-react';
import type { PublicPracticeQuiz, QuizSubmissionResult } from '../../shared/types';
import { detectMessageLanguage, getFocusableElements } from '../utils/accessibility';

interface PracticeQuizModalProps {
  isOpen: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  topicLabel: string;
  quiz: PublicPracticeQuiz | null;
  result: QuizSubmissionResult | null;
  errorMessage: string | null;
  onSubmitAnswers: (answers: number[]) => Promise<void>;
  onClose: () => void;
}

/**
 * Accessible modal presenting a 3-question bilingual Mastery Practice Quiz,
 * grading responses server-side, and displaying the score and explanations.
 */
export function PracticeQuizModal(props: PracticeQuizModalProps) {
  if (!props.isOpen) return null;
  return <PracticeQuizModalContent {...props} />;
}

function PracticeQuizModalContent({
  isLoading,
  isSubmitting,
  topicLabel,
  quiz,
  result,
  errorMessage,
  onSubmitAnswers,
  onClose,
}: PracticeQuizModalProps) {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButtonRef.current?.focus();

    return () => {
      if (previouslyFocused && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, []);

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

  const questionCount = quiz?.questions.length ?? 0;
  const allAnswered =
    questionCount > 0 &&
    Array.from({ length: questionCount }, (_, idx) => idx).every(
      (idx) => typeof selectedAnswers[idx] === 'number'
    );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz || !allAnswered || isSubmitting) return;
    const ordered = quiz.questions.map((_, idx) => selectedAnswers[idx]);
    await onSubmitAnswers(ordered);
  };

  return (
    <div className="no-print fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="practice-quiz-title"
        className="relative z-10 w-full max-w-2xl max-h-[90dvh] overflow-y-auto rounded-[28px] bg-[#F8F9FC] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] p-5 sm:p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0] flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="practice-quiz-title"
                className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]"
              >
                Mastery Practice Quiz · {quiz?.topic ?? topicLabel}
              </h2>
              <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
                {quiz
                  ? `${quiz.subject} · Language: ${quiz.language} · 3 questions`
                  : 'Preparing 3-question assessment in your language...'}
              </p>
            </div>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close practice quiz"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl hover:bg-black/5 dark:hover:bg-white/10 text-[#44474F] dark:text-[#C4C6D0] shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 px-4 py-3 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
          >
            {errorMessage}
          </div>
        )}

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            className="py-12 flex items-center justify-center gap-3 text-sm text-[#44474F] dark:text-[#C4C6D0]"
          >
            <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden="true" />
            <span>Generating 3-question quiz in your language…</span>
          </div>
        )}

        {!isLoading && quiz && !result && (
          <form onSubmit={handleSubmit} className="mt-5 space-y-5">
            {quiz.questions.map((q, qIdx) => (
              <fieldset
                key={q.id}
                lang={detectMessageLanguage(q.question)}
                className="rounded-2xl bg-white dark:bg-[#22262E] border border-[#E2E7F0] dark:border-[#2F333D] p-4 space-y-3"
              >
                <legend className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] px-1">
                  Q{qIdx + 1}. {q.question}
                </legend>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => {
                    const checked = selectedAnswers[qIdx] === optIdx;
                    return (
                      <label
                        key={`${q.id}-opt-${optIdx}`}
                        className={`flex items-center gap-3 min-h-[44px] px-3.5 py-2 rounded-xl border text-sm cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#D3E3FD] text-[#041E49] border-[#0B57D0] dark:bg-[#0842A0] dark:text-[#E8F0FE] dark:border-[#A8C7FA]'
                            : 'bg-[#F8F9FC] text-[#1A1C1E] border-[#E2E7F0] hover:bg-[#EAEFF7] dark:bg-[#191C22] dark:text-[#E2E2E9] dark:border-[#2F333D] dark:hover:bg-[#282B33]'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`quiz-q-${qIdx}`}
                          checked={checked}
                          onChange={() =>
                            setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                          }
                          className="w-4 h-4 accent-[#0B57D0] dark:accent-[#A8C7FA] shrink-0"
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="min-h-[44px] px-4 py-2 rounded-2xl text-xs font-medium bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!allAnswered || isSubmitting}
                className="min-h-[44px] px-5 py-2 rounded-2xl text-xs font-semibold inline-flex items-center gap-2 bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F] disabled:opacity-45"
              >
                {isSubmitting && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                )}
                <span>Submit Quiz</span>
              </button>
            </div>
          </form>
        )}

        {!isLoading && quiz && result && (
          <div className="mt-5 space-y-4">
            <div
              role="status"
              aria-live="polite"
              className={`rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 ${
                result.passed
                  ? 'bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0]'
                  : 'bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE]'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Award className="w-5 h-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-display text-base font-bold">
                    Score: {result.score} / {result.total}
                  </p>
                  <p className="text-xs">
                    {result.passed
                      ? 'Mastery verified and logged to your progress!'
                      : 'Great effort! Result logged — review the explanations below and try again anytime.'}
                  </p>
                </div>
              </div>
            </div>

            <ol className="space-y-3">
              {quiz.questions.map((q, idx) => {
                const item = result.results[idx];
                return (
                  <li
                    key={q.id}
                    lang={detectMessageLanguage(q.question)}
                    className="rounded-2xl bg-white dark:bg-[#22262E] border border-[#E2E7F0] dark:border-[#2F333D] p-4 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-[#1A1C1E] dark:text-[#E2E2E9]">
                        Q{idx + 1}. {q.question}
                      </p>
                      {item?.isCorrect ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F5223] dark:text-[#A8DAB5] shrink-0">
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          <span>Correct</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#B3261E] dark:text-[#F2B8B5] shrink-0">
                          <XCircle className="w-4 h-4" aria-hidden="true" />
                          <span>Incorrect</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#44474F] dark:text-[#C4C6D0]">
                      Your answer:{' '}
                      <span className="font-medium text-[#1A1C1E] dark:text-[#E2E2E9]">
                        {q.options[item?.selectedIndex ?? 0]}
                      </span>
                      {!item?.isCorrect && (
                        <>
                          {' · '}Correct answer:{' '}
                          <span className="font-semibold text-[#0F5223] dark:text-[#A8DAB5]">
                            {q.options[item?.correctIndex ?? 0]}
                          </span>
                        </>
                      )}
                    </p>
                    <p
                      lang={detectMessageLanguage(item?.explanation ?? '')}
                      className="text-xs text-[#44474F] dark:text-[#C4C6D0] bg-[#F2F4F8] dark:bg-[#191C22] rounded-xl p-2.5 leading-relaxed"
                    >
                      {item?.explanation}
                    </p>
                  </li>
                );
              })}
            </ol>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 py-2 rounded-2xl text-xs font-semibold bg-[#0B57D0] hover:bg-[#0842A0] text-white dark:bg-[#A8C7FA] dark:hover:bg-[#8AB4F8] dark:text-[#062E6F]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
