import fs from 'node:fs/promises';
import path from 'node:path';
import {
  STORE_DEBOUNCE_MS,
  STORE_DIR_NAME,
  STORE_FILE_NAME,
} from '../../shared/config.ts';
import { createSeedStore } from '../../shared/shikshaLogic.ts';
import type { ShikshaStoreState } from '../../shared/types.ts';

/**
 * In-memory application store backed by asynchronous, debounced, atomic JSON persistence.
 *
 * State is loaded once during server startup via {@link init}, mutated synchronously
 * in memory, and persisted through a serialized write queue that writes to a temporary
 * file before atomically renaming it into place.
 */
export class PersistentShikshaStore {
  private readonly filePath: string;
  private readonly debounceMs: number;
  private state: ShikshaStoreState | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private writeQueue: Promise<void> = Promise.resolve();
  private writeSeq = 0;

  /**
   * Creates a new persistent store manager.
   *
   * @param filePath Absolute path to the JSON file on disk.
   * @param debounceMs Coalescing delay in milliseconds before flushing mutations.
   */
  constructor(filePath: string, debounceMs = STORE_DEBOUNCE_MS) {
    this.filePath = filePath;
    this.debounceMs = debounceMs;
  }

  /**
   * Loads persisted state from disk once at startup, or initializes seeded state
   * if the file does not exist or cannot be parsed.
   *
   * @returns The initialized in-memory store state.
   */
  async init(): Promise<ShikshaStoreState> {
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as ShikshaStoreState;
      if (
        Array.isArray(parsed.students) &&
        Array.isArray(parsed.progressLogs) &&
        Array.isArray(parsed.dropoutAlerts)
      ) {
        const seedPhoneMap = createSeedStore().studentPhoneMap ?? {};
        const loadedPhoneMap: Record<string, string> =
          parsed.studentPhoneMap && typeof parsed.studentPhoneMap === 'object'
            ? { ...parsed.studentPhoneMap }
            : {};

        for (const rawStudent of parsed.students as Array<
          (typeof parsed.students)[number] & { whatsappNumber?: string }
        >) {
          if (
            typeof rawStudent.whatsappNumber === 'string' &&
            rawStudent.whatsappNumber.trim().length > 0 &&
            !loadedPhoneMap[rawStudent.id]
          ) {
            loadedPhoneMap[rawStudent.id] = rawStudent.whatsappNumber.trim();
          } else if (!loadedPhoneMap[rawStudent.id] && seedPhoneMap[rawStudent.id]) {
            loadedPhoneMap[rawStudent.id] = seedPhoneMap[rawStudent.id];
          }
        }

        this.state = {
          students: parsed.students.map((s) => ({
            id: s.id,
            name: s.name,
            grade: s.grade,
            board: s.board,
            preferredLanguage: s.preferredLanguage,
          })),
          studentPhoneMap: loadedPhoneMap,
          progressLogs: parsed.progressLogs,
          dropoutAlerts: parsed.dropoutAlerts,
          learningPaths:
            parsed.learningPaths && typeof parsed.learningPaths === 'object'
              ? parsed.learningPaths
              : {},
        };
        return this.state;
      }
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? (err as { code?: unknown }).code
          : undefined;
      if (code !== 'ENOENT') {
        console.error(
          'Failed to load store from disk at startup, initializing seed state:',
          err
        );
      }
    }

    this.state = createSeedStore();
    await this.enqueueWrite();
    return this.state;
  }

  /**
   * Returns the live in-memory store state synchronously.
   *
   * @returns Current {@link ShikshaStoreState}.
   */
  getState(): ShikshaStoreState {
    if (!this.state) {
      this.state = createSeedStore();
    }
    return this.state;
  }

  /**
   * Schedules a debounced background persistence write. Multiple rapid calls
   * within {@link debounceMs} are coalesced into a single atomic disk write.
   */
  scheduleSave(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.enqueueWrite();
    }, this.debounceMs);
  }

  /**
   * Immediately cancels any pending debounce timer and awaits completion of all
   * queued persistence writes. Intended for graceful server shutdown and tests.
   */
  async flush(): Promise<void> {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
      await this.enqueueWrite();
      return;
    }
    await this.writeQueue;
  }

  private enqueueWrite(): Promise<void> {
    const task = this.writeQueue.then(() => this.atomicWriteSnapshot());
    // Keep queue alive even if a single disk write fails
    this.writeQueue = task.catch((err) => {
      console.error('Failed to persist store to disk, keeping in-memory state:', err);
    });
    return this.writeQueue;
  }

  private async atomicWriteSnapshot(): Promise<void> {
    if (!this.state) return;
    const dir = path.dirname(this.filePath);
    const serialized = JSON.stringify(this.state, null, 2);
    const tmpPath = `${this.filePath}.${process.pid}.${Date.now()}.${++this.writeSeq}.tmp`;

    await fs.mkdir(dir, { recursive: true });
    try {
      await fs.writeFile(tmpPath, serialized, 'utf-8');
      await fs.rename(tmpPath, this.filePath);
    } catch (err) {
      await fs.unlink(tmpPath).catch(() => {});
      throw err;
    }
  }
}

/**
 * Resolves the default on-disk path for the JSON store file.
 *
 * @param baseDir Optional base working directory (defaults to `process.cwd()`).
 * @returns Absolute path to the JSON store file.
 */
export function resolveDefaultStorePath(baseDir = process.cwd()): string {
  return path.join(path.resolve(baseDir, STORE_DIR_NAME), STORE_FILE_NAME);
}
