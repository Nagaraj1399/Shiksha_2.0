// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { DeleteStudentDataDialog } from '../DeleteStudentDataDialog';
import { DropoutAlertsView } from '../DropoutAlertsView';
import { LandingPage } from '../LandingPage';
import { MyPathView } from '../MyPathView';
import { ParentUpdateModal } from '../ParentUpdateModal';
import { PracticeQuizModal } from '../PracticeQuizModal';
import { PrintableContentModal } from '../PrintableContentModal';
import { ProgressLedgerView } from '../ProgressLedgerView';
import { StudentTutorView } from '../StudentTutorView';
import { TeacherAideView } from '../TeacherAideView';
import { TeacherLoginDialog } from '../TeacherLoginDialog';
import { TopBar } from '../TopBar';
import type { ChatMessage } from '../../../shared/types';
import {
  toPublicStudentProfile,
  toTeacherStudentProfile,
} from '../../../shared/security';
import { createSeedStore } from '../../../shared/shikshaLogic';

const seed = createSeedStore();
const publicStudents = seed.students.map(toPublicStudentProfile);
const teacherStudents = seed.students.map((s) =>
  toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
);

const sampleMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    role: 'assistant',
    text: '## Socratic Hint\n\nप्रकाश संश्लेषण को समझने के लिए ये कदम सोचो:\n- सूरज की रोशनी कहाँ से मिलती है?\n- पौधे पानी कैसे सोखते हैं?',
    timestamp: '10:00 am',
  },
  {
    id: 'msg-2',
    role: 'user',
    text: 'வணக்கம்! 2x + 5 = 15 எப்படி தீர்ப்பது?',
    timestamp: '10:01 am',
  },
];

describe.each([
  { theme: 'light', isDark: false },
  { theme: 'dark', isDark: true },
])('Accessibility audit ($theme theme)', ({ isDark }) => {
  afterEach(() => {
    cleanup();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.textSize;
  });

  function applyTheme() {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.documentElement.dataset.textSize = 'lg';
  }

  it('StudentTutorView + TopBar has zero axe violations and one h1', async () => {
    applyTheme();
    const { container } = render(
      <div>
        <a href="#main-content">Skip to main content</a>
        <TopBar
          activeTab="tutor"
          onSelectTab={vi.fn()}
          activeAlertCount={null}
          isDark={isDark}
          onToggleTheme={vi.fn()}
          textSize="lg"
          onChangeTextSize={vi.fn()}
        />
        <main id="main-content" tabIndex={-1}>
          <StudentTutorView
            students={publicStudents}
            selectedStudentId={publicStudents[0].id}
            onSelectStudentId={vi.fn()}
            messages={sampleMessages}
            onSendMessage={vi.fn(async () => {})}
            onResetChat={vi.fn()}
            isLoading
            errorMessage={null}
            progressLogs={seed.progressLogs}
          />
        </main>
      </div>
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('TeacherAideView + TopBar has zero axe violations and one h1', async () => {
    applyTheme();
    const { container } = render(
      <div>
        <a href="#main-content">Skip to main content</a>
        <TopBar
          activeTab="teacher"
          onSelectTab={vi.fn()}
          activeAlertCount={1}
          isDark={isDark}
          onToggleTheme={vi.fn()}
          textSize="xl"
          onChangeTextSize={vi.fn()}
        />
        <main id="main-content" tabIndex={-1}>
          <TeacherAideView
            students={teacherStudents}
            progressLogs={seed.progressLogs}
            dropoutAlerts={seed.dropoutAlerts}
            messages={sampleMessages}
            onSendMessage={vi.fn(async () => {})}
            onResetChat={vi.fn()}
            onSignOutTeacher={vi.fn()}
            isLoading
            errorMessage={null}
            draftPrompt=""
            onConsumeDraftPrompt={vi.fn()}
          />
        </main>
      </div>
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ProgressLedgerView + TopBar has zero axe violations and one h1', async () => {
    applyTheme();
    const { container } = render(
      <div>
        <a href="#main-content">Skip to main content</a>
        <TopBar
          activeTab="progress"
          onSelectTab={vi.fn()}
          activeAlertCount={1}
          isDark={isDark}
          onToggleTheme={vi.fn()}
          textSize="base"
          onChangeTextSize={vi.fn()}
        />
        <main id="main-content" tabIndex={-1}>
          <ProgressLedgerView
            students={teacherStudents}
            progressLogs={seed.progressLogs}
            onSignOutTeacher={vi.fn()}
          />
        </main>
      </div>
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('DropoutAlertsView + TopBar has zero axe violations and one h1', async () => {
    applyTheme();
    const { container } = render(
      <div>
        <a href="#main-content">Skip to main content</a>
        <TopBar
          activeTab="alerts"
          onSelectTab={vi.fn()}
          activeAlertCount={1}
          isDark={isDark}
          onToggleTheme={vi.fn()}
          textSize="base"
          onChangeTextSize={vi.fn()}
        />
        <main id="main-content" tabIndex={-1}>
          <DropoutAlertsView
            students={teacherStudents}
            alerts={seed.dropoutAlerts}
            onToggleAcknowledge={vi.fn(async () => {})}
            onOpenInterventionInAide={vi.fn()}
            onSignOutTeacher={vi.fn()}
          />
        </main>
      </div>
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('TeacherLoginDialog has zero axe violations', async () => {
    applyTheme();
    const { container } = render(
      <TeacherLoginDialog
        isOpen
        isSubmitting={false}
        errorMessage="Invalid teacher access code."
        onSubmit={vi.fn(async () => {})}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('MyPathView + TopBar has zero axe violations and one h1', async () => {
    applyTheme();
    const { container } = render(
      <div>
        <a href="#main-content">Skip to main content</a>
        <TopBar
          activeTab="path"
          onSelectTab={vi.fn()}
          activeAlertCount={null}
          isDark={isDark}
          onToggleTheme={vi.fn()}
          textSize="base"
          onChangeTextSize={vi.fn()}
        />
        <main id="main-content" tabIndex={-1}>
          <MyPathView
            students={publicStudents}
            selectedStudentId={publicStudents[0].id}
            onSelectStudentId={vi.fn()}
            learningPath={{
              studentId: publicStudents[0].id,
              generatedAt: new Date().toISOString(),
              sourceLogCount: 1,
              steps: [
                {
                  stepNumber: 1,
                  subject: 'Math',
                  topic: 'Linear Equations',
                  why: 'Core algebra foundation.',
                  estimatedMinutes: 15,
                  status: 'Mastered',
                },
                {
                  stepNumber: 2,
                  subject: 'Math',
                  topic: 'Word Problems',
                  why: 'Apply equations to local markets.',
                  estimatedMinutes: 20,
                  status: 'In Progress',
                },
                {
                  stepNumber: 3,
                  subject: 'Science',
                  topic: 'Photosynthesis',
                  why: 'Key biology chapter.',
                  estimatedMinutes: 15,
                  status: 'Locked',
                },
              ],
            }}
            progressLogs={seed.progressLogs}
            isLoading={false}
            errorMessage={null}
            onRefreshPath={vi.fn()}
            onPracticeStep={vi.fn()}
            onStartQuiz={vi.fn()}
          />
        </main>
      </div>
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('PracticeQuizModal has zero axe violations', async () => {
    applyTheme();
    const { container } = render(
      <PracticeQuizModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        topicLabel="Photosynthesis"
        quiz={{
          quizId: 'quiz-a11y',
          studentId: publicStudents[1].id,
          subject: 'Science',
          topic: 'Photosynthesis',
          language: 'Tamil / English',
          questions: [
            {
              id: 'q1',
              question: 'Which gas do plants absorb during photosynthesis?',
              options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'],
            },
          ],
        }}
        result={null}
        errorMessage={null}
        onSubmitAnswers={vi.fn(async () => {})}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('PracticeQuizModal graded results view has zero axe violations', async () => {
    applyTheme();
    const { container } = render(
      <PracticeQuizModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        topicLabel="Photosynthesis"
        quiz={{
          quizId: 'quiz-a11y-done',
          studentId: publicStudents[1].id,
          subject: 'Science',
          topic: 'Photosynthesis',
          language: 'Tamil / English',
          questions: [
            {
              id: 'q1',
              question: 'Which gas do plants absorb during photosynthesis?',
              options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Argon'],
            },
            {
              id: 'q2',
              question: 'Which pigment gives leaves their green colour?',
              options: ['Chlorophyll', 'Melanin', 'Iron', 'Water'],
            },
          ],
        }}
        result={{
          score: 1,
          total: 2,
          passed: false,
          results: [
            {
              questionId: 'q1',
              selectedIndex: 1,
              correctIndex: 1,
              isCorrect: true,
              explanation: 'Plants absorb carbon dioxide through stomata.',
            },
            {
              questionId: 'q2',
              selectedIndex: 2,
              correctIndex: 0,
              isCorrect: false,
              explanation: 'Chlorophyll captures sunlight for photosynthesis.',
            },
          ],
          progressLog: {
            id: 'log-a11y-quiz',
            student_id: publicStudents[1].id,
            subject: 'Science',
            topic: 'Photosynthesis',
            competency_level: 'Progressing',
            frustration_detected: false,
            quiz_score: 1,
            quiz_total: 2,
            timestamp: new Date().toISOString(),
          },
        }}
        errorMessage={null}
        onSubmitAnswers={vi.fn(async () => {})}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('PrintableContentModal has zero axe violations', async () => {
    applyTheme();
    const { container } = render(
      <PrintableContentModal
        isOpen
        title="Bilingual Fractions Worksheet"
        markdown={'## Practice Questions\n- What is 1/2 + 1/4?\n\n## Answer Key\n- 3/4'}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('LandingPage has zero axe violations and one h1', async () => {
    applyTheme();
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(
          JSON.stringify({ studentsTracked: 4, topicsMastered: 1, teacherAlerts: 1 }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

    try {
      const { container } = render(
        <LandingPage isDark={isDark} onToggleTheme={vi.fn()} onOpenApp={vi.fn()} />
      );

      await waitFor(() => {
        expect(container.textContent).toContain('4');
      });

      expect(container.querySelectorAll('h1')).toHaveLength(1);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('StudentTutorView with voice mic, language selector, and Read aloud buttons has zero axe violations', async () => {
    applyTheme();
    const win = window as unknown as Record<string, unknown>;
    const prevRec = win.SpeechRecognition;
    const prevSynth = win.speechSynthesis;
    const prevUtt = win.SpeechSynthesisUtterance;

    win.SpeechRecognition = class {};
    win.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
      getVoices: vi.fn(() => []),
    };
    win.SpeechSynthesisUtterance = class {};

    try {
      const { container } = render(
        <main id="main-content" tabIndex={-1}>
          <StudentTutorView
            students={publicStudents}
            selectedStudentId={publicStudents[0].id}
            onSelectStudentId={vi.fn()}
            messages={sampleMessages}
            onSendMessage={vi.fn(async () => {})}
            onResetChat={vi.fn()}
            isLoading={false}
            errorMessage={null}
            progressLogs={seed.progressLogs}
          />
        </main>
      );

      expect(container.querySelectorAll('h1')).toHaveLength(1);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    } finally {
      if (prevRec === undefined) delete win.SpeechRecognition;
      else win.SpeechRecognition = prevRec;
      if (prevSynth === undefined) delete win.speechSynthesis;
      else win.speechSynthesis = prevSynth;
      if (prevUtt === undefined) delete win.SpeechSynthesisUtterance;
      else win.SpeechSynthesisUtterance = prevUtt;
    }
  });

  it('TeacherAideView Class Overview tab with inspected student cell has zero axe violations', async () => {
    applyTheme();
    const user = userEvent.setup();
    const { container } = render(
      <main id="main-content" tabIndex={-1}>
        <TeacherAideView
          students={teacherStudents}
          progressLogs={seed.progressLogs}
          dropoutAlerts={seed.dropoutAlerts}
          messages={sampleMessages}
          onSendMessage={vi.fn(async () => {})}
          onResetChat={vi.fn()}
          onSignOutTeacher={vi.fn()}
          onGenerateWeeklySummary={vi.fn(async () => ({
            bullets: ['Bullet 1', 'Bullet 2', 'Bullet 3', 'Bullet 4', 'Bullet 5'],
            generatedAt: new Date().toISOString(),
          }))}
          isLoading={false}
          errorMessage={null}
          draftPrompt=""
          onConsumeDraftPrompt={vi.fn()}
        />
      </main>
    );

    await user.click(screen.getByRole('tab', { name: /Class Overview/i }));
    await user.click(
      screen.getByRole('button', {
        name: /Inspect Rohan Verma on Fractions & Ratios: Struggling/i,
      })
    );

    expect(container.querySelectorAll('h1')).toHaveLength(1);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('ParentUpdateModal has zero axe violations', async () => {
    applyTheme();
    const { container } = render(
      <ParentUpdateModal
        isOpen
        student={teacherStudents[0]}
        language="Hindi"
        onChangeLanguage={vi.fn()}
        update={{
          studentId: teacherStudents[0].id,
          studentName: teacherStudents[0].name,
          language: 'Hindi',
          message:
            'नमस्ते! आरव गणित में अच्छा प्रयास कर रहे हैं।\nवे रेखीय समीकरणों के कदम सीख रहे हैं।',
          strength: 'Steady effort in Linear Equations',
          practiceArea: 'Practice 2 simple equations at home daily',
        }}
        isLoading={false}
        errorMessage={null}
        onRegenerate={vi.fn()}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('DeleteStudentDataDialog has zero axe violations', async () => {
    applyTheme();
    const { container } = render(
      <DeleteStudentDataDialog
        isOpen
        student={teacherStudents[2]}
        logCount={1}
        alertCount={1}
        isDeleting={false}
        errorMessage={null}
        onConfirm={vi.fn(async () => {})}
        onClose={vi.fn()}
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
