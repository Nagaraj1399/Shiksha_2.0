// @vitest-environment jsdom
import { createRef } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSeedStore } from '../../../shared/shikshaLogic';
import {
  toPublicStudentProfile,
  toTeacherStudentProfile,
} from '../../../shared/security';
import {
  getCurrentRoute,
  getTabFromSearch,
  isTeacherTab,
  pushAppRoute,
  pushHomeRoute,
} from '../../routing';
import { Hero } from '../landing/Hero';
import { FeatureStrip } from '../landing/FeatureStrip';
import { HowItWorks } from '../landing/HowItWorks';
import { TeacherSection } from '../landing/TeacherSection';
import { Footer } from '../landing/Footer';
import { StatChips } from '../landing/StatChips';
import { HintLadder } from '../tutor/HintLadder';
import { StudentContextPanel } from '../tutor/StudentContextPanel';
import { InterventionQueue } from '../teacher/InterventionQueue';
import { ClassHeatmap } from '../teacher/ClassHeatmap';
import { TeacherChat } from '../teacher/TeacherChat';
import { StudentRosterCard } from '../progress/StudentRosterCard';
import { ProgressHeatmapCard } from '../progress/ProgressHeatmapCard';
import { ProgressLogTable } from '../progress/ProgressLogTable';

const seed = createSeedStore();
const publicStudents = seed.students.map(toPublicStudentProfile);
const teacherStudents = seed.students.map((s) =>
  toTeacherStudentProfile(s, seed.studentPhoneMap?.[s.id])
);

describe('Newly split components, routing & landing stat chips', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.pushState({}, '', '/');
    window.scrollTo = vi.fn();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('routing helpers identify teacher tabs, parse routes/search params, and push browser URLs', () => {
    expect(isTeacherTab('tutor')).toBe(false);
    expect(isTeacherTab('path')).toBe(false);
    expect(isTeacherTab('teacher')).toBe(true);
    expect(isTeacherTab('progress')).toBe(true);
    expect(isTeacherTab('alerts')).toBe(true);

    expect(getCurrentRoute()).toBe('/');
    expect(getTabFromSearch()).toBeNull();

    pushAppRoute('tutor');
    expect(getCurrentRoute()).toBe('/app');
    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe('');

    pushAppRoute('teacher');
    expect(getCurrentRoute()).toBe('/app');
    expect(getTabFromSearch()).toBe('teacher');

    window.history.pushState({}, '', '/app?tab=unknown');
    expect(getTabFromSearch()).toBeNull();

    pushHomeRoute();
    expect(getCurrentRoute()).toBe('/');
  });

  it('StatChips use dark teal rgba(18,59,62,0.85) background, stay strictly inside portrait at >=1100px, and stack in a 3-col row below 1100px', () => {
    const liveState = { studentsTracked: 12, topicsMastered: 5, teacherAlerts: 2 };
    render(
      <div>
        <StatChips liveState={liveState} layout="overlay" />
        <StatChips liveState={liveState} layout="row" />
      </div>
    );

    const overlayChips = screen.getAllByTestId('hero-stat-chip-overlay');
    expect(overlayChips).toHaveLength(3);
    for (const chip of overlayChips) {
      expect(chip.className).toContain('bg-[#123B3E]/85');
      expect(chip.className).toContain('min-[1100px]:flex');
      // Must stay strictly inside the portrait container (no negative edge offsets)
      expect(chip.className).not.toMatch(/-left-|-right-|-top-|-bottom-/);
    }

    const rowContainer = screen.getByTestId('hero-stat-chips-row');
    expect(rowContainer.className).toContain('min-[1100px]:hidden');
    expect(rowContainer.className).toContain('grid-cols-3');
    const rowItems = rowContainer.querySelectorAll('[class*="bg-[#123B3E]/85"]');
    expect(rowItems).toHaveLength(3);
    expect(screen.getAllByText('12')).toHaveLength(2);
    expect(screen.getAllByText('5')).toHaveLength(2);
    expect(screen.getAllByText('2')).toHaveLength(2);
  });

  it('Landing split sections render and invoke navigation & theme callbacks cleanly', async () => {
    const onOpenApp = vi.fn();
    const onToggleTheme = vi.fn();
    const onSelectNav = vi.fn();
    const user = userEvent.setup();

    render(
      <div>
        <Hero
          isDark={false}
          activeNav="home"
          onSelectNav={onSelectNav}
          onToggleTheme={onToggleTheme}
          onOpenApp={onOpenApp}
          liveState={{ studentsTracked: 4, topicsMastered: 1, teacherAlerts: 1 }}
        />
        <FeatureStrip />
        <HowItWorks onOpenApp={onOpenApp} />
        <TeacherSection onOpenApp={onOpenApp} />
        <Footer onSelectNav={onSelectNav} onOpenApp={onOpenApp} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: /Switch to Night Theme/i }));
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    const teacherLinks = screen.getAllByRole('link', { name: 'For Teachers' });
    await user.click(teacherLinks[0]);
    expect(onSelectNav).toHaveBeenCalledWith('for-teachers');

    await user.click(screen.getByRole('button', { name: /Open Teacher Aide/i }));
    expect(onOpenApp).toHaveBeenCalledWith('teacher');

    const openAppButtons = screen.getAllByRole('button', { name: /^Open App$/i });
    await user.click(openAppButtons[0]);
    expect(onOpenApp).toHaveBeenCalledWith('tutor');

    expect(screen.getByText('Socratic Tutoring')).toBeInTheDocument();
    expect(screen.getByText('Photo Homework Help')).toBeInTheDocument();
  });

  it('HintLadder triggers hint requests and disables once all 3 hints are used', async () => {
    const onRequestHint = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <HintLadder hintLevel={0} disabled={false} onRequestHint={onRequestHint} />
    );

    await user.click(screen.getByRole('button', { name: /I'm stuck \(Hint 1\/3\)/i }));
    expect(onRequestHint).toHaveBeenCalledTimes(1);

    rerender(
      <HintLadder hintLevel={3} disabled={false} onRequestHint={onRequestHint} />
    );
    expect(screen.getByRole('button', { name: /All 3 hints used/i })).toBeDisabled();
  });

  it('StudentContextPanel displays academic metadata and launches a Mastery Practice Quiz', async () => {
    const onStartQuiz = vi.fn();
    const user = userEvent.setup();

    render(
      <StudentContextPanel
        activeStudent={publicStudents[1]}
        progressLogs={seed.progressLogs.filter(
          (l) => l.student_id === publicStudents[1].id
        )}
        onStartQuiz={onStartQuiz}
      />
    );

    expect(screen.getByText(publicStudents[1].name)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Take 3-Question Quiz/i }));
    expect(onStartQuiz).toHaveBeenCalledWith('Science', 'Photosynthesis');
  });

  it('InterventionQueue renders active alerts and invokes intervention plan drafting', async () => {
    const onDraftIntervention = vi.fn();
    const studentById = new Map(teacherStudents.map((s) => [s.id, s]));
    const user = userEvent.setup();

    render(
      <InterventionQueue
        activeAlerts={seed.dropoutAlerts}
        strugglingLogs={seed.progressLogs.filter(
          (l) => l.competency_level === 'Struggling'
        )}
        studentById={studentById}
        isLoading={false}
        onDraftIntervention={onDraftIntervention}
      />
    );

    expect(screen.getAllByText(/Rohan Verma/).length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: /Draft intervention plan/i }));
    expect(onDraftIntervention).toHaveBeenCalledWith(
      expect.stringContaining('Rohan Verma')
    );
  });

  it('ClassHeatmap handles empty states, weekly summary errors, and closing the interactions drawer', async () => {
    const studentById = new Map(teacherStudents.map((s) => [s.id, s]));
    const user = userEvent.setup();

    const { rerender } = render(
      <ClassHeatmap
        students={teacherStudents}
        progressLogs={[]}
        dropoutAlerts={[]}
        studentById={studentById}
      />
    );
    expect(
      screen.getByText(/No topic attempts recorded yet to populate the class overview/i)
    ).toBeInTheDocument();

    const failingSummary = vi.fn(async () => {
      throw new Error('Summary service unavailable');
    });
    rerender(
      <ClassHeatmap
        students={teacherStudents}
        progressLogs={seed.progressLogs}
        dropoutAlerts={seed.dropoutAlerts}
        studentById={studentById}
        onGenerateWeeklySummary={failingSummary}
      />
    );

    await user.click(screen.getByRole('button', { name: /Generate weekly summary/i }));
    expect(await screen.findByText('Summary service unavailable')).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: /Inspect Priya Nair on Photosynthesis: Mastered/i,
      })
    );
    expect(
      screen.getByText(/Student Recent Interactions · Focused Topic: Photosynthesis/i)
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Close student interactions panel' })
    );
    expect(screen.queryByText(/Student Recent Interactions/i)).not.toBeInTheDocument();
  });

  it('TeacherChat triggers print sheet preview, templates, submit, and reset cleanly', async () => {
    const onResetChat = vi.fn();
    const onPrintMessage = vi.fn();
    const onTemplateClick = vi.fn();
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const user = userEvent.setup();

    render(
      <TeacherChat
        messages={[
          {
            id: 't1',
            role: 'assistant',
            text: '## 40-Min Lesson Plan\n1. Warmup\n\n## Answer Key\n1. 42',
            timestamp: '10:00 am',
          },
        ]}
        isLoading={false}
        errorMessage={null}
        inputText="Create a Class 7 fractions worksheet"
        onChangeInputText={vi.fn()}
        attachment={null}
        isCompressing={false}
        fileInputRef={createRef<HTMLInputElement>()}
        inputRef={createRef<HTMLInputElement>()}
        onResetChat={onResetChat}
        onPrintMessage={onPrintMessage}
        onTemplateClick={onTemplateClick}
        onAttachSampleSyllabus={vi.fn()}
        onFileChange={vi.fn()}
        onRemoveAttachment={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    await user.click(screen.getByRole('button', { name: /Print \/ Export Sheet/i }));
    expect(onPrintMessage).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', { name: /6th Grade Fractions \(40-min\)/i })
    );
    expect(onTemplateClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Send teacher request' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.click(
      screen.getByRole('button', { name: 'Reset teacher aide session' })
    );
    expect(onResetChat).toHaveBeenCalledTimes(1);
  });

  it('Progress sub-components render roster cards, empty heatmap, and empty log table cleanly', () => {
    render(
      <div>
        <StudentRosterCard
          students={[teacherStudents[0]]}
          progressLogs={seed.progressLogs}
          dropoutAlerts={seed.dropoutAlerts}
        />
        <ProgressHeatmapCard heatmap={{ topics: [], rows: [] }} onExportCsv={vi.fn()} />
        <ProgressLogTable
          filter="All"
          onChangeFilter={vi.fn()}
          query=""
          onChangeQuery={vi.fn()}
          filteredLogs={[]}
          studentById={new Map()}
        />
      </div>
    );

    expect(screen.getByText(teacherStudents[0].name)).toBeInTheDocument();
    expect(
      screen.getByText(/No topic attempts recorded yet to populate the class heatmap/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No matching student progress logs found/i)
    ).toBeInTheDocument();
  });
});
