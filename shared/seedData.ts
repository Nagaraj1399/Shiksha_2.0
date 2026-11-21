import { SEED_RECORD_IDS, SEED_STUDENT_IDS } from './config.ts';
import type { ShikshaStoreState } from './types.ts';

/**
 * Generates a privacy-preserving internal student ID (e.g. `STU-MH-501`) so raw
 * phone numbers are never used as `student_id` anywhere in logs or alerts.
 *
 * @param stateCode Two-letter Indian state/board code (defaults to `'IN'`).
 * @param existingIds Set or array of already-assigned internal student IDs.
 * @returns Unique internal student ID string.
 */
export function generateInternalStudentId(
  stateCode = 'IN',
  existingIds: Iterable<string> = []
): string {
  const cleanCode =
    stateCode
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 2) || 'IN';
  const taken = new Set(existingIds);
  for (let num = 101; num <= 9999; num += 1) {
    const candidate = `STU-${cleanCode}-${num}`;
    if (!taken.has(candidate)) {
      return candidate;
    }
  }
  return `STU-${cleanCode}-${Date.now().toString().slice(-4)}`;
}

/**
 * Resolves a raw contact/WhatsApp phone number against the separate
 * `studentPhoneMap` to return an internal student ID (e.g. `STU-MH-104`), or
 * generates and registers a new internal ID when unseen.
 *
 * @param store Backing store state containing `studentPhoneMap`.
 * @param rawPhone Raw phone number string.
 * @param stateCode Optional two-letter state code for newly generated IDs.
 * @returns Internal student ID (never a raw phone number).
 */
export function resolveStudentIdByPhone(
  store: ShikshaStoreState,
  rawPhone: string,
  stateCode = 'IN'
): string {
  const normalizeDigits = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 ? digits.slice(-10) : digits;
  };
  const normalizedTarget = normalizeDigits(rawPhone);
  if (!store.studentPhoneMap) {
    store.studentPhoneMap = {};
  }
  for (const [studentId, mappedPhone] of Object.entries(store.studentPhoneMap)) {
    if (
      normalizeDigits(mappedPhone) === normalizedTarget &&
      normalizedTarget.length > 0
    ) {
      return studentId;
    }
  }
  const existingIds = [
    ...store.students.map((s) => s.id),
    ...Object.keys(store.studentPhoneMap),
  ];
  const newId = generateInternalStudentId(stateCode, existingIds);
  store.studentPhoneMap[newId] = rawPhone;
  return newId;
}

/**
 * Creates the initial seed dataset for Indian state-board students, a separate
 * internal-ID-to-phone mapping using clearly fictional invalid numbers
 * (`+91 00000 0xxxx`), sample progress logs, and an active dropout risk alert.
 *
 * @returns Initial {@link ShikshaStoreState}.
 */
export function createSeedStore(): ShikshaStoreState {
  return {
    students: [
      {
        id: SEED_STUDENT_IDS.AARAV,
        name: 'Aarav Sharma',
        grade: 'Class 7',
        board: 'Maharashtra State Board',
        preferredLanguage: 'Hindi / English',
      },
      {
        id: SEED_STUDENT_IDS.PRIYA,
        name: 'Priya Nair',
        grade: 'Class 6',
        board: 'Tamil Nadu Samacheer Kalvi',
        preferredLanguage: 'Tamil / English',
      },
      {
        id: SEED_STUDENT_IDS.ROHAN,
        name: 'Rohan Verma',
        grade: 'Class 8',
        board: 'UP Madhyamik Board',
        preferredLanguage: 'Hindi',
      },
      {
        id: SEED_STUDENT_IDS.KAVYA,
        name: 'Kavya Patel',
        grade: 'Class 6',
        board: 'Gujarat GSEB',
        preferredLanguage: 'Gujarati / English',
      },
    ],
    studentPhoneMap: {
      [SEED_STUDENT_IDS.AARAV]: '+91 00000 01204',
      [SEED_STUDENT_IDS.PRIYA]: '+91 00000 02392',
      [SEED_STUDENT_IDS.ROHAN]: '+91 00000 03148',
      [SEED_STUDENT_IDS.KAVYA]: '+91 00000 04564',
    },
    progressLogs: [
      {
        id: SEED_RECORD_IDS.LOG_1,
        student_id: SEED_STUDENT_IDS.AARAV,
        subject: 'Math',
        topic: 'Linear Equations',
        competency_level: 'Progressing',
        frustration_detected: false,
        hints_used: 1,
        timestamp: '2026-11-15T06:30:00.000Z',
      },
      {
        id: SEED_RECORD_IDS.LOG_2,
        student_id: SEED_STUDENT_IDS.PRIYA,
        subject: 'Science',
        topic: 'Photosynthesis',
        competency_level: 'Mastered',
        frustration_detected: false,
        hints_used: 0,
        timestamp: '2026-11-15T06:45:00.000Z',
      },
      {
        id: SEED_RECORD_IDS.LOG_3,
        student_id: SEED_STUDENT_IDS.ROHAN,
        subject: 'Math',
        topic: 'Fractions & Ratios',
        competency_level: 'Struggling',
        frustration_detected: true,
        hints_used: 3,
        timestamp: '2026-11-15T07:10:00.000Z',
      },
      {
        id: SEED_RECORD_IDS.LOG_4,
        student_id: SEED_STUDENT_IDS.KAVYA,
        subject: 'Science',
        topic: 'Water Cycle',
        competency_level: 'Progressing',
        frustration_detected: false,
        hints_used: 0,
        timestamp: '2026-11-15T07:35:00.000Z',
      },
    ],
    dropoutAlerts: [
      {
        id: SEED_RECORD_IDS.ALERT_1,
        student_id: SEED_STUDENT_IDS.ROHAN,
        reason_for_alert:
          'Repeated errors on Fractions & Ratios word problems with high frustration detected across two sessions.',
        timestamp: '2026-11-15T07:12:00.000Z',
        status: 'Active',
      },
    ],
    learningPaths: {},
  };
}
