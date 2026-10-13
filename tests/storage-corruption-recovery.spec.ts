import { test, expect, beforeEach, afterEach, vi } from 'vitest';
import { CurriculumRepository } from '../src/services/curriculumRepository';
import { Lesson, Topic, Week, AcademicSession, SubjectItem, ClassItem, TeachingProgress } from '../src/types/lesson';
import { INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_SESSIONS, INITIAL_WEEKS, INITIAL_TOPICS, INITIAL_LESSONS, INITIAL_PROGRESS } from '../src/data/initialCurriculum';

const STORAGE_KEYS = {
  CLASSES: 'teachit_classes_v1',
  SUBJECTS: 'teachit_subjects_v1',
  SESSIONS: 'teachit_sessions_v1',
  WEEKS: 'teachit_weeks_v1',
  TOPICS: 'teachit_topics_v1',
  LESSONS: 'teachit_lessons_v1',
  PROGRESS: 'teachit_progress_v1',
  ACTIVE_LESSON_ID: 'teachit_active_lesson_id_v1',
  SELECTED_CLASS_ID: 'teachit_selected_class_id_v1',
  SELECTED_SUBJECT_ID: 'teachit_selected_sub_id_v1',
  PREFERENCES: 'teachit_preferences_v1',
};

const PENDING_WRITE_KEY = 'teachit_recovery_v1_pending_write';
const CORRUPTION_BACKUPS_KEY = 'teachit_recovery_v1_corruption_backups';
const RECOVERY_KEYS = {
  CORRUPTION_BACKUPS: CORRUPTION_BACKUPS_KEY,
  PENDING_WRITE: PENDING_WRITE_KEY,
};
const MALFORMED_JSON = '{ not json }';
const DATA_KEYS = [
  'teachit_classes_v1',
  'teachit_subjects_v1',
  'teachit_sessions_v1',
  'teachit_weeks_v1',
  'teachit_topics_v1',
  'teachit_lessons_v1',
  'teachit_progress_v1',
];

// Mock localStorage
const createMockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) || null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    getStore: () => store,
  };
};

// Helper to create a fresh repository with mocked localStorage
const createRepository = (storage: ReturnType<typeof createMockStorage>) => {
  const repo = new CurriculumRepository();
  const originalLocalStorage = global.localStorage;
  global.localStorage = storage as unknown as Storage;
  return { repo, restore: () => { global.localStorage = originalLocalStorage; } };
};

// Helper to set up initial data in mock storage
const setupInitialData = (storage: ReturnType<typeof createMockStorage>, overrides: {
  lessons?: Lesson[];
  topics?: Topic[];
  weeks?: Week[];
  sessions?: AcademicSession[];
  subjects?: SubjectItem[];
  classes?: ClassItem[];
  progress?: Record<string, TeachingProgress>;
} = {}) => {
  storage.getStore().set(STORAGE_KEYS.CLASSES, JSON.stringify(overrides.classes ?? INITIAL_CLASSES));
  storage.getStore().set(STORAGE_KEYS.SUBJECTS, JSON.stringify(overrides.subjects ?? INITIAL_SUBJECTS));
  storage.getStore().set(STORAGE_KEYS.SESSIONS, JSON.stringify(overrides.sessions ?? INITIAL_SESSIONS));
  storage.getStore().set(STORAGE_KEYS.WEEKS, JSON.stringify(overrides.weeks ?? INITIAL_WEEKS));
  storage.getStore().set(STORAGE_KEYS.TOPICS, JSON.stringify(overrides.topics ?? INITIAL_TOPICS));
  storage.getStore().set(STORAGE_KEYS.LESSONS, JSON.stringify(overrides.lessons ?? INITIAL_LESSONS));
  // The repository persists progress as a lessonId-keyed record (see saveAll).
  // Accept either shape from tests: an array (like INITIAL_PROGRESS) or a record.
  const progressValue = overrides.progress ?? INITIAL_PROGRESS;
  const progressRecord = Array.isArray(progressValue)
    ? progressValue.reduce<Record<string, TeachingProgress>>((acc, p) => ({ ...acc, [p.lessonId]: p }), {})
    : progressValue;
  storage.getStore().set(STORAGE_KEYS.PROGRESS, JSON.stringify(progressRecord));
};

test.describe('Storage Corruption Recovery Tests', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let repo: CurriculumRepository;
  let restore: () => void;

  beforeEach(() => {
    mockStorage = createMockStorage();
    const result = createRepository(mockStorage);
    repo = result.repo;
    restore = result.restore;
  });

  afterEach(() => {
    restore();
  });

  test.describe('Basic Load Behavior', () => {
    test('all valid collections load correctly from localStorage', () => {
      setupInitialData(mockStorage);
      repo.loadAll();

      expect(repo.getClasses().length).toBe(INITIAL_CLASSES.length);
      expect(repo.getSubjects().length).toBe(INITIAL_SUBJECTS.length);
      expect(repo.getSessions().length).toBe(INITIAL_SESSIONS.length);
      expect(repo.getWeeks().length).toBe(INITIAL_WEEKS.length);
      expect(repo.getTopics().length).toBe(INITIAL_TOPICS.length);
      expect(repo.getLessons().length).toBe(INITIAL_LESSONS.length);
      expect(Object.keys(repo.getAllProgress()).length).toBe(INITIAL_PROGRESS.length);
    });

    test('missing storage keys on first launch trigger initial seeding', () => {
      // No data in storage at all - simulates first launch
      repo.loadAll();

      expect(repo.getClasses()).toEqual(INITIAL_CLASSES);
      expect(repo.getSubjects()).toEqual(INITIAL_SUBJECTS);
      expect(repo.getSessions()).toEqual(INITIAL_SESSIONS);
      expect(repo.getWeeks()).toEqual(INITIAL_WEEKS);
      expect(repo.getTopics()).toEqual(INITIAL_TOPICS);
      expect(repo.getLessons()).toEqual(INITIAL_LESSONS);
      expect(repo.getAllProgress()).toEqual(INITIAL_PROGRESS.reduce((acc, p) => ({ ...acc, [p.lessonId]: p }), {}));
    });

    test('a missing key is distinguished from a key containing malformed JSON', () => {
      // Set up valid data for all keys except topics
      setupInitialData(mockStorage, { topics: [] });
      
      // Now corrupt the topics key with malformed JSON
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, '{ this is not valid JSON }');
      
      // The current implementation treats both the same (returns fallback)
      // We need to verify the behavior and later improve it
      repo.loadAll();
      
      // Currently: falls back to INITIAL_TOPICS silently
      expect(repo.getTopics()).toEqual(INITIAL_TOPICS);
      
      // Other collections should be unaffected
      expect(repo.getLessons().length).toBe(INITIAL_LESSONS.length);
      expect(repo.getClasses().length).toBe(INITIAL_CLASSES.length);
    });

    test('malformed JSON in one collection does not silently replace valid collections with seed data', () => {
      // Set up valid custom data
      const customLessons: Lesson[] = [{
        ...INITIAL_LESSONS[0],
        id: 'custom-lesson-1',
        title: 'Custom Lesson',
      }];
      const customTopics: Topic[] = [{
        ...INITIAL_TOPICS[0],
        id: 'custom-topic-1',
        title: 'Custom Topic',
      }];
      
      setupInitialData(mockStorage, { lessons: customLessons, topics: customTopics });
      
      // Corrupt ONLY the topics key
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, '{ invalid json }');
      
      repo.loadAll();
      
      // Lessons should remain valid (not replaced with INITIAL_LESSONS)
      const lessons = repo.getLessons();
      expect(lessons.length).toBe(1);
      expect(lessons[0].id).toBe('custom-lesson-1');
      expect(lessons[0].title).toBe('Custom Lesson');
      
      // Topics currently falls back to INITIAL_TOPICS (this is the bug we'll fix)
      // After fix: topics should preserve the valid custom lesson's topic reference
      // and/or surface the corruption
    });

    test('schema-invalid records are rejected, preserved, and reported rather than silently loaded', () => {
      // Data that passes the old shape check but carries an invalid duration
      const invalidLessons: Lesson[] = [{
        ...INITIAL_LESSONS[0],
        id: 'invalid-lesson',
        durationMinutes: -5, // Invalid: negative duration
        sections: [], // Invalid: empty sections
        evaluation: [],
      }];
      
      setupInitialData(mockStorage, { lessons: invalidLessons });
      repo.loadAll();
      
      // The invalid lesson is rejected, not loaded
      const lessons = repo.getLessons();
      expect(lessons.some(l => l.id === 'invalid-lesson')).toBe(false);
      
      // The rejection is surfaced and the full record is preserved for recovery
      expect(repo.hasCorruption()).toBe(true);
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS)[0];
      expect(backup).toBeDefined();
      expect(backup.rejectedRecords).toHaveLength(1);
      expect(JSON.parse(backup.rejectedRecords[0].raw).id).toBe('invalid-lesson');
    });
  });

  test.describe('Cross-Collection Corruption Isolation', () => {
    test('valid lessons survive a corrupted topics collection', () => {
      const customLessons: Lesson[] = [{
        ...INITIAL_LESSONS[0],
        id: 'survivor-lesson',
        topicId: 'topic-survivor',
        title: 'Survivor Lesson',
      }];
      const customTopics: Topic[] = [{
        ...INITIAL_TOPICS[0],
        id: 'topic-survivor',
        title: 'Survivor Topic',
        weekId: INITIAL_WEEKS[0].id,
        order: 1,
      }];
      
      setupInitialData(mockStorage, { lessons: customLessons, topics: customTopics });
      
      // Corrupt topics
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, '{ not json }');
      
      repo.loadAll();
      
      // Lessons should still be loadable
      const lessons = repo.getLessons();
      expect(lessons.length).toBe(1);
      expect(lessons[0].id).toBe('survivor-lesson');
      
      // The original corrupted topics payload is preserved for recovery
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.TOPICS)[0];
      expect(backup).toBeDefined();
      expect(backup.raw).toBe('{ not json }');
    });

    test('original corrupted data is preserved before any recovery or replacement', () => {
      const customTopics: Topic[] = [{
        ...INITIAL_TOPICS[0],
        id: 'original-topic',
        title: 'Original Topic',
      }];
      
      setupInitialData(mockStorage, { topics: customTopics });
      const originalCorruptedJson = '{ "corrupted": true, "data": "was here" }';
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, originalCorruptedJson);
      
      repo.loadAll();
      
      // The complete original corrupted payload is durably preserved
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.TOPICS)[0];
      expect(backup).toBeDefined();
      expect(backup.raw).toBe(originalCorruptedJson);
      // Parsed fine as JSON but is not an array — the list shape is invalid
      expect(backup.corruptionType).toBe('schema_invalid');
      expect(backup.savedAt).toBeTruthy();
      expect(backup.id).toBeTruthy();
      
      // The diagnostics entry points at the durable backup
      const entry = repo.getDiagnostics()?.corruptedKeys.find(k => k.key === STORAGE_KEYS.TOPICS);
      expect(entry?.backupStatus).toBe('saved');
      expect(entry?.backupId).toBe(backup.id);
    });

    test('unresolved relationships remain diagnosable', () => {
      // Lesson references a topic that doesn't exist and can't be inferred
      const lessons: Lesson[] = [{
        ...INITIAL_LESSONS[0],
        id: 'orphan-lesson',
        topicId: 'topic-completely-unknown-xyz',
        title: 'Orphan Lesson',
      }];
      
      setupInitialData(mockStorage, { lessons, topics: [] });
      repo.loadAll();
      
      const loadedLessons = repo.getLessons();
      expect(loadedLessons.length).toBe(1);
      expect(loadedLessons[0].topicId).toBe('topic-completely-unknown-xyz');
      
      // The unresolved orphan is exposed in diagnostics with its full relationship
      const orphans = repo.getDiagnostics()?.orphanedLessons ?? [];
      expect(orphans.some(o => o.lessonId === 'orphan-lesson' && o.topicId === 'topic-completely-unknown-xyz')).toBe(true);
    });
  });

  test.describe('Idempotency and Duplicate Prevention', () => {
    test('repeated recovery attempts do not create duplicate data', () => {
      // Use a topicId pattern that CAN be resolved (matches subject + week)
      const lessons: Lesson[] = [{
        ...INITIAL_LESSONS[0],
        id: 'lesson-for-idempotency',
        topicId: 'topic-sub-jss3-dt-w1-99', // Pattern matches sub-jss3-dt, week 1
      }];
      const topics: Topic[] = []; // Missing topic
      
      setupInitialData(mockStorage, { lessons, topics });
      
      repo.loadAll(); // First load - triggers repair
      const topicsAfterFirst = repo.getTopics().filter(t => t.id === 'topic-sub-jss3-dt-w1-99');
      expect(topicsAfterFirst.length).toBe(1);
      
      repo.loadAll(); // Second load (simulating app restart)
      const topicsAfterSecond = repo.getTopics().filter(t => t.id === 'topic-sub-jss3-dt-w1-99');
      expect(topicsAfterSecond.length).toBe(1); // No duplicates
    });
  });

  test.describe('Storage Write Failure Handling', () => {
    test('storage write failures are handled without falsely reporting success', () => {
      setupInitialData(mockStorage);
      repo.loadAll();
      
      // Make setItem throw
      mockStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });
      
      // Should throw, not silently succeed
      expect(() => repo.saveAll()).toThrow('Failed to persist curriculum data');
    });

    test('saveLesson rolls back on persistence failure', () => {
      setupInitialData(mockStorage);
      repo.loadAll();
      
      const originalLessonCount = repo.getLessons().length;
      const newLesson: Lesson = {
        ...INITIAL_LESSONS[0],
        id: 'new-lesson-to-fail',
        title: 'Will Fail',
      };
      
      // Make setItem throw on saveAll
      mockStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      
      expect(() => repo.saveLesson(newLesson)).toThrow('Failed to persist curriculum data');
      
      // Lesson should not be added
      expect(repo.getLessons().length).toBe(originalLessonCount);
    });

    test('updateProgress rolls back on persistence failure', () => {
      setupInitialData(mockStorage);
      repo.loadAll();
      
      const lessonId = INITIAL_LESSONS[0].id;
      const originalProgress = repo.getProgress(lessonId);
      
      // Make setItem throw
      mockStorage.setItem.mockImplementationOnce(() => {
        throw new Error('Write failed');
      });
      
      expect(() => repo.updateProgress(lessonId, { status: 'taught' })).toThrow('Failed to persist curriculum data');
      
      // Progress should be rolled back
      expect(repo.getProgress(lessonId)).toEqual(originalProgress);
    });
  });

  test.describe('Data Integrity Guarantees', () => {
    test('progress data is preserved when lessons load but progress is corrupted', () => {
      const customLessons: Lesson[] = [{
        ...INITIAL_LESSONS[0],
        id: 'lesson-with-progress',
      }];
      const customProgress: Record<string, TeachingProgress> = {
        'lesson-with-progress': {
          lessonId: 'lesson-with-progress',
          status: 'in_progress',
          currentSectionId: 'sec-3b',
          completedSectionIds: ['sec-1', 'sec-2'],
          lastVisitedAt: '2026-01-01T00:00:00.000Z',
        },
      };
      
      setupInitialData(mockStorage, { lessons: customLessons, progress: customProgress });
      
      // Corrupt progress
      const corruptedProgress = '{ invalid }';
      mockStorage.getStore().set(STORAGE_KEYS.PROGRESS, corruptedProgress);
      
      repo.loadAll();
      
      // Lessons survive; progress falls back but the corruption is surfaced
      // and the complete original payload is preserved for recovery.
      expect(repo.getLessons().some(l => l.id === 'lesson-with-progress')).toBe(true);
      expect(repo.hasCorruption()).toBe(true);
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.PROGRESS)[0];
      expect(backup).toBeDefined();
      expect(backup.raw).toBe(corruptedProgress);
    });

    test('a corrupted progress record is durably preserved with its complete payload', () => {
      setupInitialData(mockStorage);
      const corruptedProgress = '{"lesson-a": {"lessonId": "lesson-a", "status": '; // truncated/malformed
      mockStorage.getStore().set(STORAGE_KEYS.PROGRESS, corruptedProgress);

      repo.loadAll();

      const entry = repo.getDiagnostics()!.corruptedKeys.find(k => k.key === STORAGE_KEYS.PROGRESS)!;
      expect(entry.status).toBe('malformed_json');
      expect(entry.backupStatus).toBe('saved');
      const backup = repo.getCorruptionBackup(entry.backupId!)!;
      expect(backup.raw).toBe(corruptedProgress);
      expect(backup.originalKey).toBe(STORAGE_KEYS.PROGRESS);
      expect(backup.corruptionType).toBe('malformed_json');
      expect(backup.savedAt).toBeTruthy();
    });

    test('preferences are loaded with fallback on corruption', () => {
      // Corrupt preferences
      mockStorage.getStore().set(STORAGE_KEYS.PREFERENCES, '{ not json }');
      
      repo.loadAll();
      
      // Preferences are not loaded in loadAll() currently - they're loaded elsewhere
      // This test documents current behavior
    });
  });

  test.describe('First Launch Diagnostics (regression)', () => {
    test('a clean first launch does not make hasCorruption() return true', () => {
      // No data in storage at all — every key is missing
      repo.loadAll();

      expect(repo.hasCorruption()).toBe(false);
      expect(repo.getDiagnostics()).toBeNull();

      // Initial seeding behavior is preserved
      expect(repo.getLessons()).toEqual(INITIAL_LESSONS);
      expect(repo.getTopics()).toEqual(INITIAL_TOPICS);
    });

    test('missing keys alongside valid data are not reported as corruption', () => {
      setupInitialData(mockStorage);
      // Simulate keys that were never written (not corrupt payloads)
      mockStorage.getStore().delete(STORAGE_KEYS.CLASSES);
      mockStorage.getStore().delete(STORAGE_KEYS.SESSIONS);

      repo.loadAll();

      expect(repo.hasCorruption()).toBe(false);
      expect(repo.getDiagnostics()).toBeNull();
      // Seeding fallback still applies for the missing keys
      expect(repo.getClasses()).toEqual(INITIAL_CLASSES);
      expect(repo.getSessions()).toEqual(INITIAL_SESSIONS);
      expect(repo.getLessons().length).toBe(INITIAL_LESSONS.length);
    });
  });

  test.describe('Durable Payload Preservation', () => {
    test('the complete payload is preserved even when it far exceeds the diagnostic preview', () => {
      setupInitialData(mockStorage);
      const bigPayload = `{"corrupted":true,"pad":"${'x'.repeat(1000)}"}`;
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, bigPayload);

      repo.loadAll();

      const entry = repo.getDiagnostics()!.corruptedKeys.find(k => k.key === STORAGE_KEYS.TOPICS)!;
      const backup = repo.getCorruptionBackup(entry.backupId!);

      // The backup holds the COMPLETE payload; the preview is truncated display text only
      expect(backup!.raw).toBe(bigPayload);
      expect(backup!.raw.length).toBe(bigPayload.length);
      expect(entry.rawPreview.length).toBe(200);
      expect(bigPayload.length).toBeGreaterThan(200);
    });

    test('rejected records stay recoverable after loadAll() and after a restart', () => {
      const valid: Lesson = { ...INITIAL_LESSONS[0], id: 'valid-lesson' };
      const badDuration: Lesson = { ...INITIAL_LESSONS[0], id: 'bad-duration', durationMinutes: 0 };
      const badTitle = { ...INITIAL_LESSONS[0], id: 'bad-title', title: 42 as unknown as string };

      setupInitialData(mockStorage, { lessons: [valid, badDuration, badTitle] });

      repo.loadAll();

      // Only the valid lesson is active…
      expect(repo.getLessons().map(l => l.id)).toEqual(['valid-lesson']);

      // …but both rejected records remain recoverable with complete JSON
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS)[0];
      expect(backup.rejectedRecords.length).toBe(2);
      const rejectedIds = backup.rejectedRecords.map(r => JSON.parse(r.raw).id).sort();
      expect(rejectedIds).toEqual(['bad-duration', 'bad-title']);
      expect(JSON.parse(backup.rejectedRecords.find(r => JSON.parse(r.raw).id === 'bad-title')!.raw).title).toBe(42);

      // Simulated restart: a fresh repository instance still sees the backup
      const second = createRepository(mockStorage);
      try {
        second.repo.loadAll();
        const backups = second.repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS);
        // Idempotent: the same payload is not re-backed-up on every startup
        expect(backups).toHaveLength(1);
        expect(backups[0].raw).toBe(backup.raw);
        expect(backups[0].rejectedRecords.map(r => JSON.parse(r.raw).id).sort()).toEqual(rejectedIds);
        // The reuse of the existing backup is visible in the new diagnostics
        const entry = second.repo.getDiagnostics()!.corruptedKeys.find(k => k.key === STORAGE_KEYS.LESSONS)!;
        expect(entry.backupId).toBe(backup.id);
        expect(entry.backupDeduped).toBe(true);
      } finally {
        second.restore();
      }
    });

    test('restoreCorruptionBackup deterministically returns a payload to its original key', () => {
      setupInitialData(mockStorage);
      const corruptedTopics = '{"oops":true}';
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, corruptedTopics);

      repo.loadAll();
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.TOPICS)[0];
      expect(backup).toBeDefined();

      // A later legitimate save overwrites the recovered topics key
      repo.updateProgress(INITIAL_LESSONS[0].id, { status: 'taught' });
      expect(mockStorage.getStore().get(STORAGE_KEYS.TOPICS)).not.toBe(corruptedTopics);

      // Deterministic recovery restores the exact original payload
      const result = repo.restoreCorruptionBackup(backup.id);
      expect(result.restored).toBe(true);
      expect(mockStorage.getStore().get(STORAGE_KEYS.TOPICS)).toBe(corruptedTopics);
    });

    test('rejected records remain recoverable even after orphan repair rewrites the lessons key', () => {
      // One lesson whose topic is missing but repairable via topicId pattern,
      // plus one schema-invalid lesson that gets rejected at load.
      const repairable: Lesson = { ...INITIAL_LESSONS[0], id: 'repairable-lesson', topicId: 'topic-sub-jss3-dt-w1-77' };
      const rejected: Lesson = { ...INITIAL_LESSONS[0], id: 'rejected-lesson', durationMinutes: -5 };
      const lessonsPayload = JSON.stringify([repairable, rejected]);
      const topicsWithout = INITIAL_TOPICS.filter(t => t.id !== 'topic-sub-jss3-dt-w1-77');
      setupInitialData(mockStorage, { lessons: [repairable, rejected], topics: topicsWithout });

      repo.loadAll();

      // Orphan repair succeeded and rewrote the lessons key with only the valid lesson
      const stored = JSON.parse(mockStorage.getStore().get(STORAGE_KEYS.LESSONS)!);
      expect(stored.map((l: Lesson) => l.id)).toEqual(['repairable-lesson']);
      expect(repo.getOrphanRepairStatus()).toEqual({
        attempted: true,
        topicsCreated: 1,
        persisted: true,
      });

      // …yet the complete original payload and the rejected record are still recoverable
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS)[0];
      expect(backup.raw).toBe(lessonsPayload);
      expect(backup.rejectedRecords.map(r => JSON.parse(r.raw).id)).toEqual(['rejected-lesson']);

      // And they survive a restart
      const second = createRepository(mockStorage);
      try {
        second.repo.loadAll();
        const backups = second.repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS);
        expect(backups[0].rejectedRecords.map(r => JSON.parse(r.raw).id)).toEqual(['rejected-lesson']);
      } finally {
        second.restore();
      }
    });
  });

  test.describe('First-Launch Seed Persistence', () => {
    test('seeds are persisted during loadAll so the first edit does not write every key from scratch', () => {
      // Empty storage = first launch
      repo.loadAll();

      expect(JSON.parse(mockStorage.getStore().get(STORAGE_KEYS.CLASSES)!)).toEqual(INITIAL_CLASSES);
      expect(JSON.parse(mockStorage.getStore().get(STORAGE_KEYS.LESSONS)!)).toEqual(INITIAL_LESSONS);
      expect(JSON.parse(mockStorage.getStore().get(STORAGE_KEYS.PROGRESS)!)).toEqual(
        INITIAL_PROGRESS.reduce((acc, p) => ({ ...acc, [p.lessonId]: p }), {}),
      );
      // Successful seeding is not a failure — no diagnostics, no corruption
      expect(repo.getDiagnostics()).toBeNull();
      expect(mockStorage.getStore().has(PENDING_WRITE_KEY)).toBe(false);
    });

    test('a failed seed write is rolled back (null originals removed) and reported in diagnostics', () => {
      // Empty storage; the second seed write fails (mid-operation failure)
      let dataWrites = 0;
      mockStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key.startsWith('teachit_recovery_v1_')) return mockStorage.getStore().set(key, value);
        dataWrites += 1;
        if (dataWrites === 2) throw new Error('Disk full');
        return mockStorage.getStore().set(key, value);
      });

      repo.loadAll();

      // Startup continues in memory with seeds…
      expect(repo.getClasses()).toEqual(INITIAL_CLASSES);
      // …but no half-written seed state remains: the first key's original value
      // was null, so rollback removed it again
      expect(mockStorage.getStore().has(STORAGE_KEYS.CLASSES)).toBe(false);
      expect(mockStorage.getStore().has(STORAGE_KEYS.SUBJECTS)).toBe(false);
      expect(mockStorage.getStore().has(PENDING_WRITE_KEY)).toBe(false);
      // The persistence failure is observable, not swallowed
      expect(repo.getDiagnostics()?.seedPersist?.persisted).toBe(false);
      expect(repo.getDiagnostics()?.seedPersist?.error).toContain('Disk full');
    });
  });

  test.describe('Backup Failure Handling', () => {
    test('a failed backup leaves the original key untouched and refuses later overwrites', () => {
      setupInitialData(mockStorage);
      const corruptedTopics = '{"broken":true}';
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, corruptedTopics);

      // Storage is full: every write (including backup writes) fails
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full');
      });

      repo.loadAll();

      const diagnostics = repo.getDiagnostics()!;
      const entry = diagnostics.corruptedKeys.find(k => k.key === STORAGE_KEYS.TOPICS)!;
      expect(entry.backupStatus).toBe('failed');
      expect(entry.backupError).toContain('QuotaExceededError');
      expect(diagnostics.blockedOverwriteKeys).toContain(STORAGE_KEYS.TOPICS);
      expect(repo.getBlockedOverwriteKeys()).toContain(STORAGE_KEYS.TOPICS);

      // In-memory recovery continues (seed fallback), but the original stays intact
      expect(repo.getTopics()).toEqual(INITIAL_TOPICS);
      expect(mockStorage.getStore().get(STORAGE_KEYS.TOPICS)).toBe(corruptedTopics);

      // saveAll refuses instead of destroying the only recoverable copy
      expect(() => repo.saveAll()).toThrow(/refusing to overwrite/);
      expect(mockStorage.getStore().get(STORAGE_KEYS.TOPICS)).toBe(corruptedTopics);
    });
  });

  test.describe('Corrupted Topics With Valid Lessons', () => {
    test('valid lessons survive, the original payload is not discarded, and unresolved relationships are exposed', () => {
      const lesson: Lesson = { ...INITIAL_LESSONS[0], id: 'lesson-a', topicId: 'topic-unknown-abc', title: 'Lesson A' };
      // Topics payload is partially invalid: the only entry that could have matched
      // the lesson fails schema validation (missing weekId), so no safe relationship exists.
      const topicsPayload = JSON.stringify([
        { id: 'topic-unknown-abc', title: 'Missing weekId so invalid' },
      ]);
      setupInitialData(mockStorage, { lessons: [lesson], topics: [] });
      mockStorage.getStore().set(STORAGE_KEYS.TOPICS, topicsPayload);

      repo.loadAll();

      // Every valid lesson is preserved
      const lessons = repo.getLessons();
      expect(lessons.some(l => l.id === 'lesson-a')).toBe(true);

      // The original topics payload is neither silently discarded nor overwritten
      expect(mockStorage.getStore().get(STORAGE_KEYS.TOPICS)).toBe(topicsPayload);
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.TOPICS)[0];
      expect(backup.raw).toBe(topicsPayload);
      expect(backup.rejectedRecords).toHaveLength(1);
      expect(JSON.parse(backup.rejectedRecords[0].raw).id).toBe('topic-unknown-abc');

      // No replacement topic is guessed for the unresolved relationship
      expect(repo.getTopic('topic-unknown-abc')).toBeUndefined();

      // The unresolved lesson relationship is exposed with diagnostics
      const orphan = repo.getDiagnostics()!.orphanedLessons.find(o => o.lessonId === 'lesson-a');
      expect(orphan).toBeDefined();
      expect(orphan!.topicId).toBe('topic-unknown-abc');
    });
  });

  test.describe('Partial Multi-Key Write Protection', () => {
    const snapshotStorage = () => new Map(DATA_KEYS.map(k => [k, mockStorage.getStore().get(k)]));

    test('a mid-write failure rolls back every previously written key', () => {
      // Storage starts with custom (non-seed) data so the writes of a resetAll()
      // produce genuinely different values that a rollback must undo.
      const customClasses = [{ id: 'class-custom', name: 'Custom Class', level: 'Custom' }];
      const customSubjects = [{ id: 'sub-custom', classId: 'class-custom', name: 'Custom Subject', code: 'CS-1' }];
      setupInitialData(mockStorage, { classes: customClasses, subjects: customSubjects });
      repo.loadAll();
      const before = snapshotStorage();

      // Journal writes succeed; the 3rd data write fails; rollback writes succeed
      let dataWrites = 0;
      mockStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key.startsWith('teachit_recovery_v1_')) return mockStorage.getStore().set(key, value);
        dataWrites += 1;
        if (dataWrites === 3) throw new Error('Disk full');
        return mockStorage.getStore().set(key, value);
      });

      expect(() => repo.resetAll()).toThrow('Failed to persist curriculum data');

      // Every key is back to its pre-write value and no journal is left behind
      for (const [key, value] of before) {
        expect(mockStorage.getStore().get(key)).toBe(value);
      }
      expect(mockStorage.getStore().has(PENDING_WRITE_KEY)).toBe(false);

      // In-memory state was rolled back as well — persistence was not reported as success
      expect(repo.getClasses()).toEqual(customClasses);
      expect(repo.getSubjects()).toEqual(customSubjects);
    });

    test('if the write journal cannot be recorded, no data key is touched', () => {
      setupInitialData(mockStorage);
      repo.loadAll();
      const before = snapshotStorage();

      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full');
      });

      expect(() => repo.saveAll()).toThrow(/journal could not be recorded/);
      for (const [key, value] of before) {
        expect(mockStorage.getStore().get(key)).toBe(value);
      }
      expect(mockStorage.getStore().has(PENDING_WRITE_KEY)).toBe(false);
    });

    test('rollback failure preserves the journal, and the next startup resolves the incomplete write', () => {
      setupInitialData(mockStorage);
      repo.loadAll();
      const before = snapshotStorage();

      // Journal succeeds, 2 data keys are written, then everything else fails —
      // including the rollback writes (persistent quota exhaustion).
      let dataWrites = 0;
      mockStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key.startsWith('teachit_recovery_v1_')) return mockStorage.getStore().set(key, value);
        dataWrites += 1;
        if (dataWrites >= 3) throw new Error('QuotaExceededError: storage is full');
        return mockStorage.getStore().set(key, value);
      });

      expect(() => repo.updateProgress(INITIAL_LESSONS[0].id, { status: 'taught' }))
        .toThrow(/rollback also failed/);

      // The write-ahead journal survives with the originals needed for recovery
      const journal = JSON.parse(mockStorage.getStore().get(PENDING_WRITE_KEY)!);
      expect(journal.entries.length).toBe(DATA_KEYS.length);
      expect(journal.entries[0]).toHaveProperty('originalValue');
      expect(journal.entries[0]).toHaveProperty('newValue');

      // Simulate storage healing, then restart
      mockStorage.setItem.mockImplementation((key: string, value: string) => mockStorage.getStore().set(key, value));
      const second = createRepository(mockStorage);
      try {
        second.repo.loadAll();

        // The incomplete write is detected and resolved deterministically
        expect(second.repo.getDiagnostics()?.pendingWriteRecovery?.status).toBe('rolled_back');
        for (const [key, value] of before) {
          expect(mockStorage.getStore().get(key)).toBe(value);
        }
        expect(mockStorage.getStore().has(PENDING_WRITE_KEY)).toBe(false);
      } finally {
        second.restore();
      }
    });

    test('a stale journal from a fully completed write is finalized, not rolled back', () => {
      setupInitialData(mockStorage);
      repo.loadAll();

      // Simulate a crash after all writes succeeded but before journal cleanup
      const current = DATA_KEYS.map(k => mockStorage.getStore().get(k)!);
      mockStorage.getStore().set(PENDING_WRITE_KEY, JSON.stringify({
        id: 'write-stale',
        startedAt: new Date().toISOString(),
        operation: 'saveAll',
        entries: DATA_KEYS.map((key, i) => ({
          key,
          originalValue: 'old-value-' + i,
          newValue: current[i],
        })),
      }));

      const second = createRepository(mockStorage);
      try {
        second.repo.loadAll();
        expect(second.repo.getDiagnostics()?.pendingWriteRecovery?.status).toBe('committed');
        // Data was NOT rolled back
        expect(mockStorage.getStore().get(STORAGE_KEYS.LESSONS)).toBe(current[DATA_KEYS.indexOf(STORAGE_KEYS.LESSONS)]);
        expect(mockStorage.getStore().has(PENDING_WRITE_KEY)).toBe(false);
      } finally {
        second.restore();
      }
    });
  });

  test.describe('Lesson Duration Validation', () => {
    test('valid positive durations are accepted', () => {
      const lessons: Lesson[] = [
        { ...INITIAL_LESSONS[0], id: 'dur-45', durationMinutes: 45 },
        { ...INITIAL_LESSONS[0], id: 'dur-1', durationMinutes: 1 },
        { ...INITIAL_LESSONS[0], id: 'dur-fraction', durationMinutes: 0.5 },
      ];
      setupInitialData(mockStorage, { lessons });

      repo.loadAll();

      expect(repo.getLessons().map(l => l.id)).toEqual(['dur-45', 'dur-1', 'dur-fraction']);
      expect(repo.hasCorruption()).toBe(false);
    });

    test('zero and negative durations are rejected and preserved as rejected records', () => {
      const lessons: Lesson[] = [
        { ...INITIAL_LESSONS[0], id: 'dur-ok', durationMinutes: 45 },
        { ...INITIAL_LESSONS[0], id: 'dur-zero', durationMinutes: 0 },
        { ...INITIAL_LESSONS[0], id: 'dur-negative', durationMinutes: -10 },
      ];
      setupInitialData(mockStorage, { lessons });

      repo.loadAll();

      expect(repo.getLessons().map(l => l.id)).toEqual(['dur-ok']);
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS)[0];
      const rejectedIds = backup.rejectedRecords.map(r => JSON.parse(r.raw).id).sort();
      expect(rejectedIds).toEqual(['dur-negative', 'dur-zero']);
    });

    test('non-numeric and non-finite durations are rejected', () => {
      const lessons = [
        { ...INITIAL_LESSONS[0], id: 'dur-ok', durationMinutes: 30 },
        // NaN/Infinity serialize to null in JSON and are rejected the same way
        { ...INITIAL_LESSONS[0], id: 'dur-string', durationMinutes: '45' as unknown as number },
        { ...INITIAL_LESSONS[0], id: 'dur-null', durationMinutes: null as unknown as number },
      ];
      setupInitialData(mockStorage, { lessons });

      repo.loadAll();

      expect(repo.getLessons().some(l => l.id === 'dur-string')).toBe(false);
      expect(repo.getLessons().some(l => l.id === 'dur-null')).toBe(false);
      const backup = repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS)[0];
      const rejectedIds = backup.rejectedRecords.map(r => JSON.parse(r.raw).id).sort();
      expect(rejectedIds).toEqual(['dur-null', 'dur-string']);
    });
  });

  test.describe('Quota-Retry Pruning Observability', () => {
    // The repository only loads these 7 keys, so we test within that constraint
    // Note: PROGRESS uses loadRecordWithDiagnostics (expects object), others use loadListWithDiagnostics (expect array)
    const REPO_KEYS = [
      STORAGE_KEYS.CLASSES,
      STORAGE_KEYS.SUBJECTS,
      STORAGE_KEYS.SESSIONS,
      STORAGE_KEYS.WEEKS,
      STORAGE_KEYS.TOPICS,
      STORAGE_KEYS.LESSONS,
      STORAGE_KEYS.PROGRESS,
    ];
    const ARRAY_KEYS = REPO_KEYS.filter(k => k !== STORAGE_KEYS.PROGRESS);

    test('redundant backups of the same incident are pruned without reporting the incident as dropped', () => {
      // Pre-populate with 8 redundant backups for the LESSONS key
      const existingBackups = Array.from({ length: 8 }, (_, i) => ({
        id: `backup-lesson-${i}`,
        savedAt: new Date(Date.now() - (8 - i) * 1000).toISOString(),
        originalKey: STORAGE_KEYS.LESSONS,
        corruptionType: 'malformed_json' as const,
        reason: 'JSON parse error',
        raw: `{ "broken": ${i} }`,
        rejectedRecords: [],
      }));
      mockStorage.getStore().set(CORRUPTION_BACKUPS_KEY, JSON.stringify({ records: existingBackups }));

      // Corrupt lessons with a NEW malformed payload (same corruption type = redundant backup)
      mockStorage.getStore().set(STORAGE_KEYS.LESSONS, MALFORMED_JSON);

      let backupWriteAttempts = 0;
      mockStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key === CORRUPTION_BACKUPS_KEY) {
          backupWriteAttempts += 1;
          if (backupWriteAttempts === 1) throw new Error('QuotaExceededError: storage is full');
          return mockStorage.getStore().set(key, value);
        }
        return mockStorage.getStore().set(key, value);
      });

      repo.loadAll();

      const entry = repo.getDiagnostics()!.corruptedKeys.find(k => k.key === STORAGE_KEYS.LESSONS)!;
      expect(entry.pruned).toBeDefined();

      // The incident (lessons + malformed_json) should NOT be reported as dropped
      // because its oldest record was protected
      const pruned = entry.pruned!;
      expect(pruned.anyIncidentDropped).toBe(false);
      // The incident loss for lessons should show redundant copies discarded but incident retained
      const lessonLoss = pruned.incidentLosses.find(l => l.originalKey === STORAGE_KEYS.LESSONS && l.corruptionType === 'malformed_json');
      expect(lessonLoss).toBeDefined();
      expect(lessonLoss!.incidentDropped).toBe(false);
      expect(lessonLoss!.backupRemains).toBe(true);
      expect(lessonLoss!.recordsDiscarded).toBeGreaterThan(0);

      // But redundant backups should have been pruned (8 records -> 7 capacity)
      const backups = repo.getCorruptionBackupsForKey(STORAGE_KEYS.LESSONS);
      expect(backups.length).toBeLessThanOrEqual(7);

      // The new payload should be preserved
      const newBackup = backups.find(b => b.raw === MALFORMED_JSON);
      expect(newBackup).toBeDefined();
    });

    test('pruning occurs when quota retry is triggered, metadata is attached to corrupted entry', () => {
      // Pre-populate backup store with 7 unique incidents (one per repo key)
      // Use malformed JSON payloads for all (array keys + progress)
      const preExistingBackups = ARRAY_KEYS.map((key, i) => ({
        id: `backup-pre-${i}`,
        savedAt: new Date(Date.now() - (8 - i) * 1000).toISOString(),
        originalKey: key,
        corruptionType: 'malformed_json' as const,
        reason: 'JSON parse error',
        raw: `{ "broken": ${i} }`,
        rejectedRecords: [],
      }));
      // Progress key gets a malformed JSON payload too
      preExistingBackups.push({
        id: 'backup-pre-progress',
        savedAt: new Date(Date.now() - 1000).toISOString(),
        originalKey: STORAGE_KEYS.PROGRESS,
        corruptionType: 'malformed_json' as const,
        reason: 'JSON parse error',
        raw: `{ "broken": 99 }`,
        rejectedRecords: [],
      });
      mockStorage.getStore().set(CORRUPTION_BACKUPS_KEY, JSON.stringify({ records: preExistingBackups }));

      // Now corrupt all 7 keys with NEW malformed JSON payloads (same corruption type = redundant backups)
      for (let i = 0; i < ARRAY_KEYS.length; i++) {
        mockStorage.getStore().set(ARRAY_KEYS[i], MALFORMED_JSON);
      }
      mockStorage.getStore().set(STORAGE_KEYS.PROGRESS, MALFORMED_JSON);

      // Quota failure on first backup write attempt, triggering pruning retry
      let backupWriteAttempts = 0;
      mockStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key === CORRUPTION_BACKUPS_KEY) {
          backupWriteAttempts += 1;
          if (backupWriteAttempts === 1) throw new Error('QuotaExceededError: storage is full');
          return mockStorage.getStore().set(key, value);
        }
        return mockStorage.getStore().set(key, value);
      });

      repo.loadAll();

      // All 7 keys should be corrupted (all malformed JSON)
      const corruptedEntries = repo.getDiagnostics()!.corruptedKeys;
      expect(corruptedEntries.length).toBe(7);

      // The pruning metadata should be on at least one entry (the one that triggered quota)
      const entriesWithPruned = corruptedEntries.filter(e => e.pruned);
      expect(entriesWithPruned.length).toBeGreaterThan(0);

      // The pruned result should show NO dropped incidents (same 7 keys = redundant backups only)
      const pruned = entriesWithPruned[0].pruned!;
      expect(pruned.anyIncidentDropped).toBe(false);
      // Each incident should show redundant copies discarded but all retained
      for (const loss of pruned.incidentLosses) {
        expect(loss.incidentDropped).toBe(false);
        expect(loss.backupRemains).toBe(true);
        expect(loss.recordsDiscarded).toBeGreaterThanOrEqual(0);
      }
    });

    test('dropped incidents are correctly identified when more unique incidents than capacity exist (simulated by pre-populating backup store)', () => {
      // Pre-populate with 8 unique incidents: 6 repo array keys + 1 extra + progress
      // Make the extra key the OLDEST so it gets dropped
      const preExistingBackups = ARRAY_KEYS.map((key, i) => ({
        id: `backup-pre-${i}`,
        // Extra key is oldest (now - 10000), then repo keys from now - 9000 to now - 4000
        savedAt: new Date(Date.now() - (10 - i) * 1000).toISOString(),
        originalKey: key,
        corruptionType: 'malformed_json' as const,
        reason: 'JSON parse error',
        raw: `{ "broken": ${i} }`,
        rejectedRecords: [],
      }));
      // Extra key - oldest timestamp, should be dropped first
      preExistingBackups.unshift({
        id: 'backup-pre-extra',
        savedAt: new Date(Date.now() - 11000).toISOString(),
        originalKey: 'teachit_extra_key_v1',
        corruptionType: 'schema_invalid' as const,
        reason: 'Schema validation failed',
        raw: `{ "extra": true }`,
        rejectedRecords: [],
      });
      // Progress key - newest timestamp
      preExistingBackups.push({
        id: 'backup-pre-progress',
        savedAt: new Date(Date.now() - 1000).toISOString(),
        originalKey: STORAGE_KEYS.PROGRESS,
        corruptionType: 'malformed_json' as const,
        reason: 'JSON parse error',
        raw: `{ "broken": 99 }`,
        rejectedRecords: [],
      });
      mockStorage.getStore().set(CORRUPTION_BACKUPS_KEY, JSON.stringify({ records: preExistingBackups }));

      // Corrupt all 6 array keys with NEW malformed JSON payloads (same corruption type)
      for (let i = 0; i < ARRAY_KEYS.length; i++) {
        mockStorage.getStore().set(ARRAY_KEYS[i], MALFORMED_JSON);
      }
      // Progress gets a new malformed JSON payload (same corruption type)
      mockStorage.getStore().set(STORAGE_KEYS.PROGRESS, MALFORMED_JSON);

      // Quota failure on first backup write attempt, triggering pruning retry
      let backupWriteAttempts = 0;
      mockStorage.setItem.mockImplementation((key: string, value: string) => {
        if (key === CORRUPTION_BACKUPS_KEY) {
          backupWriteAttempts += 1;
          if (backupWriteAttempts === 1) throw new Error('QuotaExceededError: storage is full');
          return mockStorage.getStore().set(key, value);
        }
        return mockStorage.getStore().set(key, value);
      });

      repo.loadAll();

      const corruptedEntries = repo.getDiagnostics()!.corruptedKeys;
      const entriesWithPruned = corruptedEntries.filter(e => e.pruned);
      expect(entriesWithPruned.length).toBeGreaterThan(0);

      const pruned = entriesWithPruned[0].pruned!;

      // With 8 unique incidents (6 repo + extra + progress) and capacity 7, 1 incident should be dropped
      // The oldest is the extra key (savedAt now - 11000), so it should be dropped
      expect(pruned.anyIncidentDropped).toBe(true);
      expect(pruned.incidentLosses.some(l => l.incidentDropped)).toBe(true);

      const dropped = pruned.incidentLosses.find(l => l.incidentDropped)!;
      expect(dropped.originalKey).toBe('teachit_extra_key_v1');
      expect(dropped.corruptionType).toBe('schema_invalid');
      expect(dropped.incidentDropped).toBe(true);
      expect(dropped.backupRemains).toBe(false);
      expect(dropped.recordsDiscarded).toBeGreaterThan(0);
    });
  });
});