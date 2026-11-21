// @vitest-environment jsdom
import { useState } from 'react';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { DropoutAlertsView } from '../DropoutAlertsView';
import { LandingPage } from '../LandingPage';
import { MarkdownText } from '../MarkdownText';
import { MyPathView } from '../MyPathView';
import { PracticeQuizModal } from '../PracticeQuizModal';
import { PrintableContentModal } from '../PrintableContentModal';
import { ProgressLedgerView } from '../ProgressLedgerView';
import { StudentTutorView } from '../StudentTutorView';
import { TeacherAideView } from '../TeacherAideView';
import { TeacherLoginDialog } from '../TeacherLoginDialog';
import { createSeedStore } from '../../../shared/shikshaLogic';
import {
  toPublicStudentProfile,
  toTeacherStudentProfile,
} from '../../../shared/security';
import type { PublicPracticeQuiz } from '../../../shared/types';

const mockReadFileAsImageAttachment = vi.fn();

vi.mock('../../utils/imageHelper', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../utils/imageHelper')>();
  return {
    ...actual,
    readFileAsImageAttachment: (
      ...args: Parameters<typeof actual.readFileAsImageAttachment>
    ) => mockReadFileAsImageAttachment(...args),
  };
});

describe('Shiksha-Agent React components', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/');
    window.scrollTo = vi.fn();
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.textSize;
    mockReadFileAsImageAttachment.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('sending a message in App displays the mocked assistant reply, merges delta progress, and returns focus to the input', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input) => {
        const url = typeof input === 'string' ? input : input.toString();
        if (url === '/api/students') {
          return new Response(JSON.stringify({ students: publicStudents }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        if (url.includes('/session')) {
          return new Response(
            JSON.stringify({
              sessionId: `${'a'.repeat(32)}.${'b'.repeat(64)}`,
              studentId: publicStudents[0].id,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('/progress')) {
          return new Response(
            JSON.stringify({
              studentId: publicStudents[0].id,
              progressLogs: seed.progressLogs.filter(
                (l) => l.student_id === publicStudents[0].id
              ),
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url === '/api/chat') {
          return new Response(
            JSON.stringify({
              reply: 'Shabash! Pehle 5 mangoes dono taraf se hata kar dekhein?',
              toolEvents: [
                {
                  name: 'log_student_progress',
                  args: {
                    student_id: publicStudents[0].id,
                    subject: 'Math',
                    topic: 'Linear Equations',
                    competency_level: 'Progressing',
                    frustration_detected: false,
                  },
                  timestamp: new Date().toISOString(),
                },
              ],
              sessionId: `${'a'.repeat(32)}.${'b'.repeat(64)}`,
              newProgressLogs: [
                {
                  id: 'log-delta-test',
                  student_id: publicStudents[0].id,
                  subject: 'Math',
                  topic: 'Balancing Scales',
                  competency_level: 'Progressing',
                  frustration_detected: false,
                  timestamp: new Date().toISOString(),
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
        });
      });

    window.history.pushState({}, '', '/app');
    const user = userEvent.setup();
    render(<App />);

    await screen.findByText('Aarav Sharma');

    // Skip link and main landmark exist
    const skipLink = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skipLink).toHaveAttribute('href', '#main-content');

    const input = screen.getByLabelText(
      'Ask a question in Hindi, Tamil, Marathi, or English'
    );
    await user.type(input, 'Please help me solve 2x + 5 = 15');
    await user.click(screen.getByRole('button', { name: /send/i }));

    expect(
      await screen.findByText(
        'Shabash! Pehle 5 mangoes dono taraf se hata kar dekhein?'
      )
    ).toBeInTheDocument();
    expect(await screen.findByText('Balancing Scales')).toBeInTheDocument();
    expect(input).toHaveFocus();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/chat',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('announces chat log politely, sets per-message lang attributes, and shows Shiksha is thinking… while loading', () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    render(
      <StudentTutorView
        students={publicStudents}
        selectedStudentId={publicStudents[0].id}
        onSelectStudentId={vi.fn()}
        messages={[
          {
            id: 'm-hi',
            role: 'assistant',
            text: 'प्रकाश संश्लेषण क्या होता है?',
            timestamp: '10:00 am',
          },
          {
            id: 'm-ta',
            role: 'user',
            text: 'வணக்கம்! இந்த கணக்கு புரியவில்லை.',
            timestamp: '10:01 am',
          },
          {
            id: 'm-mr',
            role: 'user',
            text: 'मला हे गणित समजत नाही.',
            timestamp: '10:02 am',
          },
          {
            id: 'm-gu',
            role: 'user',
            text: 'નમસ્તે! આ પ્રશ્ન સમજાવશો?',
            timestamp: '10:03 am',
          },
          {
            id: 'm-en',
            role: 'assistant',
            text: 'Let us break this down step by step!',
            timestamp: '10:04 am',
          },
        ]}
        onSendMessage={vi.fn(async () => {})}
        onResetChat={vi.fn()}
        isLoading
        errorMessage={null}
        progressLogs={[]}
      />
    );

    const logRegion = screen.getByRole('log', { name: 'Student tutor conversation' });
    expect(logRegion).toHaveAttribute('aria-live', 'polite');

    expect(screen.getByRole('status')).toHaveTextContent('Shiksha is thinking…');

    expect(
      screen.getByText('प्रकाश संश्लेषण क्या होता है?').closest('[lang]')
    ).toHaveAttribute('lang', 'hi');
    expect(
      screen.getByText('வணக்கம்! இந்த கணக்கு புரியவில்லை.').closest('[lang]')
    ).toHaveAttribute('lang', 'ta');
    expect(screen.getByText('मला हे गणित समजत नाही.').closest('[lang]')).toHaveAttribute(
      'lang',
      'mr'
    );
    expect(screen.getByText('નમસ્તે! આ પ્રશ્ન સમજાવશો?').closest('[lang]')).toHaveAttribute(
      'lang',
      'gu'
    );
    expect(
      screen.getByText('Let us break this down step by step!').closest('[lang]')
    ).toHaveAttribute('lang', 'en');
  });

  it('renders Markdown bullets as semantic <ul>/<li> and numbered items as <ol>/<li>', () => {
    const { container } = render(
      <MarkdownText
        text={
          'Intro line\n- First **bold** hint\n- Second hint\n1. Step one\n2. Step two'
        }
      />
    );

    const ul = container.querySelector('ul');
    expect(ul).not.toBeNull();
    expect(ul?.querySelectorAll('li')).toHaveLength(2);
    expect(ul?.querySelector('strong')?.textContent).toBe('bold');

    const ol = container.querySelector('ol');
    expect(ol).not.toBeNull();
    expect(ol?.querySelectorAll('li')).toHaveLength(2);
  });

  it('attaches a compressed image preview and removes it on click', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    mockReadFileAsImageAttachment.mockResolvedValueOnce({
      base64: 'ZmFrZS1qcGVn',
      mimeType: 'image/jpeg',
      previewUrl: 'data:image/jpeg;base64,ZmFrZS1qcGVn',
      label: 'algebra_homework.jpg',
      width: 1280,
      height: 960,
      originalBytes: 1_500_000,
      compressedBytes: 142 * 1024,
    });

    const user = userEvent.setup();
    render(
      <StudentTutorView
        students={publicStudents}
        selectedStudentId={publicStudents[0].id}
        onSelectStudentId={vi.fn()}
        messages={[]}
        onSendMessage={vi.fn(async () => {})}
        onResetChat={vi.fn()}
        isLoading={false}
        errorMessage={null}
        progressLogs={[]}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const fakeFile = new File(['image-bytes'], 'algebra_homework.jpg', {
      type: 'image/jpeg',
    });

    await user.upload(fileInput, fakeFile);

    expect(await screen.findByText('algebra_homework.jpg')).toBeInTheDocument();
    expect(screen.getByText(/1280×960 · Compressed: 142 KB/)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Remove attached homework photo' })
    );
    expect(screen.queryByText('algebra_homework.jpg')).not.toBeInTheDocument();
  });

  it('toggles Light/Night themes and A / A+ / A++ text-size controls on documentElement', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/students') {
        return new Response(JSON.stringify({ students: publicStudents }), {
          status: 200,
        });
      }
      if (url.includes('/session')) {
        return new Response(
          JSON.stringify({
            sessionId: `${'a'.repeat(32)}.${'b'.repeat(64)}`,
            studentId: publicStudents[0].id,
          }),
          { status: 200 }
        );
      }
      return new Response(JSON.stringify({ progressLogs: [] }), { status: 200 });
    });

    window.history.pushState({}, '', '/app');
    const user = userEvent.setup();
    render(<App />);

    const nightBtn = await screen.findByRole('button', {
      name: 'Switch to Night Theme',
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    await user.click(nightBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(window.localStorage.getItem('shiksha_theme')).toBe('dark');

    const lightBtn = screen.getByRole('button', {
      name: 'Switch to Light Theme',
    });
    await user.click(lightBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(window.localStorage.getItem('shiksha_theme')).toBe('light');

    // Text-size controls (A / A+ / A++)
    const defaultSizeBtn = screen.getByRole('button', { name: 'Default text size' });
    const largeSizeBtn = screen.getByRole('button', { name: 'Large text size' });
    const xlSizeBtn = screen.getByRole('button', { name: 'Extra large text size' });

    expect(defaultSizeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.textSize).toBe('base');

    await user.click(largeSizeBtn);
    expect(largeSizeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(defaultSizeBtn).toHaveAttribute('aria-pressed', 'false');
    expect(document.documentElement.dataset.textSize).toBe('lg');
    expect(window.localStorage.getItem('shiksha_text_size')).toBe('lg');

    await user.click(xlSizeBtn);
    expect(xlSizeBtn).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.textSize).toBe('xl');
    expect(window.localStorage.getItem('shiksha_text_size')).toBe('xl');
  });

  it('filters Student Progress Ledger by competency level with aria-pressed and search query', async () => {
    const seed = createSeedStore();
    const teacherStudents = seed.students.map((s) =>
      toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
    );

    const user = userEvent.setup();
    render(
      <ProgressLedgerView
        students={teacherStudents}
        progressLogs={seed.progressLogs}
        onSignOutTeacher={vi.fn()}
      />
    );

    const allChip = screen.getByRole('button', { name: 'All' });
    const strugglingChip = screen.getByRole('button', { name: 'Struggling' });

    expect(allChip).toHaveAttribute('aria-pressed', 'true');
    expect(strugglingChip).toHaveAttribute('aria-pressed', 'false');

    const tables = screen.getAllByRole('table');
    const ledgerTable = within(tables[tables.length - 1]);

    expect(ledgerTable.getByText('Linear Equations')).toBeInTheDocument();
    expect(ledgerTable.getByText('Photosynthesis')).toBeInTheDocument();
    expect(ledgerTable.getByText('Fractions & Ratios')).toBeInTheDocument();

    // Filter by Struggling
    await user.click(strugglingChip);
    expect(strugglingChip).toHaveAttribute('aria-pressed', 'true');
    expect(allChip).toHaveAttribute('aria-pressed', 'false');
    expect(ledgerTable.getByText('Fractions & Ratios')).toBeInTheDocument();
    expect(ledgerTable.queryByText('Photosynthesis')).not.toBeInTheDocument();

    // Switch back to All and search by topic
    await user.click(allChip);
    expect(allChip).toHaveAttribute('aria-pressed', 'true');
    const searchInput = screen.getByLabelText('Search student ID, subject, or topic');
    await user.type(searchInput, 'Water Cycle');
    expect(ledgerTable.getByText('Water Cycle')).toBeInTheDocument();
    expect(ledgerTable.queryByText('Linear Equations')).not.toBeInTheDocument();
  });

  it('acknowledges an active dropout alert and updates status', async () => {
    const seed = createSeedStore();
    const teacherStudents = seed.students.map((s) =>
      toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
    );
    const onToggleAcknowledge = vi.fn(async () => {});

    const user = userEvent.setup();
    const { rerender } = render(
      <DropoutAlertsView
        students={teacherStudents}
        alerts={seed.dropoutAlerts}
        onToggleAcknowledge={onToggleAcknowledge}
        onOpenInterventionInAide={vi.fn()}
        onSignOutTeacher={vi.fn()}
      />
    );

    const ackButton = screen.getByRole('button', { name: 'Acknowledge Alert' });
    await user.click(ackButton);

    await waitFor(() => {
      expect(onToggleAcknowledge).toHaveBeenCalledWith(seed.dropoutAlerts[0].id);
    });

    // Re-render with acknowledged alert delta merged
    rerender(
      <DropoutAlertsView
        students={teacherStudents}
        alerts={[{ ...seed.dropoutAlerts[0], status: 'Acknowledged' }]}
        onToggleAcknowledge={onToggleAcknowledge}
        onOpenInterventionInAide={vi.fn()}
        onSignOutTeacher={vi.fn()}
      />
    );

    expect(screen.getByText('Acknowledged')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reopen Alert' })).toBeInTheDocument();
  });

  it('traps focus inside TeacherLoginDialog, closes on Escape, and restores focus to opener', async () => {
    function DialogHarness() {
      const [open, setOpen] = useState(false);
      return (
        <div>
          <button type="button" onClick={() => setOpen(true)}>
            Open Teacher Login
          </button>
          <TeacherLoginDialog
            isOpen={open}
            isSubmitting={false}
            errorMessage={null}
            onSubmit={vi.fn(async () => {})}
            onClose={() => setOpen(false)}
          />
        </div>
      );
    }

    const user = userEvent.setup();
    render(<DialogHarness />);

    const opener = screen.getByRole('button', { name: 'Open Teacher Login' });
    opener.focus();
    await user.click(opener);

    const codeInput = screen.getByLabelText('Teacher Access Code');
    const closeBtn = screen.getByRole('button', { name: 'Close teacher login dialog' });
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    const signInBtn = screen.getByRole('button', { name: 'Sign In' });

    expect(codeInput).toHaveFocus();

    // Tab forward cycles through Cancel -> Sign In -> Close (wraps to first)
    await user.tab();
    expect(cancelBtn).toHaveFocus();
    await user.tab();
    expect(signInBtn).toHaveFocus();
    await user.tab();
    expect(closeBtn).toHaveFocus();

    // Shift+Tab from first wraps back to last (Sign In)
    await user.tab({ shift: true });
    expect(signInBtn).toHaveFocus();

    // Escape closes dialog and restores focus to opener
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('progresses the 3-level Hint Ladder with 3 small dots under the latest tutor message and labels sample button "Try a sample"', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);
    const onSendMessage = vi.fn(async () => {});

    const user = userEvent.setup();
    render(
      <StudentTutorView
        students={publicStudents}
        selectedStudentId={publicStudents[0].id}
        onSelectStudentId={vi.fn()}
        messages={[
          {
            id: 'm1',
            role: 'user',
            text: 'Can you solve 2x + 5 = 15?',
            timestamp: '10:00 am',
          },
          {
            id: 'm2',
            role: 'assistant',
            text: 'What should we remove from both sides of the balance scale first?',
            timestamp: '10:01 am',
          },
        ]}
        onSendMessage={onSendMessage}
        onResetChat={vi.fn()}
        isLoading={false}
        errorMessage={null}
        progressLogs={[]}
      />
    );

    expect(screen.getByRole('button', { name: /Try a sample/i })).toBeInTheDocument();

    const dotsContainer = screen.getByTestId('hint-level-dots');
    expect(dotsContainer).toHaveAttribute('aria-label', 'Hint level 0 of 3');
    expect(dotsContainer.querySelectorAll('[data-filled="true"]')).toHaveLength(0);

    const hintBtn1 = screen.getByRole('button', { name: /I'm stuck \(Hint 1\/3\)/i });
    await user.click(hintBtn1);
    expect(onSendMessage).toHaveBeenNthCalledWith(
      1,
      expect.stringMatching(/guiding question/i),
      undefined,
      1
    );
    expect(dotsContainer).toHaveAttribute('aria-label', 'Hint level 1 of 3');
    expect(dotsContainer.querySelectorAll('[data-filled="true"]')).toHaveLength(1);

    const hintBtn2 = screen.getByRole('button', {
      name: /I'm stuck \(Hint 2\/3 · Worked Example\)/i,
    });
    await user.click(hintBtn2);
    expect(onSendMessage).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/worked example/i),
      undefined,
      2
    );
    expect(dotsContainer).toHaveAttribute('aria-label', 'Hint level 2 of 3');
    expect(dotsContainer.querySelectorAll('[data-filled="true"]')).toHaveLength(2);

    const hintBtn3 = screen.getByRole('button', {
      name: /I'm stuck \(Hint 3\/3 · First Step\)/i,
    });
    await user.click(hintBtn3);
    expect(onSendMessage).toHaveBeenNthCalledWith(
      3,
      expect.stringMatching(/first step/i),
      undefined,
      3
    );
    expect(dotsContainer).toHaveAttribute('aria-label', 'Hint level 3 of 3');
    expect(dotsContainer.querySelectorAll('[data-filled="true"]')).toHaveLength(3);

    expect(screen.getByRole('button', { name: /All 3 hints used/i })).toBeDisabled();
  });

  it('renders MyPathView 5-step roadmap and launches Practice Quiz and Tutor actions', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);
    const onPracticeStep = vi.fn();
    const onStartQuiz = vi.fn();

    const user = userEvent.setup();
    render(
      <MyPathView
        students={publicStudents}
        selectedStudentId={publicStudents[1].id}
        onSelectStudentId={vi.fn()}
        learningPath={{
          studentId: publicStudents[1].id,
          generatedAt: new Date().toISOString(),
          sourceLogCount: 1,
          steps: [
            {
              stepNumber: 1,
              subject: 'Science',
              topic: 'Photosynthesis',
              why: 'Mastered foundation.',
              estimatedMinutes: 15,
              status: 'Mastered',
            },
            {
              stepNumber: 2,
              subject: 'Science',
              topic: 'Plant Respiration',
              why: 'Next step after photosynthesis.',
              estimatedMinutes: 20,
              status: 'Unlocked',
            },
            {
              stepNumber: 3,
              subject: 'Math',
              topic: 'Fractions',
              why: 'Locked until Step 2 mastered.',
              estimatedMinutes: 20,
              status: 'Locked',
            },
          ],
        }}
        progressLogs={seed.progressLogs}
        isLoading={false}
        errorMessage={null}
        onRefreshPath={vi.fn()}
        onPracticeStep={onPracticeStep}
        onStartQuiz={onStartQuiz}
      />
    );

    expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
    expect(screen.getByText('Plant Respiration')).toBeInTheDocument();
    expect(screen.getByText('Master earlier step to unlock')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Take 3-Question Quiz/i }));
    expect(onStartQuiz).toHaveBeenCalledWith('Science', 'Photosynthesis');

    await user.click(screen.getByRole('button', { name: /Practice with Tutor/i }));
    expect(onPracticeStep).toHaveBeenCalledWith('Science', 'Plant Respiration');
  });

  it('allows completing a 3-question PracticeQuizModal and displays graded score and explanations', async () => {
    const onSubmitAnswers = vi.fn(async () => {});
    const quiz: PublicPracticeQuiz = {
      quizId: 'quiz-abc',
      studentId: 'STU-TN-208',
      subject: 'Science',
      topic: 'Photosynthesis',
      language: 'English',
      questions: [
        {
          id: 'q1',
          question: 'Which gas do plants absorb?',
          options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'],
        },
        {
          id: 'q2',
          question: 'Which pigment makes leaves green?',
          options: ['Chlorophyll', 'Melanin', 'Iron', 'Water'],
        },
        {
          id: 'q3',
          question: 'What is the main energy source?',
          options: ['Wind', 'Moonlight', 'Sunlight', 'Soil'],
        },
      ],
    };

    const user = userEvent.setup();
    const { rerender } = render(
      <PracticeQuizModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        topicLabel="Photosynthesis"
        quiz={quiz}
        result={null}
        errorMessage={null}
        onSubmitAnswers={onSubmitAnswers}
        onClose={vi.fn()}
      />
    );

    const submitBtn = screen.getByRole('button', { name: 'Submit Quiz' });
    expect(submitBtn).toBeDisabled();

    await user.click(screen.getByLabelText('Carbon dioxide'));
    await user.click(screen.getByLabelText('Chlorophyll'));
    await user.click(screen.getByLabelText('Sunlight'));
    expect(submitBtn).toBeEnabled();

    await user.click(submitBtn);
    expect(onSubmitAnswers).toHaveBeenCalledWith([1, 0, 2]);

    rerender(
      <PracticeQuizModal
        isOpen
        isLoading={false}
        isSubmitting={false}
        topicLabel="Photosynthesis"
        quiz={quiz}
        result={{
          score: 3,
          total: 3,
          passed: true,
          results: [
            {
              questionId: 'q1',
              selectedIndex: 1,
              correctIndex: 1,
              isCorrect: true,
              explanation: 'Plants take in carbon dioxide through stomata.',
            },
            {
              questionId: 'q2',
              selectedIndex: 0,
              correctIndex: 0,
              isCorrect: true,
              explanation: 'Chlorophyll gives leaves their green colour.',
            },
            {
              questionId: 'q3',
              selectedIndex: 2,
              correctIndex: 2,
              isCorrect: true,
              explanation: 'Sunlight drives photosynthesis.',
            },
          ],
          progressLog: {
            id: 'log-quiz-1',
            student_id: 'STU-TN-208',
            subject: 'Science',
            topic: 'Photosynthesis',
            competency_level: 'Mastered',
            frustration_detected: false,
            quiz_score: 3,
            quiz_total: 3,
            timestamp: new Date().toISOString(),
          },
        }}
        errorMessage={null}
        onSubmitAnswers={onSubmitAnswers}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Score: 3 / 3')).toBeInTheDocument();
    expect(
      screen.getByText('Plants take in carbon dioxide through stomata.')
    ).toBeInTheDocument();
  });

  it('renders Class Mastery Heatmap in ProgressLedgerView and exports CSV cleanly', async () => {
    const seed = createSeedStore();
    const teacherStudents = seed.students.map((s) =>
      toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
    );

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-heatmap-csv');
    const revokeObjectUrlSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const user = userEvent.setup();
    render(
      <ProgressLedgerView
        students={teacherStudents}
        progressLogs={seed.progressLogs}
        onSignOutTeacher={vi.fn()}
      />
    );

    expect(
      screen.getByRole('heading', { name: /Class Mastery Heatmap/i })
    ).toBeInTheDocument();
    const exportBtn = screen.getByRole('button', { name: /Export CSV/i });
    await user.click(exportBtn);

    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-heatmap-csv');
  });

  it('splits lesson worksheet and separate-page Answer Key in PrintableContentModal', async () => {
    const printSpy = vi.spyOn(window, 'print').mockImplementation(() => {});
    const user = userEvent.setup();

    render(
      <PrintableContentModal
        isOpen
        title="Class 8 Algebra Worksheet"
        markdown={
          '## Practice Questions\n1. Solve 2x + 5 = 15\n\n## Answer Key\n1. x = 5'
        }
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Printable Classroom Sheet')).toBeInTheDocument();
    expect(screen.getByText('Answer Key')).toBeInTheDocument();
    expect(document.querySelector('.print-answer-key')?.textContent).toContain('x = 5');

    await user.click(screen.getByRole('button', { name: /Print \/ Save PDF/i }));
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('renders public landing page at "/" with live /api/state counters and navigates cleanly to /app and /app?tab=teacher', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : input.toString();
      if (url === '/api/state') {
        return new Response(
          JSON.stringify({
            studentsTracked: 4,
            topicsMastered: 1,
            teacherAlerts: 1,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      if (url === '/api/students') {
        return new Response(JSON.stringify({ students: publicStudents }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.includes('/session')) {
        return new Response(
          JSON.stringify({
            sessionId: `${'a'.repeat(32)}.${'b'.repeat(64)}`,
            studentId: publicStudents[0].id,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(JSON.stringify({ progressLogs: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const user = userEvent.setup();
    render(<App />);

    // Hero headline and live /api/state numbers render on "/"
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Learn, Think, and Grow with a Tutor that Asks, Not Tells/i,
      })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Students tracked').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Topics mastered').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Teacher alerts').length).toBeGreaterThanOrEqual(1);

    // Click "Start Learning" -> moves to /app Student Tutor
    await user.click(screen.getByRole('button', { name: /Start Learning/i }));
    expect(window.location.pathname).toBe('/app');
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();

    // Clicking the Shiksha-Agent logo in TopBar returns to "/"
    await user.click(
      screen.getByRole('button', { name: 'Shiksha-Agent — Return to home page' })
    );
    expect(window.location.pathname).toBe('/');

    // Click "I'm a Teacher" -> moves to /app?tab=teacher and prompts Teacher Login
    await user.click(screen.getByRole('button', { name: /I'm a Teacher/i }));
    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe('?tab=teacher');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('LandingPage falls back to the teal-to-lime SVG blob illustration if /hero-student.png fails to load', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({ studentsTracked: 4, topicsMastered: 1, teacherAlerts: 1 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    render(<LandingPage isDark={false} onToggleTheme={vi.fn()} onOpenApp={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getAllByText('4').length).toBeGreaterThanOrEqual(1);
    });

    const img = screen.getByAltText('Smiling Indian school student holding notebooks');
    fireEvent.error(img);

    expect(
      await screen.findByRole('img', {
        name: 'Illustration representing an Indian student learning with notebooks',
      })
    ).toBeInTheDocument();
  });

  it('hides mic, language selector, and Read aloud buttons gracefully when Web Speech APIs are unavailable', () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    render(
      <StudentTutorView
        students={publicStudents}
        selectedStudentId={publicStudents[0].id}
        onSelectStudentId={vi.fn()}
        messages={[
          {
            id: 'a1',
            role: 'assistant',
            text: 'Chaliye ise step by step samajhte hain.',
            timestamp: '10:00 am',
          },
        ]}
        onSendMessage={vi.fn(async () => {})}
        onResetChat={vi.fn()}
        isLoading={false}
        errorMessage={null}
        progressLogs={[]}
      />
    );

    expect(
      screen.queryByRole('button', { name: /voice input/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Voice language')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Read tutor reply aloud/i })
    ).not.toBeInTheDocument();
  });

  it('streams live Web Speech API transcript into composer and reads tutor replies aloud in the selected language', async () => {
    const seed = createSeedStore();
    const publicStudents = seed.students.map(toPublicStudentProfile);

    const recognitions: MockSpeechRecognition[] = [];

    class MockSpeechRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start = vi.fn();
      stop = vi.fn(() => {
        this.onend?.();
      });
      abort = vi.fn();

      constructor() {
        recognitions.push(this);
      }
    }

    const spokenUtterances: MockUtterance[] = [];
    class MockUtterance {
      text: string;
      lang = '';
      voice: SpeechSynthesisVoice | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
      }
    }

    const mockSpeechSynthesis = {
      speak: vi.fn((u: MockUtterance) => {
        spokenUtterances.push(u);
      }),
      cancel: vi.fn(),
      getVoices: vi.fn(() => [
        { lang: 'mr-IN', name: 'Marathi Voice' } as SpeechSynthesisVoice,
        { lang: 'ta-IN', name: 'Tamil Voice' } as SpeechSynthesisVoice,
      ]),
    };

    const win = window as unknown as Record<string, unknown>;
    const prevRecognition = win.SpeechRecognition;
    const prevSynthesis = win.speechSynthesis;
    const prevUtterance = win.SpeechSynthesisUtterance;

    win.SpeechRecognition = MockSpeechRecognition;
    win.speechSynthesis = mockSpeechSynthesis;
    win.SpeechSynthesisUtterance = MockUtterance;

    try {
      const user = userEvent.setup();
      render(
        <StudentTutorView
          students={publicStudents}
          selectedStudentId={publicStudents[0].id}
          onSelectStudentId={vi.fn()}
          messages={[
            {
              id: 'u1',
              role: 'user',
              text: 'Please help me with fractions',
              timestamp: '10:00 am',
            },
            {
              id: 'a1',
              role: 'assistant',
              text: '**Great question!** Let us share 1 roti equally.',
              timestamp: '10:01 am',
            },
          ]}
          onSendMessage={vi.fn(async () => {})}
          onResetChat={vi.fn()}
          isLoading={false}
          errorMessage={null}
          progressLogs={[]}
        />
      );

      // Voice language selector exposes all 4 locales
      const langSelect = screen.getByLabelText('Voice language') as HTMLSelectElement;
      expect(Array.from(langSelect.options).map((o) => o.value)).toEqual([
        'hi-IN',
        'ta-IN',
        'mr-IN',
        'en-IN',
      ]);

      // Select Tamil (ta-IN) and click mic button
      await user.selectOptions(langSelect, 'ta-IN');
      const micBtn = screen.getByRole('button', { name: 'Start voice input' });
      await user.click(micBtn);

      expect(recognitions).toHaveLength(1);
      const activeRecognition = recognitions[0];
      expect(activeRecognition.lang).toBe('ta-IN');
      expect(activeRecognition.interimResults).toBe(true);
      expect(activeRecognition.start).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Listening (ta-IN)…')).toBeInTheDocument();

      // Emit live interim transcript -> immediately shown in composer input
      await waitFor(() => {
        activeRecognition.onresult?.({
          resultIndex: 0,
          results: {
            length: 1,
            0: {
              isFinal: false,
              length: 1,
              0: { transcript: 'இந்த கணக்கு புரியவில்லை', confidence: 0.85 },
            },
          },
        });
      });

      const composerInput = screen.getByLabelText(
        'Ask a question in Hindi, Tamil, Marathi, or English'
      ) as HTMLInputElement;
      expect(composerInput.value).toBe('இந்த கணக்கு புரியவில்லை');

      // Stop listening
      await user.click(screen.getByRole('button', { name: 'Stop voice input' }));
      expect(activeRecognition.stop).toHaveBeenCalledTimes(1);

      // Switch to Marathi (mr-IN) and click Read aloud on tutor reply (only 1 button for assistant msg)
      await user.selectOptions(langSelect, 'mr-IN');
      const readAloudButtons = screen.getAllByRole('button', {
        name: 'Read tutor reply aloud',
      });
      expect(readAloudButtons).toHaveLength(1);

      await user.click(readAloudButtons[0]);
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
      expect(spokenUtterances[0].lang).toBe('mr-IN');
      expect(spokenUtterances[0].text).toBe(
        'Great question! Let us share 1 roti equally.'
      );
      expect(spokenUtterances[0].voice?.name).toBe('Marathi Voice');

      // Button toggles to Stop reading and cancels when clicked again
      const stopBtn = screen.getByRole('button', {
        name: 'Stop reading tutor reply aloud',
      });
      expect(stopBtn).toHaveAttribute('aria-pressed', 'true');
      await user.click(stopBtn);
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalledTimes(3);
      expect(
        screen.getByRole('button', { name: 'Read tutor reply aloud' })
      ).toHaveAttribute('aria-pressed', 'false');
    } finally {
      if (prevRecognition === undefined) delete win.SpeechRecognition;
      else win.SpeechRecognition = prevRecognition;
      if (prevSynthesis === undefined) delete win.speechSynthesis;
      else win.speechSynthesis = prevSynthesis;
      if (prevUtterance === undefined) delete win.SpeechSynthesisUtterance;
      else win.SpeechSynthesisUtterance = prevUtterance;
    }
  });

  it('TeacherAideView Class Overview tab renders interactive heatmap, inspects student interactions on cell click, exports CSV, and generates 5-bullet weekly summary', async () => {
    const seed = createSeedStore();
    const teacherStudents = seed.students.map((s) =>
      toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
    );

    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:mock-overview-csv');
    const revokeObjectUrlSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {});
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const onGenerateWeeklySummary = vi.fn(async () => ({
      generatedAt: new Date().toISOString(),
      bullets: [
        'Priya Nair mastered Photosynthesis.',
        'Rohan Verma needs fractions support.',
        'Aarav Sharma is advancing on Linear Equations.',
        'Ananya Patel is building Water Cycle clarity.',
        'Schedule a 15-minute fractions check-in tomorrow.',
      ],
    }));

    const user = userEvent.setup();
    render(
      <TeacherAideView
        students={teacherStudents}
        progressLogs={seed.progressLogs}
        dropoutAlerts={seed.dropoutAlerts}
        messages={[]}
        onSendMessage={vi.fn(async () => {})}
        onResetChat={vi.fn()}
        onSignOutTeacher={vi.fn()}
        onGenerateWeeklySummary={onGenerateWeeklySummary}
        isLoading={false}
        errorMessage={null}
        draftPrompt=""
        onConsumeDraftPrompt={vi.fn()}
      />
    );

    // Switch to Class Overview tab
    await user.click(screen.getByRole('tab', { name: /Class Overview/i }));
    expect(
      screen.getByRole('heading', { name: /Class Overview Heatmap/i })
    ).toBeInTheDocument();

    // Masked phone appears in teacher overview, never raw +91
    expect(screen.getByText(/\*+1204/)).toBeInTheDocument();
    expect(document.body.textContent).not.toContain('+91');

    // Click a student/topic cell -> opens student's recent interactions panel
    await user.click(
      screen.getByRole('button', {
        name: /Inspect Rohan Verma on Fractions & Ratios: Struggling/i,
      })
    );
    expect(
      screen.getByText(
        /Student Recent Interactions · Focused Topic: Fractions & Ratios/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/Dropout Risk Signals/i)).toBeInTheDocument();

    // Export CSV
    await user.click(screen.getByRole('button', { name: /Export CSV/i }));
    expect(createObjectUrlSpy).toHaveBeenCalledTimes(1);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith('blob:mock-overview-csv');

    // Generate weekly summary -> 5 bullets rendered
    await user.click(screen.getByRole('button', { name: /Generate weekly summary/i }));
    await waitFor(() => {
      expect(onGenerateWeeklySummary).toHaveBeenCalledTimes(1);
    });
    expect(
      await screen.findByText('Priya Nair mastered Photosynthesis.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Schedule a 15-minute fractions check-in tomorrow.')
    ).toBeInTheDocument();
  });

  it('ProgressLedgerView supports regional-language Parent update preview/Copy (no auto-send) and Delete student data confirmation', async () => {
    const seed = createSeedStore();
    const teacherStudents = seed.students.map((s) =>
      toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
    );

    const onGenerateParentUpdate = vi.fn(
      async (
        studentId: string,
        language: 'Hindi' | 'Tamil' | 'Marathi' | 'English'
      ) => ({
        studentId,
        studentName: teacherStudents[0].name,
        language,
        message:
          language === 'Tamil'
            ? 'வணக்கம்! ஆரவ் கணிதத்தில் நல்ல முன்னேற்றம் காட்டுகிறார்.'
            : 'नमस्ते! आरव गणित में अच्छा प्रयास कर रहे हैं।',
        strength: 'Consistent practice on Linear Equations',
        practiceArea: '10-minute home revision of balancing equations',
      })
    );
    const onDeleteStudentData = vi.fn(async () => {});

    const user = userEvent.setup();
    const writeTextMock = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockResolvedValue();
    render(
      <ProgressLedgerView
        students={teacherStudents}
        progressLogs={seed.progressLogs}
        dropoutAlerts={seed.dropoutAlerts}
        onGenerateParentUpdate={onGenerateParentUpdate}
        onDeleteStudentData={onDeleteStudentData}
        onSignOutTeacher={vi.fn()}
      />
    );

    // Open Parent update modal for Aarav (first student)
    const parentButtons = screen.getAllByRole('button', { name: /Parent update/i });
    await user.click(parentButtons[0]);

    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).getByText(/नमस्ते! आरव गणित में अच्छा प्रयास कर रहे हैं।/)
    ).toBeInTheDocument();
    // Never exposes a Send button — only Copy
    expect(
      within(dialog).queryByRole('button', { name: /^Send/i })
    ).not.toBeInTheDocument();

    // Switch language to Tamil -> regenerates preview in Tamil
    await user.click(within(dialog).getByRole('button', { name: 'Tamil' }));
    await waitFor(() => {
      expect(onGenerateParentUpdate).toHaveBeenCalledWith(
        teacherStudents[0].id,
        'Tamil'
      );
    });
    expect(
      await within(dialog).findByText(/வணக்கம்! ஆரவ் கணிதத்தில் நல்ல முன்னேற்றம் காட்டுகிறார்\./)
    ).toBeInTheDocument();

    // Copy button copies message to clipboard
    await user.click(within(dialog).getByRole('button', { name: 'Copy' }));
    expect(writeTextMock).toHaveBeenCalledWith(
      'வணக்கம்! ஆரவ் கணிதத்தில் நல்ல முன்னேற்றம் காட்டுகிறார்.'
    );
    await user.click(within(dialog).getByRole('button', { name: 'Close' }));

    // Open Delete student data confirm dialog for Rohan (3rd student)
    const deleteButtons = screen.getAllByRole('button', {
      name: /Delete student data/i,
    });
    await user.click(deleteButtons[2]);

    const alertDialog = await screen.findByRole('alertdialog');
    expect(within(alertDialog).getByText(/Delete Student Data\?/i)).toBeInTheDocument();
    expect(within(alertDialog).getByText(/1 progress log/i)).toBeInTheDocument();
    expect(within(alertDialog).getByText(/1 dropout alert/i)).toBeInTheDocument();

    // Cancel closes without deleting
    await user.click(within(alertDialog).getByRole('button', { name: 'Cancel' }));
    expect(onDeleteStudentData).not.toHaveBeenCalled();

    // Reopen and confirm delete
    await user.click(deleteButtons[2]);
    const confirmDialog = await screen.findByRole('alertdialog');
    await user.click(
      within(confirmDialog).getByRole('button', { name: /Confirm Delete/i })
    );
    await waitFor(() => {
      expect(onDeleteStudentData).toHaveBeenCalledWith(teacherStudents[2].id);
    });
    expect(
      await screen.findByText(
        /Removed all progress logs and dropout alerts for Rohan Verma/i
      )
    ).toBeInTheDocument();
  });
});
