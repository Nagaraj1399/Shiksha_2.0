import { memo, useEffect, useMemo, useRef } from 'react';
import { AlertTriangle, Award, CheckCircle2, Loader2 } from 'lucide-react';
import type { ChatMessage, PublicStudentProfile } from '../../../shared/types';
import { detectMessageLanguage, prefersReducedMotion } from '../../utils/accessibility';
import { MarkdownText } from '../MarkdownText';
import { HintLadder } from './HintLadder';

function findLatestMasteredEvent(
  messages: ChatMessage[]
): { subject: string; topic: string } | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const evs = messages[i].toolEvents;
    if (!evs) continue;
    for (const ev of evs) {
      if (
        ev.name === 'log_student_progress' &&
        ev.args.competency_level === 'Mastered'
      ) {
        return {
          subject: String(ev.args.subject ?? 'General'),
          topic: String(ev.args.topic ?? 'Core Practice'),
        };
      }
    }
  }
  return null;
}

const StudentChatMessageRow = memo(function StudentChatMessageRow({
  msg,
  canReadAloud,
  isSpeaking,
  onToggleReadAloud,
}: {
  msg: ChatMessage;
  canReadAloud: boolean;
  isSpeaking: boolean;
  onToggleReadAloud: (msg: ChatMessage) => void;
}) {
  const isUser = msg.role === 'user';
  const messageLang = detectMessageLanguage(msg.text);

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        lang={messageLang}
        className={`max-w-[92%] sm:max-w-[78%] px-4 py-3 ${
          isUser
            ? 'bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE] rounded-[22px] rounded-br-md'
            : 'bg-white text-[#1A1C1E] dark:bg-[#22262E] dark:text-[#E2E2E9] rounded-[22px] rounded-bl-md border border-[#E2E7F0] dark:border-[#2F333D]'
        }`}
      >
        {msg.imageUrl && (
          <div className="mb-2.5 overflow-hidden rounded-2xl bg-black/5 dark:bg-white/5">
            <img
              src={msg.imageUrl}
              alt="Uploaded student homework"
              referrerPolicy="no-referrer"
              className="max-h-56 w-auto max-w-full object-cover rounded-2xl"
            />
          </div>
        )}
        <MarkdownText text={msg.text} />
        <div
          className={`mt-2 flex items-center gap-2 ${
            !isUser && canReadAloud ? 'justify-between' : 'justify-end'
          }`}
        >
          {!isUser && canReadAloud && (
            <button
              type="button"
              onClick={() => onToggleReadAloud(msg)}
              aria-pressed={isSpeaking}
              aria-label={
                isSpeaking ? 'Stop reading tutor reply aloud' : 'Read tutor reply aloud'
              }
              className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
                isSpeaking
                  ? 'bg-[#D3E3FD] text-[#041E49] dark:bg-[#0842A0] dark:text-[#E8F0FE]'
                  : 'bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9]'
              }`}
            >
              <span aria-hidden="true">🔊</span>
              <span>{isSpeaking ? 'Stop' : 'Read aloud'}</span>
            </button>
          )}
          <span
            className={`text-xs font-mono-tabular ${
              isUser
                ? 'text-[#041E49] dark:text-[#E8F0FE]'
                : 'text-[#44474F] dark:text-[#C4C6D0]'
            }`}
          >
            {msg.timestamp}
          </span>
        </div>
      </div>

      {msg.toolEvents && msg.toolEvents.length > 0 && (
        <div className="mt-1.5 px-1 space-y-1">
          {msg.toolEvents.map((ev, idx) => (
            <div
              key={`${msg.id}-tool-${idx}`}
              className="flex items-center gap-1.5 text-xs text-[#44474F] dark:text-[#C4C6D0]"
            >
              {ev.name === 'alert_teacher_dropout_risk' ? (
                <>
                  <AlertTriangle
                    className="w-3.5 h-3.5 text-[#B3261E] dark:text-[#F2B8B5] shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-[#B3261E] dark:text-[#F2B8B5] font-medium">
                    Teacher Dropout Alert Triggered · {String(ev.args.student_id ?? '')}
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2
                    className="w-3.5 h-3.5 text-[#0F5223] dark:text-[#A8DAB5] shrink-0"
                    aria-hidden="true"
                  />
                  <span>
                    Progress Logged · {String(ev.args.subject ?? '')} /{' '}
                    {String(ev.args.topic ?? '')} ·{' '}
                    {String(ev.args.competency_level ?? '')}
                    {typeof ev.args.hints_used === 'number' && ev.args.hints_used > 0
                      ? ` · Hints: ${ev.args.hints_used}`
                      : ''}
                  </span>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export interface ChatMessageListProps {
  messages: ChatMessage[];
  activeStudent?: PublicStudentProfile;
  isLoading: boolean;
  isCompressing: boolean;
  hintLevel: number;
  canReadAloud: boolean;
  speakingMessageId: string | null;
  onToggleReadAloud: (msg: ChatMessage) => void;
  onRequestHint: () => void;
  onStartQuiz?: (subject: string, topic: string) => void;
}

/**
 * Accessible `role="log"` live-region conversation feed for Student Tutor
 * including read-aloud buttons, tool-call indicators, the 3-level Hint Ladder
 * under the latest tutor reply, and the inline Mastery Quiz banner.
 */
export function ChatMessageList({
  messages,
  activeStudent,
  isLoading,
  isCompressing,
  hintLevel,
  canReadAloud,
  speakingMessageId,
  onToggleReadAloud,
  onRequestHint,
  onStartQuiz,
}: ChatMessageListProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'end',
    });
  }, [messages.length, isLoading]);

  const latestMasteredEvent = useMemo(
    () => findLatestMasteredEvent(messages),
    [messages]
  );

  let latestAssistantIdx = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      latestAssistantIdx = i;
      break;
    }
  }

  const hintDisabled = isLoading || isCompressing || !activeStudent;

  return (
    <>
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Student tutor conversation"
        data-testid="student-chat-feed"
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-4"
      >
        {messages.map((msg, idx) => (
          <div key={msg.id}>
            <StudentChatMessageRow
              msg={msg}
              canReadAloud={canReadAloud}
              isSpeaking={speakingMessageId === msg.id}
              onToggleReadAloud={onToggleReadAloud}
            />
            {idx === latestAssistantIdx && (
              <HintLadder
                hintLevel={hintLevel}
                disabled={hintDisabled}
                onRequestHint={onRequestHint}
              />
            )}
          </div>
        ))}
        {latestAssistantIdx === -1 && messages.length > 0 && (
          <HintLadder
            hintLevel={hintLevel}
            disabled={hintDisabled}
            onRequestHint={onRequestHint}
          />
        )}

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

      {latestMasteredEvent && onStartQuiz && (
        <div className="mx-3 sm:mx-4 mb-2 px-4 py-3 rounded-2xl bg-[#C4EED0] text-[#072711] dark:bg-[#0F5223] dark:text-[#C4EED0] border border-[#8FD9A8] dark:border-[#1E7A38] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-start gap-2.5 text-xs">
            <Award className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">
                Topic Mastered: {latestMasteredEvent.topic}!
              </p>
              <p className="mt-0.5 opacity-90">
                Test your understanding with a 3-question practice quiz
                {activeStudent?.preferredLanguage
                  ? ` in ${activeStudent.preferredLanguage}`
                  : ''}
                .
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() =>
              onStartQuiz(latestMasteredEvent.subject, latestMasteredEvent.topic)
            }
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#072711] text-white hover:bg-[#0B3B1A] dark:bg-[#C4EED0] dark:text-[#072711] dark:hover:bg-[#E0F7E7] transition-colors whitespace-nowrap"
          >
            Take 3-Question Quiz
          </button>
        </div>
      )}
    </>
  );
}
