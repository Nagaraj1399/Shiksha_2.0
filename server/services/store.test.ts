import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SEED_STUDENT_IDS } from '../../shared/config.ts';
import { PersistentShikshaStore, resolveDefaultStorePath } from './store.ts';

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'shiksha-store-test-'));
  try {
    await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe('PersistentShikshaStore', () => {
  it('seeds on startup, debounces writes, serializes concurrent mutations without data loss, and writes atomically', async () => {
    await withTempDir(async (dir) => {
      const storeFile = path.join(dir, 'shiksha-store.json');
      const manager = new PersistentShikshaStore(storeFile, 30);

      await manager.init();
      const state = manager.getState();
      expect(state.students.some((s) => s.id === SEED_STUDENT_IDS.AARAV)).toBe(true);
      expect(JSON.stringify(state.students)).not.toContain('whatsappNumber');

      const initialEntries = await fs.readdir(dir);
      expect(initialEntries).toEqual(['shiksha-store.json']);

      // Simulate concurrent writes / rapid burst mutations with overlapping flushes
      await Promise.all(
        Array.from({ length: 12 }, async (_, idx) => {
          state.progressLogs.unshift({
            id: `log-concurrent-${idx + 1}`,
            student_id: SEED_STUDENT_IDS.AARAV,
            subject: 'Math',
            topic: `Concurrent Topic ${idx + 1}`,
            competency_level: 'Progressing',
            frustration_detected: false,
            timestamp: new Date().toISOString(),
          });
          manager.scheduleSave();
          if (idx % 3 === 0) {
            await manager.flush();
          }
        })
      );

      await manager.flush();

      // Atomic temp + rename should leave zero .tmp files
      const afterEntries = await fs.readdir(dir);
      expect(afterEntries).toEqual(['shiksha-store.json']);

      // All 12 concurrent mutations must be preserved intact on disk
      const raw = await fs.readFile(storeFile, 'utf-8');
      const parsed = JSON.parse(raw);
      for (let i = 1; i <= 12; i += 1) {
        expect(
          parsed.progressLogs.some(
            (l: { id: string }) => l.id === `log-concurrent-${i}`
          )
        ).toBe(true);
      }

      // Reloading a fresh manager from disk restores persisted state
      const reloaded = new PersistentShikshaStore(storeFile, 30);
      await reloaded.init();
      expect(reloaded.getState().progressLogs.length).toBe(parsed.progressLogs.length);
    });
  });

  it('strips legacy whatsappNumber fields when loading an older JSON snapshot from disk', async () => {
    await withTempDir(async (dir) => {
      const legacyFile = path.join(dir, 'legacy-store.json');
      await fs.writeFile(
        legacyFile,
        JSON.stringify({
          students: [
            {
              id: SEED_STUDENT_IDS.AARAV,
              name: 'Aarav Sharma',
              grade: 'Class 8',
              board: 'Maharashtra State Board',
              preferredLanguage: 'Hindi / English',
              whatsappNumber: '+91 98204 11204',
            },
          ],
          progressLogs: [],
          dropoutAlerts: [],
        }),
        'utf-8'
      );

      const manager = new PersistentShikshaStore(legacyFile, 20);
      const state = await manager.init();
      expect(state.students).toHaveLength(1);
      expect('whatsappNumber' in state.students[0]).toBe(false);
      expect(state.learningPaths).toEqual({});
    });
  });

  it('falls back to seed state when disk JSON is corrupted or has invalid structure', async () => {
    await withTempDir(async (dir) => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      try {
        const corruptedFile = path.join(dir, 'corrupted.json');
        await fs.writeFile(corruptedFile, '{ not valid json !!!', 'utf-8');

        const manager = new PersistentShikshaStore(corruptedFile, 20);
        const state = await manager.init();

        expect(state.students.some((s) => s.id === SEED_STUDENT_IDS.AARAV)).toBe(true);
        expect(state.progressLogs.length).toBeGreaterThan(0);
        expect(state.dropoutAlerts.length).toBeGreaterThan(0);

        // Disk file should now be overwritten with valid seeded JSON
        const healedRaw = await fs.readFile(corruptedFile, 'utf-8');
        const healed = JSON.parse(healedRaw);
        expect(Array.isArray(healed.students)).toBe(true);

        // Also verify structurally invalid JSON (missing required arrays) falls back to seed
        const wrongShapeFile = path.join(dir, 'wrong-shape.json');
        await fs.writeFile(
          wrongShapeFile,
          JSON.stringify({ unexpected: true }),
          'utf-8'
        );
        const manager2 = new PersistentShikshaStore(wrongShapeFile, 20);
        const state2 = await manager2.init();
        expect(state2.students.some((s) => s.id === SEED_STUDENT_IDS.AARAV)).toBe(true);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });
  });

  it('debounced write persists automatically after debounce window and resolves default path', async () => {
    await withTempDir(async (dir) => {
      const storeFile = path.join(dir, 'shiksha-debounce.json');
      const manager = new PersistentShikshaStore(storeFile, 40);
      await manager.init();

      manager.getState().dropoutAlerts[0].status = 'Acknowledged';
      manager.scheduleSave();

      await new Promise((resolve) => setTimeout(resolve, 120));

      const raw = await fs.readFile(storeFile, 'utf-8');
      const parsed = JSON.parse(raw);
      expect(parsed.dropoutAlerts[0].status).toBe('Acknowledged');

      const entries = await fs.readdir(dir);
      expect(entries).toEqual(['shiksha-debounce.json']);

      const defaultPath = resolveDefaultStorePath(dir);
      expect(defaultPath).toBe(path.join(dir, 'data', 'shiksha_store.json'));
    });
  });
});
