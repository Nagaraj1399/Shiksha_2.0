import { RotateCcw } from 'lucide-react';
import type {
  ChatMessage,
  HintLevel,
  ProgressLog,
  PublicStudentProfile,
} from '../../shared/types';
import type { EncodedImageAttachment } from '../utils/imageHelper';
import { ChatComposer } from './tutor/ChatComposer';
import { ChatMessageList } from './tutor/ChatMessageList';
import { StudentContextPanel } from './tutor/StudentContextPanel';
import { useStudentChat } from './tutor/useStudentChat';

interface StudentTutorViewProps {
  students: PublicStudentProfile[];
  selectedStudentId: string;
  onSelectStudentId: (id: string) => void;
  messages: ChatMessage[];
  onSendMessage: (
    text: string,
    attachment?: EncodedImageAttachment,
    hintLevel?: HintLevel
  ) => Promise<void>;
  onResetChat: () => void;
  onStartQuiz?: (subject: string, topic: string) => void;
  draftPrompt?: string;
  onConsumeDraftPrompt?: () => void;
  isLoading: boolean;
  errorMessage: string | null;
  progressLogs: ProgressLog[];
}

/**
 * Student Tutor Socratic chat workspace with bilingual script detection,
 * live-region announcements, 3-level "I'm stuck" hint ladder, mastery practice
 * quiz triggers, homework photo compression, and student progress summary.
 */
export function StudentTutorView({
  students,
  selectedStudentId,
  onSelectStudentId,
  messages,
  onSendMessage,
  onResetChat,
  onStartQuiz,
  draftPrompt = '',
  onConsumeDraftPrompt,
  isLoading,
  errorMessage,
  progressLogs,
}: StudentTutorViewProps) {
  const chat = useStudentChat({
    students,
    selectedStudentId,
    onSelectStudentId,
    onSendMessage,
    onResetChat,
    draftPrompt,
    onConsumeDraftPrompt,
    isLoading,
  });

  const combinedError = errorMessage || chat.uploadError || chat.speechError;

  return (
    <section
      aria-label="Student Tutor Workspace"
      className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
    >
      <div className="lg:col-span-8 min-w-0 flex flex-col rounded-[28px] bg-[#F2F4F8] dark:bg-[#191C22] border border-[#E2E7F0] dark:border-[#282B33] overflow-hidden min-h-[440px] h-[min(78dvh,760px)] lg:h-[calc(100vh-148px)]">
        <div className="px-4 sm:px-5 py-3.5 border-b border-[#E2E7F0] dark:border-[#282B33] bg-white/70 dark:bg-[#1F2229]/80 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] break-words">
              Student Tutor · Socratic WhatsApp Flow
            </h1>
            <p className="text-xs text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
              Bilingual guiding questions · 3-level Hint Ladder · Local Indian examples
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <label htmlFor="student-select" className="sr-only">
              Active student profile
            </label>
            <select
              id="student-select"
              value={selectedStudentId}
              onChange={(e) => chat.handleChangeStudent(e.target.value)}
              disabled={students.length === 0}
              className="min-h-[44px] max-w-full min-w-0 px-3 py-2 rounded-xl text-xs font-medium bg-white dark:bg-[#282B33] text-[#1A1C1E] dark:text-[#E2E2E9] border border-[#C4C6D0] dark:border-[#44474F] focus-visible:outline-2 focus-visible:outline-[#0B57D0] dark:focus-visible:outline-[#A8C7FA]"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.id})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={chat.handleReset}
              aria-label="Reset student chat"
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-[#EAEFF7] hover:bg-[#DCE4F2] text-[#041E49] dark:bg-[#282B33] dark:hover:bg-[#333742] dark:text-[#E2E2E9] transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        <h2 className="sr-only">Conversation</h2>

        <ChatMessageList
          messages={messages}
          activeStudent={chat.activeStudent}
          isLoading={isLoading}
          isCompressing={chat.isCompressing}
          hintLevel={chat.hintLevel}
          canReadAloud={chat.speechSynthesisSupported}
          speakingMessageId={chat.speakingMessageId}
          onToggleReadAloud={chat.handleToggleReadAloud}
          onRequestHint={chat.handleImStuck}
          onStartQuiz={onStartQuiz}
        />

        {combinedError && (
          <div
            role="alert"
            className="mx-3 sm:mx-4 mb-2 px-4 py-2.5 rounded-2xl bg-[#F9DEDC] text-[#410E0B] dark:bg-[#8C1D18] dark:text-[#F9DEDC] text-xs font-medium"
          >
            {combinedError}
          </div>
        )}

        <ChatComposer
          inputText={chat.inputText}
          onChangeInputText={chat.handleChangeInputText}
          attachment={chat.attachment}
          isCompressing={chat.isCompressing}
          isLoading={isLoading}
          hasActiveStudent={Boolean(chat.activeStudent)}
          hasAnyVoiceFeature={chat.hasAnyVoiceFeature}
          speechRecognitionSupported={chat.speechRecognitionSupported}
          speechLang={chat.speechLang}
          isListening={chat.isListening}
          fileInputRef={chat.fileInputRef}
          inputRef={chat.inputRef}
          onFileChange={chat.handleFileChange}
          onAttachSampleHomework={chat.handleAttachSampleHomework}
          onRemoveAttachment={chat.handleRemoveAttachment}
          onQuickPrompt={chat.handleQuickPrompt}
          onChangeSpeechLang={chat.handleChangeSpeechLang}
          onToggleListening={chat.handleToggleListening}
          onSubmit={chat.handleSubmit}
        />
      </div>

      <StudentContextPanel
        activeStudent={chat.activeStudent}
        progressLogs={progressLogs}
        onStartQuiz={onStartQuiz}
      />
    </section>
  );
}
