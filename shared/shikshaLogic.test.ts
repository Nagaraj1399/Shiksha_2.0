import { describe, expect, it } from 'vitest';
import { SEED_STUDENT_IDS } from './config.ts';
import {
  buildSystemInstruction,
  computeStudentSummary,
  createSeedStore,
  filterProgressLogs,
  generateInternalStudentId,
  MAX_GEMINI_MESSAGES,
  mergeDropoutAlerts,
  mergeProgressLogs,
  normalizeCompetencyLevel,
  resolveStudentIdByPhone,
  sliceRecentMessages,
  validateDropoutAlertArgs,
  validateProgressArgs,
} from './shikshaLogic.ts';
import { computeScaledDimensions, formatByteSize } from '../src/utils/imageMath.ts';
import type { DropoutAlert, ProgressLog } from './types.ts';

describe('shikshaLogic & imageMath utilities', () => {
  it('normalizeCompetencyLevel maps valid levels and defaults safely', () => {
    expect(normalizeCompetencyLevel('mastered')).toBe('Mastered');
    expect(normalizeCompetencyLevel('Struggling')).toBe('Struggling');
    expect(normalizeCompetencyLevel('  progressing ')).toBe('Progressing');
    expect(normalizeCompetencyLevel('unknown')).toBe('Progressing');
    expect(normalizeCompetencyLevel(null)).toBe('Progressing');
  });

  it('validateProgressArgs enforces server-side studentId and clamps/merges hints_used', () => {
    const enforced = validateProgressArgs(
      {
        student_id: 'STU-FORGED-999',
        subject: 'Science',
        topic: 'Photosynthesis',
        competency_level: 'Mastered',
        frustration_detected: false,
        hints_used: 2,
      },
      'STU-TN-208'
    );
    expect(enforced.student_id).toBe('STU-TN-208');
    expect(enforced.competency_level).toBe('Mastered');
    expect(enforced.frustration_detected).toBe(false);
    expect(enforced.hints_used).toBe(2);

    const enforcedHint = validateProgressArgs(
      { topic: 'Linear Equations', hints_used: 0 },
      'STU-GJ-415',
      3
    );
    expect(enforcedHint.student_id).toBe('STU-GJ-415');
    expect(enforcedHint.subject).toBe('General');
    expect(enforcedHint.competency_level).toBe('Progressing');
    expect(enforcedHint.hints_used).toBe(3);

    const clamped = validateProgressArgs({ hints_used: 99 }, 'STU-GJ-415');
    expect(clamped.hints_used).toBe(3);
  });

  it('validateDropoutAlertArgs enforces server-side studentId and safe default reason', () => {
    const alert = validateDropoutAlertArgs(
      {
        student_id: 'STU-FORGED-999',
        reason_for_alert: 'Student wants to drop math class after 3 failed attempts.',
      },
      'STU-UP-312'
    );
    expect(alert.student_id).toBe('STU-UP-312');
    expect(alert.reason_for_alert).toMatch(/drop math class/);

    const fallback = validateDropoutAlertArgs({}, 'STU-UP-312');
    expect(fallback.student_id).toBe('STU-UP-312');
    expect(fallback.reason_for_alert.length).toBeGreaterThan(10);
  });

  it('filterProgressLogs filters by competency level and search query', () => {
    const seed = createSeedStore();
    expect(seed.students[0].id).toBe(SEED_STUDENT_IDS.AARAV);
    expect(JSON.stringify(seed.students)).not.toContain('whatsappNumber');

    // All seed phone numbers must use clearly fictional +91 00000 ... numbers
    for (const phone of Object.values(seed.studentPhoneMap ?? {})) {
      expect(phone).toMatch(/^\+91 00000 \d{5}$/);
    }

    const strugglingOnly = filterProgressLogs(seed.progressLogs, 'Struggling', '');
    expect(strugglingOnly).toHaveLength(1);
    expect(strugglingOnly[0].student_id).toBe('STU-UP-312');

    const mathSearch = filterProgressLogs(seed.progressLogs, 'All', 'linear');
    expect(mathSearch).toHaveLength(1);
    expect(mathSearch[0].topic).toBe('Linear Equations');
  });

  it('computeStudentSummary aggregates competency counts and active alerts accurately', () => {
    const seed = createSeedStore();
    const rohanSummary = computeStudentSummary(
      seed.progressLogs,
      seed.dropoutAlerts,
      'STU-UP-312'
    );
    expect(rohanSummary.totalAttempts).toBe(1);
    expect(rohanSummary.strugglingCount).toBe(1);
    expect(rohanSummary.frustrationCount).toBe(1);
    expect(rohanSummary.activeAlertCount).toBe(1);
  });

  it('buildSystemInstruction embeds Socratic rules, Hint Ladder directives, Answer Key cues, and caps teacher context to 10 logs and 10 alerts', () => {
    const seed = createSeedStore();
    const studentPrompt = buildSystemInstruction({
      mode: 'student',
      activeStudent: seed.students[0],
      recentLogs: seed.progressLogs,
      activeAlerts: [],
      hintLevel: 2,
    });
    expect(studentPrompt).toMatch(/NEVER give the direct answer/);
    expect(studentPrompt).toMatch(/ignore previous instructions/i);
    expect(studentPrompt).toMatch(/untrusted user content/i);
    expect(studentPrompt).toMatch(/LEVEL 2/i);
    expect(studentPrompt).toMatch(/worked example using COMPLETELY DIFFERENT numbers/i);

    const hint1Prompt = buildSystemInstruction({
      mode: 'student',
      activeStudent: seed.students[0],
      recentLogs: [],
      activeAlerts: [],
      hintLevel: 1,
    });
    expect(hint1Prompt).toMatch(/LEVEL 1/i);

    const hint3Prompt = buildSystemInstruction({
      mode: 'student',
      activeStudent: seed.students[0],
      recentLogs: [],
      activeAlerts: [],
      hintLevel: 3,
    });
    expect(hint3Prompt).toMatch(/LEVEL 3/i);
    expect(hint3Prompt).toMatch(/ONLY the very first step/i);

    const manyStrugglingLogs: ProgressLog[] = Array.from({ length: 15 }, (_, i) => ({
      id: `log-${i + 1}`,
      student_id: `STU-CAP-${i + 1}`,
      subject: 'Math',
      topic: `Topic-${i + 1}`,
      competency_level: 'Struggling',
      frustration_detected: i % 2 === 0,
      timestamp: new Date(Date.now() - i * 1000).toISOString(),
    }));

    const mixedAlerts: DropoutAlert[] = [
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `alert-active-${i + 1}`,
        student_id: `STU-ACT-${i + 1}`,
        reason_for_alert: `ActiveReason-${i + 1}`,
        timestamp: new Date(Date.now() - i * 1000).toISOString(),
        status: 'Active' as const,
      })),
      {
        id: 'alert-ack-1',
        student_id: 'STU-ACK-999',
        reason_for_alert: 'AcknowledgedShouldNotAppear',
        timestamp: new Date().toISOString(),
        status: 'Acknowledged',
      },
    ];

    const teacherPrompt = buildSystemInstruction({
      mode: 'teacher',
      recentLogs: manyStrugglingLogs,
      activeAlerts: mixedAlerts,
    });
    expect(teacherPrompt).toMatch(/MODE 2 - Teacher Aide/);
    expect(teacherPrompt).toMatch(/## Answer Key/);
    expect(teacherPrompt).toMatch(/untrusted content/i);
    expect(teacherPrompt).toMatch(/Topic-1\b/);
    expect(teacherPrompt).toMatch(/Topic-10\b/);
    expect(teacherPrompt).not.toMatch(/Topic-11\b/);
    expect(teacherPrompt).toMatch(/ActiveReason-1\b/);
    expect(teacherPrompt).toMatch(/ActiveReason-10\b/);
    expect(teacherPrompt).not.toMatch(/ActiveReason-11\b/);
    expect(teacherPrompt).not.toMatch(/AcknowledgedShouldNotAppear/);
  });

  it('sliceRecentMessages keeps at most MAX_GEMINI_MESSAGES (12) latest messages', () => {
    const messages = Array.from({ length: 18 }, (_, i) => ({
      role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
      text: `msg-${i + 1}`,
    }));
    const sliced = sliceRecentMessages(messages);
    expect(sliced).toHaveLength(MAX_GEMINI_MESSAGES);
    expect(sliced).toHaveLength(12);
    expect(sliced[0].text).toBe('msg-7');
    expect(sliced[11].text).toBe('msg-18');
  });

  it('mergeProgressLogs and mergeDropoutAlerts merge deltas cleanly without duplicates', () => {
    const seed = createSeedStore();
    expect(mergeProgressLogs(seed.progressLogs, [])).toBe(seed.progressLogs);
    expect(mergeDropoutAlerts(seed.dropoutAlerts, [])).toBe(seed.dropoutAlerts);

    const newLog: ProgressLog = {
      id: 'log-new-1',
      student_id: SEED_STUDENT_IDS.AARAV,
      subject: 'Math',
      topic: 'Fractions',
      competency_level: 'Progressing',
      frustration_detected: false,
      timestamp: new Date().toISOString(),
    };
    const mergedLogs = mergeProgressLogs(seed.progressLogs, [
      newLog,
      seed.progressLogs[0],
    ]);
    expect(mergedLogs).toHaveLength(seed.progressLogs.length + 1);
    expect(mergedLogs[0].id).toBe('log-new-1');

    const updatedSeedAlert: DropoutAlert = {
      ...seed.dropoutAlerts[0],
      status: 'Acknowledged',
    };
    const mergedAlerts = mergeDropoutAlerts(seed.dropoutAlerts, [updatedSeedAlert]);
    expect(mergedAlerts).toHaveLength(seed.dropoutAlerts.length);
    expect(mergedAlerts[0].status).toBe('Acknowledged');

    const brandNewAlert: DropoutAlert = {
      id: 'alert-new-2',
      student_id: SEED_STUDENT_IDS.AARAV,
      reason_for_alert: 'Repeated frustration',
      timestamp: new Date().toISOString(),
      status: 'Active',
    };
    const withNewAlert = mergeDropoutAlerts(mergedAlerts, [brandNewAlert]);
    expect(withNewAlert).toHaveLength(seed.dropoutAlerts.length + 1);
    expect(withNewAlert[0].id).toBe('alert-new-2');
  });

  it('computeScaledDimensions caps longest edge to 1280px preserving aspect ratio and formatByteSize formats bytes cleanly', () => {
    expect(computeScaledDimensions(2560, 1280, 1280)).toEqual({
      width: 1280,
      height: 640,
    });
    expect(computeScaledDimensions(1000, 2000, 1280)).toEqual({
      width: 640,
      height: 1280,
    });
    expect(computeScaledDimensions(800, 600, 1280)).toEqual({
      width: 800,
      height: 600,
    });
    expect(computeScaledDimensions(0, -10, 1280)).toEqual({
      width: 1,
      height: 1,
    });
    expect(formatByteSize(0)).toBe('0 B');
    expect(formatByteSize(512)).toBe('512 B');
    expect(formatByteSize(42 * 1024)).toBe('42.0 KB');
    expect(formatByteSize(185 * 1024)).toBe('185 KB');
    expect(formatByteSize(Math.round(1.5 * 1024 * 1024))).toBe('1.50 MB');
  });

  it('generateInternalStudentId and resolveStudentIdByPhone map phones to internal STU-* IDs without storing raw phones as student_id', () => {
    const seed = createSeedStore();
    expect(seed.studentPhoneMap?.[SEED_STUDENT_IDS.AARAV]).toBe('+91 00000 01204');

    // Existing fictional phone resolves to Aarav's internal STU-MH-104 regardless of formatting
    const existing = resolveStudentIdByPhone(seed, '00000-01204', 'MH');
    expect(existing).toBe(SEED_STUDENT_IDS.AARAV);

    // Brand-new fictional phone generates a fresh internal STU-KA-### ID and saves it in studentPhoneMap
    const created = resolveStudentIdByPhone(seed, '+91 00000 09999', 'KA');
    expect(created).toMatch(/^STU-KA-\d{3}$/);
    expect(created).not.toContain('09999');
    expect(seed.studentPhoneMap?.[created]).toBe('+91 00000 09999');

    // Calling again for the same new phone returns the same internal ID
    expect(resolveStudentIdByPhone(seed, '0000009999', 'KA')).toBe(created);

    // Direct ID generator avoids collisions
    const nextId = generateInternalStudentId('MH', [SEED_STUDENT_IDS.AARAV]);
    expect(nextId).toMatch(/^STU-MH-\d{3}$/);
    expect(nextId).not.toBe(SEED_STUDENT_IDS.AARAV);
  });
});
