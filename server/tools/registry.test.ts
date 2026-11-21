import { describe, expect, it } from 'vitest';
import { TOOL_NAMES } from '../../shared/config.ts';
import type { DropoutAlert, ProgressLog } from '../../shared/types.ts';
import { createSeedStore } from '../../shared/shikshaLogic.ts';
import { executeRegisteredTool, getToolDeclarations, TOOL_REGISTRY } from './index.ts';

describe('server tool registry', () => {
  it('exposes paired declarations and handlers for all student tools', () => {
    const declarations = getToolDeclarations();
    const names = declarations.map((d) => d.name).sort();
    expect(names).toEqual([
      TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
      TOOL_NAMES.LOG_STUDENT_PROGRESS,
    ]);
    expect(TOOL_REGISTRY[TOOL_NAMES.LOG_STUDENT_PROGRESS]).toBeDefined();
    expect(TOOL_REGISTRY[TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK]).toBeDefined();
  });

  it('dispatches log_student_progress and enforces server studentId', () => {
    const store = createSeedStore();
    const createdLogs: ProgressLog[] = [];
    const createdAlerts: DropoutAlert[] = [];

    const result = executeRegisteredTool(
      TOOL_NAMES.LOG_STUDENT_PROGRESS,
      {
        student_id: 'STU-SPOOFED-999',
        subject: 'Science',
        topic: 'Photosynthesis',
        competency_level: 'Mastered',
        frustration_detected: false,
      },
      {
        activeStudentId: 'STU-TN-208',
        store,
        nowIso: '2026-11-20T09:00:00.000Z',
        createdLogs,
        createdAlerts,
      }
    );

    expect(result).not.toBeNull();
    expect(result?.mutated).toBe(true);
    expect(createdLogs).toHaveLength(1);
    expect(createdLogs[0].student_id).toBe('STU-TN-208');
    expect(store.progressLogs[0].id).toBe(createdLogs[0].id);
    expect(result?.toolEvent.name).toBe(TOOL_NAMES.LOG_STUDENT_PROGRESS);
  });

  it('dispatches alert_teacher_dropout_risk and ignores unknown tools', () => {
    const store = createSeedStore();
    const createdLogs: ProgressLog[] = [];
    const createdAlerts: DropoutAlert[] = [];

    const alertResult = executeRegisteredTool(
      TOOL_NAMES.ALERT_TEACHER_DROPOUT_RISK,
      {
        student_id: 'STU-SPOOFED-999',
        reason_for_alert: 'Student wants to give up after repeated algebra errors.',
      },
      {
        activeStudentId: 'STU-UP-312',
        store,
        nowIso: '2026-11-20T09:05:00.000Z',
        createdLogs,
        createdAlerts,
      }
    );

    expect(alertResult).not.toBeNull();
    expect(alertResult?.mutated).toBe(true);
    expect(createdAlerts).toHaveLength(1);
    expect(createdAlerts[0].student_id).toBe('STU-UP-312');
    expect(createdAlerts[0].status).toBe('Active');
    expect(store.dropoutAlerts[0].id).toBe(createdAlerts[0].id);

    const unknownResult = executeRegisteredTool(
      'non_existent_tool',
      {},
      {
        activeStudentId: 'STU-UP-312',
        store,
        nowIso: '2026-11-20T09:05:00.000Z',
        createdLogs,
        createdAlerts,
      }
    );
    expect(unknownResult).toBeNull();
  });
});
