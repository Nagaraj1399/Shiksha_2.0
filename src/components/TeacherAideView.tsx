import { useCallback, useMemo, useState } from 'react';
import { Grid2x2, LogOut, MessageSquare } from 'lucide-react';
import type {
  ChatMessage,
  DropoutAlert,
  ProgressLog,
  TeacherStudentProfile,
  WeeklySummaryResponse,
} from '../../shared/types';
import type { EncodedImageAttachment } from '../utils/imageHelper';
import { PrintableContentModal } from './PrintableContentModal';
import { ClassHeatmap } from './teacher/ClassHeatmap';
import { InterventionQueue } from './teacher/InterventionQueue';
import { TeacherChat } from './teacher/TeacherChat';
import { useTeacherChat } from './teacher/useTeacherChat';

interface TeacherAideViewProps {
  students: TeacherStudentProfile[];
  progressLogs: ProgressLog[];
  dropoutAlerts: DropoutAlert[];
  messages: ChatMessage[];
  onSendMessage: (text: string, attachment?: EncodedImageAttachment) => Promise<void>;
  onResetChat: () => void;
  onSignOutTeacher: () => void;
  onGenerateWeeklySummary?: () => Promise<WeeklySummaryResponse>;
  isLoading: boolean;
  errorMessage: string | null;
  draftPrompt: string;
  onConsumeDraftPrompt: () => void;
}

/**
 * Teacher Aide workspace with two sub-views:
 * - **Assistant**: structured lesson plans, printable bilingual worksheets, and
 *   targeted student interventions.
 * - **Class Overview**: interactive students × topics mastery heatmap (green /
 *   amber / red / grey), cell click to inspect recent student interactions,
 *   CSV export, and Gemini 5-bullet weekly class summary.
 */
export function TeacherAideView({
  students,
  progressLogs,
  dropoutAlerts,
  messages,
  onSendMessage,
  onResetChat,
  onSignOutTeacher,
  onGenerateWeeklySummary,
  isLoading,
  errorMessage,
  draftPrompt,
  onConsumeDraftPrompt,
}: TeacherAideViewProps) {
  const [subTab, setSubTab] = useState<'assistant' | 'overview'>('assistant');
  const [printableMsg, setPrintableMsg] = useState<ChatMessage | null>(null);

  const activateAssistantTab = useCallback(() => setSubTab('assistant'), []);

  const chat = useTeacherChat({
    isLoading,
    draftPrompt,
    onConsumeDraftPrompt,
    onSendMessage,
    onActivateAssistantTab: activateAssistantTab,
  });

  const studentById = useMemo(
    () => new Map(students.map((s) => [s.id, s])),
    [students]
  );

  const activeAlerts = useMemo(
    () => dropoutAlerts.filter((a) => a.status === 'Active'),
    [dropoutAlerts]
  );

  const strugglingLogs = useMemo(
    () => progressLogs.filter((l) => l.competency_level === 'Struggling'),
    [progressLogs]
  );

  return (
    <>
      <section aria-label="Teacher Aide Workspace" className="no-print space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold text-[#1A1C1E] dark:text-[#E2E2E9] break-words">
              Teacher Aide · Lesson Plans & Class Overview
            </h1>
            <p className="text-sm text-[#44474F] dark:text-[#C4C6D0] mt-0.5">
              Structured lesson plans, printable bilingual worksheets, and interactive
              class heatmap
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div
              role="tablist"
              aria-label="Teacher Aide views"
              className="inline-flex items-center gap-1 p-1 rounded-2xl bg-[#EAEFF7] dark:bg-[#1F2229]"
            >
              <button
                type="button"
                role="tab"
                id="teacher-tab-assistant"
                aria-selected={subTab === 'assistant'}
                aria-controls="teacher-panel-assistant"
                onClick={() => setSubTab('assistant')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  subTab === 'assistant'
                    ? 'bg-white text-[#041E49] dark:bg-[#282B33] dark:text-[#E2E2E9]'
                    : 'text-[#44474F] hover:text-[#1A1C1E] dark:text-[#C4C6D0] dark:hover:text-[#E2E2E9]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Assistant</span>
              </button>
              <button
                type="button"
                role="tab"
                id="teacher-tab-overview"
                aria-selected={subTab === 'overview'}
                aria-controls="teacher-panel-overview"
                onClick={() => setSubTab('overview')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  subTab === 'overview'
                    ? 'bg-white text-[#041E49] dark:bg-[#282B33] dark:text-[#E2E2E9]'
                    : 'text-[#44474F] hover:text-[#1A1C1E] dark:text-[#C4C6D0] dark:hover:text-[#E2E2E9]'
                }`}
              >
                <Grid2x2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>Class Overview</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onSignOutTeacher}
              aria-label="Sign out of teacher mode"
              className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 bg-white hover:bg-[#EAEFF7] text-[#44474F] border border-[#C4C6D0] dark:bg-[#191C22] dark:hover:bg-[#282B33] dark:text-[#C4C6D0] dark:border-[#44474F] transition-colors whitespace-nowrap shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {subTab === 'overview' ? (
          <ClassHeatmap
            students={students}
            progressLogs={progressLogs}
            dropoutAlerts={dropoutAlerts}
            studentById={studentById}
            onGenerateWeeklySummary={onGenerateWeeklySummary}
          />
        ) : (
          <div
            id="teacher-panel-assistant"
            role="tabpanel"
            aria-labelledby="teacher-tab-assistant"
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
          >
            <TeacherChat
              messages={messages}
              isLoading={isLoading}
              errorMessage={errorMessage || chat.uploadError}
              inputText={chat.inputText}
              onChangeInputText={chat.setInputText}
              attachment={chat.attachment}
              isCompressing={chat.isCompressing}
              fileInputRef={chat.fileInputRef}
              inputRef={chat.inputRef}
              onResetChat={onResetChat}
              onPrintMessage={(selected) => setPrintableMsg(selected)}
              onTemplateClick={chat.handleTemplateClick}
              onAttachSampleSyllabus={chat.handleAttachSampleSyllabus}
              onFileChange={chat.handleFileChange}
              onRemoveAttachment={chat.handleRemoveAttachment}
              onSubmit={chat.handleSubmit}
            />

            <InterventionQueue
              activeAlerts={activeAlerts}
              strugglingLogs={strugglingLogs}
              studentById={studentById}
              isLoading={isLoading}
              onDraftIntervention={chat.handleTemplateClick}
            />
          </div>
        )}
      </section>

      <PrintableContentModal
        isOpen={Boolean(printableMsg)}
        title="Lesson Plan & Bilingual Worksheet"
        markdown={printableMsg?.text ?? ''}
        onClose={() => setPrintableMsg(null)}
      />
    </>
  );
}

export default TeacherAideView;
