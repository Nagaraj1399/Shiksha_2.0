import { describe, expect, it } from 'vitest';
import {
  applyLearningPathStatuses,
  buildClassHeatmap,
  detectDirectNumericAnswerLeak,
  exportHeatmapToCsv,
  extractNumericProblemAnswer,
  splitPrintableContent,
} from './educationLogic.ts';
import type { ProgressLog, TeacherStudentProfile } from './types.ts';

describe('educationLogic utilities', () => {
  describe('extractNumericProblemAnswer & detectDirectNumericAnswerLeak (Socratic Answer Guard)', () => {
    it('solves linear equations and arithmetic expressions accurately', () => {
      expect(extractNumericProblemAnswer('Please solve $2x + 5 = 15$')).toEqual({
        variable: 'x',
        answer: '5',
        matchedExpression: '2x + 5 = 15',
      });
      expect(extractNumericProblemAnswer('Find y when y - 4 = 10')).toEqual({
        variable: 'y',
        answer: '14',
        matchedExpression: 'y - 4 = 10',
      });
      expect(extractNumericProblemAnswer('Solve 3m = 21')).toEqual({
        variable: 'm',
        answer: '7',
        matchedExpression: '3m = 21',
      });
      expect(extractNumericProblemAnswer('What is 12 × 8?')).toEqual({
        answer: '96',
        matchedExpression: '12 × 8',
      });
      expect(extractNumericProblemAnswer('What is 15 / 4?')).toEqual({
        answer: '3.75',
        matchedExpression: '15 / 4',
      });
      expect(extractNumericProblemAnswer('Explain photosynthesis in Hindi')).toBeNull();
    });

    it('flags direct numeric answer leaks in English, Hinglish, Hindi, and Tamil', () => {
      expect(
        detectDirectNumericAnswerLeak(
          'Can you solve 2x + 5 = 15?',
          'Subtract 5 and divide by 2, so x = 5.'
        ).leaked
      ).toBe(true);

      expect(
        detectDirectNumericAnswerLeak(
          'Can you solve 2x + 5 = 15?',
          'Bahut badhiya, iska सही उत्तर: 5 hai!'
        ).leaked
      ).toBe(true);

      expect(
        detectDirectNumericAnswerLeak(
          'What is 12 * 8?',
          'When you multiply them you get = 96.'
        ).leaked
      ).toBe(true);
    });

    it('does not false-positive when restating the original equation or asking Socratic questions', () => {
      expect(
        detectDirectNumericAnswerLeak(
          'Can you solve $2x + 5 = 15$?',
          'Great start! In 2x + 5 = 15, if you remove 5 mangoes from both sides of the balance scale, what stays on the right side?'
        ).leaked
      ).toBe(false);

      expect(
        detectDirectNumericAnswerLeak(
          'Explain photosynthesis',
          'Plants use sunlight to make food. Where do they get water from?'
        ).leaked
      ).toBe(false);
    });
  });

  describe('applyLearningPathStatuses (sequential Mastery unlock)', () => {
    const rawSteps = [
      {
        subject: 'Math',
        topic: 'Linear Equations',
        why: 'Foundation for balancing both sides.',
        estimatedMinutes: 15,
      },
      {
        subject: 'Science',
        topic: 'Photosynthesis',
        why: 'Core biology concept.',
        estimatedMinutes: 20,
      },
      {
        subject: 'Math',
        topic: 'Fractions & Ratios',
        why: 'Needed for word problems.',
        estimatedMinutes: 25,
      },
      {
        subject: 'Math',
        topic: 'Percentages',
        why: 'Connects ratios to daily markets.',
        estimatedMinutes: 15,
      },
      {
        subject: 'Science',
        topic: 'Water Cycle',
        why: 'Connects evaporation and condensation.',
        estimatedMinutes: 100,
      },
    ];

    it('marks mastered topics as Mastered, unlocks only the next non-mastered frontier, and locks later steps', () => {
      const logs: ProgressLog[] = [
        {
          id: 'l1',
          student_id: 'STU-1',
          subject: 'Math',
          topic: 'linear equations',
          competency_level: 'Mastered',
          frustration_detected: false,
          timestamp: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 'l2',
          student_id: 'STU-1',
          subject: 'Science',
          topic: 'Photosynthesis',
          competency_level: 'Progressing',
          frustration_detected: false,
          timestamp: '2026-01-02T10:00:00.000Z',
        },
      ];

      const path = applyLearningPathStatuses(rawSteps, logs);
      expect(path).toHaveLength(5);
      expect(path.map((s) => s.status)).toEqual([
        'Mastered',
        'In Progress',
        'Locked',
        'Locked',
        'Locked',
      ]);
      expect(path[4].estimatedMinutes).toBe(60);

      const updatedPath = applyLearningPathStatuses(rawSteps, [
        ...logs,
        {
          id: 'l3',
          student_id: 'STU-1',
          subject: 'Science',
          topic: 'Photosynthesis',
          competency_level: 'Mastered',
          frustration_detected: false,
          timestamp: '2026-01-03T10:00:00.000Z',
        },
      ]);
      expect(updatedPath.map((s) => s.status)).toEqual([
        'Mastered',
        'Mastered',
        'Unlocked',
        'Locked',
        'Locked',
      ]);
    });
  });

  describe('buildClassHeatmap & exportHeatmapToCsv', () => {
    const students: TeacherStudentProfile[] = [
      {
        id: 'STU-1',
        name: 'Aarav, Jr.',
        grade: 'Class 8',
        board: 'Maharashtra State Board',
        preferredLanguage: 'Hindi / English',
      },
      {
        id: 'STU-2',
        name: '=CMD() Priya',
        grade: 'Class 6',
        board: 'Tamil Nadu Samacheer Kalvi',
        preferredLanguage: 'Tamil / English',
      },
    ];

    const logs: ProgressLog[] = [
      {
        id: 'log-old',
        student_id: 'STU-1',
        subject: 'Math',
        topic: 'Linear Equations',
        competency_level: 'Struggling',
        frustration_detected: true,
        timestamp: '2026-01-01T10:00:00.000Z',
      },
      {
        id: 'log-new',
        student_id: 'STU-1',
        subject: 'Math',
        topic: 'Linear Equations',
        competency_level: 'Mastered',
        frustration_detected: false,
        quiz_score: 3,
        quiz_total: 3,
        timestamp: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'log-priya',
        student_id: 'STU-2',
        subject: 'Science',
        topic: 'Photosynthesis',
        competency_level: 'Progressing',
        frustration_detected: false,
        timestamp: '2026-01-02T11:00:00.000Z',
      },
    ];

    it('uses the latest competency log per student-topic cell and serializes formula-safe CSV', () => {
      const heatmap = buildClassHeatmap(students, logs);
      expect(heatmap.topics.map((t) => t.topic)).toEqual([
        'Linear Equations',
        'Photosynthesis',
      ]);
      expect(heatmap.rows[0].cells['linear equations'].status).toBe('Mastered');
      expect(heatmap.rows[0].cells['photosynthesis'].status).toBe('Not Started');
      expect(heatmap.rows[1].cells['photosynthesis'].status).toBe('Progressing');

      const csv = exportHeatmapToCsv(heatmap);
      const lines = csv.split('\r\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe(
        'Student ID,Student Name,Grade,Board,Linear Equations (Math),Photosynthesis (Science)'
      );
      expect(lines[1]).toContain('"Aarav, Jr."');
      expect(lines[1]).toContain('Mastered (Quiz 3/3)');
      expect(lines[2]).toContain("'=CMD() Priya");
    });
  });

  describe('splitPrintableContent', () => {
    it('splits English and Hindi Answer Key headings onto a separate section', () => {
      const englishWorksheet =
        '## Class 8 Worksheet\n1. Solve 2x + 5 = 15\n\n## Answer Key\n1. x = 5';
      const splitEn = splitPrintableContent(englishWorksheet);
      expect(splitEn.mainContent).toContain('Solve 2x + 5 = 15');
      expect(splitEn.mainContent).not.toContain('x = 5');
      expect(splitEn.answerKey).toBe('1. x = 5');

      const hindiWorksheet =
        '## अभ्यास पत्रक\n1. पौधे भोजन कैसे बनाते हैं?\n\n### उत्तर कुंजी\n1. प्रकाश संश्लेषण द्वारा।';
      const splitHi = splitPrintableContent(hindiWorksheet);
      expect(splitHi.mainContent).toContain('अभ्यास पत्रक');
      expect(splitHi.answerKey).toBe('1. प्रकाश संश्लेषण द्वारा।');

      const noKey = splitPrintableContent('## Lesson Plan\n- Warmup activity');
      expect(noKey.mainContent).toContain('Warmup activity');
      expect(noKey.answerKey).toBeNull();
    });
  });
});
