import {
  AcademicSession,
  ClassItem,
  Lesson,
  LessonStatus,
  LessonWithProgress,
  SubjectItem,
  TeacherPreferences,
  TeachingProgress,
  Topic,
  Week,
} from '../types/lesson';
import {
  INITIAL_CLASSES,
  INITIAL_LESSONS,
  INITIAL_PROGRESS,
  INITIAL_SESSIONS,
  INITIAL_SUBJECTS,
  INITIAL_TOPICS,
  INITIAL_WEEKS,
} from '../data/initialCurriculum';
import { getLessonScope, lessonsOfTopic, topicStatus, TopicStatus, TOPIC_STATUS_LABEL } from '../utils/curriculum';
import {
  commitJournaledWrite,
  CorruptionBackupRecord,
  getCorruptionBackup,
  IncidentLoss,
  listCorruptionBackupsForKey,
  PendingWriteResolution,
  preserveCorruptedPayload,
  PrunedResult,
  readCorruptionBackups,
  resolvePendingWrite,
  restoreCorruptionBackup,
  RejectedRecord,
} from './storageRecovery';

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

const DEFAULT_PREFERENCES: TeacherPreferences = {
  fontSize: 'md',
  paperMode: 'warm-paper',
  showTimingGuidance: true,
};

/**
 * Result of loading a storage key.
 * Distinguishes between missing, valid, malformed JSON, and schema-invalid data.
 */
export type LoadStatus = 'missing' | 'valid' | 'malformed_json' | 'schema_invalid';

export interface LoadResult<T> {
  status: LoadStatus;
  data: T;
  raw?: string;           // Complete raw payload when malformed/schema-invalid (basis for the durable backup)
  error?: string;         // Error message for diagnostics
  key: string;            // Storage key that was loaded
  /** Individual records rejected during partial schema recovery, with their complete JSON. */
  rejectedItems?: RejectedRecord[];
}

/**
 * Load a list from localStorage with detailed status reporting.
 * Does NOT silently fall back on corruption - preserves raw data for diagnostics.
 */
function loadListWithDiagnostics<T>(key: string, fallback: T[], validator: (item: unknown) => boolean): LoadResult<T[]> {
  const raw = localStorage.getItem(key);
  
  // Key missing - first launch scenario
  if (raw === null) {
    return { status: 'missing', data: fallback, key };
  }
  
  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Malformed JSON - preserve raw for diagnostics
    return {
      status: 'malformed_json',
      data: fallback,
      raw,
      error: e instanceof Error ? e.message : 'JSON parse error',
      key,
    };
  }
  
  // Check if parsed value is an array
  if (!Array.isArray(parsed)) {
    return {
      status: 'schema_invalid',
      data: fallback,
      raw,
      error: `Expected array, got ${typeof parsed}`,
      key,
    };
  }
  
  // Validate each item, keeping the complete JSON of every rejected record so
  // it can be preserved for recovery.
  const validItems: T[] = [];
  const rejectedItems: RejectedRecord[] = [];
  parsed.forEach((item: unknown, index: number) => {
    if (validator(item)) {
      validItems.push(item as T);
    } else {
      rejectedItems.push({ index, raw: JSON.stringify(item) });
    }
  });

  if (rejectedItems.length > 0) {
    return {
      status: 'schema_invalid',
      data: validItems,
      raw,
      error: `${rejectedItems.length} of ${parsed.length} items failed schema validation`,
      rejectedItems,
      key,
    };
  }
  
  return { status: 'valid', data: parsed as T[], key };
}

/**
 * Load a record (object) from localStorage with detailed status reporting.
 */
function loadRecordWithDiagnostics<T>(key: string, fallback: Record<string, T>): LoadResult<Record<string, T>> {
  const raw = localStorage.getItem(key);
  
  if (raw === null) {
    return { status: 'missing', data: fallback, key };
  }
  
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      status: 'malformed_json',
      data: fallback,
      raw,
      error: e instanceof Error ? e.message : 'JSON parse error',
      key,
    };
  }
  
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      status: 'schema_invalid',
      data: fallback,
      raw,
      error: `Expected object, got ${Array.isArray(parsed) ? 'array' : typeof parsed}`,
      key,
    };
  }
  
  return { status: 'valid', data: parsed as Record<string, T>, key };
}

const isNewLessonShape = (value: unknown): value is Lesson => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.topicId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.durationMinutes === 'number' &&
    // A lesson duration must be a positive, finite number of minutes.
    Number.isFinite(v.durationMinutes) &&
    v.durationMinutes > 0 &&
    Array.isArray(v.sections) &&
    Array.isArray(v.evaluation)
  );
};

const isNewTopicShape = (value: unknown): value is Topic => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' && typeof v.weekId === 'string' && typeof v.title === 'string'
  );
};

const isValidClassShape = (value: unknown): value is ClassItem => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.name === 'string' && typeof v.level === 'string';
};

const isValidSubjectShape = (value: unknown): value is SubjectItem => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.classId === 'string' && typeof v.name === 'string' && typeof v.code === 'string';
};

const isValidSessionShape = (value: unknown): value is AcademicSession => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.subjectId === 'string' && typeof v.term === 'number';
};

const isValidWeekShape = (value: unknown): value is Week => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'string' && typeof v.sessionId === 'string' && typeof v.number === 'number';
};

const toProgressRecord = (list: TeachingProgress[]): Record<string, TeachingProgress> =>
  Object.fromEntries(list.map((p) => [p.lessonId, p]));

/**
 * Corruption diagnostic information collected during load.
 */
export interface CorruptionDiagnostics {
  timestamp: string;
  corruptedKeys: Array<{
    key: string;
    status: LoadStatus;
    error?: string;
    /** Truncated preview for display only — NEVER a backup. The durable copy lives in the recovery store. */
    rawPreview: string;
    /** Recovery id of the durable backup of the complete payload. */
    backupId?: string;
    /** Whether the complete payload was durably preserved. */
    backupStatus: 'saved' | 'failed' | 'not_needed';
    /** Whether preservation failed (backupStatus === 'failed'). */
    backupError?: string;
    /** True when an identical backup from a previous startup was reused (not re-written). */
    backupDeduped?: boolean;
    /** Number of individual records rejected during partial schema recovery. */
    rejectedRecordCount: number;
    /** Metadata about quota-retry pruning that occurred during backup preservation. */
    pruned?: PrunedResult;
  }>;
  recoveredKeys: string[];
  orphanedLessons: Array<{ lessonId: string; topicId: string; reason: string }>;
  /** Result of persisting orphan-repair topics. A failed repair is never reported as persisted. */
  orphanRepair?: {
    attempted: boolean;
    topicsCreated: number;
    persisted: boolean;
    error?: string;
  };
  /** Result of reconciling a write-ahead journal from a previous interrupted multi-key write. */
  pendingWriteRecovery?: PendingWriteResolution;
  /**
   * Outcome of persisting first-launch seed values during load. Only recorded
   * when the attempt failed; seeding failures are never fatal to startup.
   */
  seedPersist?: { persisted: boolean; error?: string };
  /** Keys that must not be overwritten because their corrupted payload could not be backed up. */
  blockedOverwriteKeys: string[];
}

/**
 * CurriculumRepository — single source of truth for all curriculum data.
 * Encapsulates localStorage persistence and in-memory caching.
 * Phase 4: UI components should call repository methods, not read context arrays directly.
 */
export class CurriculumRepository {
  private _classes: ClassItem[] = INITIAL_CLASSES;
  private _subjects: SubjectItem[] = INITIAL_SUBJECTS;
  private _sessions: AcademicSession[] = INITIAL_SESSIONS;
  private _weeks: Week[] = INITIAL_WEEKS;
  private _topics: Topic[] = INITIAL_TOPICS;
  private _lessons: Lesson[] = INITIAL_LESSONS;
  private _progressById: Record<string, TeachingProgress> = toProgressRecord(INITIAL_PROGRESS);

  private _loaded = false;
  private _diagnostics: CorruptionDiagnostics | null = null;
  /** Keys whose corrupted payload could not be backed up; they must never be overwritten. */
  private _unsafeToOverwrite = new Set<string>();
  /** Outcome of persisting orphan-repair topics, if a repair ran. */
  private _orphanRepair: CorruptionDiagnostics['orphanRepair'] | null = null;
  /** Failure outcome of persisting first-launch seeds, if the attempt failed. */
  private _seedPersist: CorruptionDiagnostics['seedPersist'] | null = null;

  /** Get corruption diagnostics from the last loadAll() call. */
  getDiagnostics(): CorruptionDiagnostics | null {
    return this._diagnostics;
  }

  /** Check if any corruption was detected on last load. */
  hasCorruption(): boolean {
    return this._diagnostics !== null && this._diagnostics.corruptedKeys.length > 0;
  }

  /**
   * Outcome of persisting orphan-repair topics during the last loadAll().
   * `persisted: false` means the repaired relationships only exist in memory.
   */
  getOrphanRepairStatus(): CorruptionDiagnostics['orphanRepair'] | null {
    return this._orphanRepair;
  }

  /**
   * Keys that saveAll() refuses to overwrite because their corrupted payload
   * could not be backed up (storage was full). The original data stays intact.
   */
  getBlockedOverwriteKeys(): string[] {
    return [...this._unsafeToOverwrite];
  }

  /** Durable backups of corrupted payloads (complete, never truncated). */
  getCorruptionBackups(): CorruptionBackupRecord[] {
    return readCorruptionBackups();
  }

  /** Backups preserved for one original storage key. */
  getCorruptionBackupsForKey(originalKey: string): CorruptionBackupRecord[] {
    return listCorruptionBackupsForKey(originalKey);
  }

  /** Look up a single preserved backup by recovery id. */
  getCorruptionBackup(id: string): CorruptionBackupRecord | undefined {
    return getCorruptionBackup(id);
  }

  /**
   * Deterministically restore a preserved payload back to its original key.
   * Uses the journaled write path, so a failure leaves storage consistent.
   */
  restoreCorruptionBackup(id: string): { restored: boolean; error?: string } {
    return restoreCorruptionBackup(id);
  }

  /** Load all data from localStorage (or seed). Call once at app boot. */
  loadAll(): void {
    if (this._loaded) return;

    this._unsafeToOverwrite = new Set<string>();
    this._orphanRepair = null;
    this._seedPersist = null;

    // Reconcile any multi-key write that was interrupted in a previous session
    // BEFORE reading collection values, so we observe the restored state.
    const pendingWriteRecovery = resolvePendingWrite();
    if (pendingWriteRecovery.status === 'unresolved') {
      // Rollback failed again — storage may be in an inconsistent state.
      // Block ALL writes to prevent further damage; the journal remains for the next attempt.
      for (const key of Object.values(STORAGE_KEYS)) {
        this._unsafeToOverwrite.add(key);
      }
      console.error(
        '[CurriculumRepository] CRITICAL: Incomplete multi-key write could not be resolved — ALL WRITES BLOCKED:',
        pendingWriteRecovery,
      );
    } else if (pendingWriteRecovery.status === 'malformed_journal') {
      // The journal itself is corrupt — we cannot determine the state of the interrupted write.
      // Block ALL writes; the journal must be resolved manually.
      for (const key of Object.values(STORAGE_KEYS)) {
        this._unsafeToOverwrite.add(key);
      }
      console.error(
        '[CurriculumRepository] CRITICAL: Pending write journal is malformed — ALL WRITES BLOCKED:',
        pendingWriteRecovery.error,
      );
    } else if (pendingWriteRecovery.status !== 'none') {
      console.info('[CurriculumRepository] Resolved interrupted write:', pendingWriteRecovery);
    }

    const corruptedKeys: CorruptionDiagnostics['corruptedKeys'] = [];
    const recoveredKeys: string[] = [];

    // Load lessons with diagnostics
    const lessonsResult = loadListWithDiagnostics<Lesson>(
      STORAGE_KEYS.LESSONS,
      [],
      isNewLessonShape
    );
    this._recordCorruption(lessonsResult, corruptedKeys);

    let validStoredLessons: Lesson[];
    if (lessonsResult.status === 'valid' && lessonsResult.data.length > 0) {
      validStoredLessons = lessonsResult.data;
      recoveredKeys.push(STORAGE_KEYS.LESSONS);
    } else if (lessonsResult.status === 'schema_invalid' && lessonsResult.data.length > 0) {
      // Some valid lessons recovered from partially corrupted data
      validStoredLessons = lessonsResult.data;
      recoveredKeys.push(STORAGE_KEYS.LESSONS);
    } else {
      // No valid lessons at all - use seed
      validStoredLessons = INITIAL_LESSONS;
    }

    // Load progress with diagnostics
    const progressResult = loadRecordWithDiagnostics<TeachingProgress>(
      STORAGE_KEYS.PROGRESS,
      {}
    );
    this._recordCorruption(progressResult, corruptedKeys);

    let storedProgress: Record<string, TeachingProgress> = {};
    if (progressResult.status === 'valid' || progressResult.status === 'schema_invalid') {
      storedProgress = progressResult.data;
      if (progressResult.status === 'valid') recoveredKeys.push(STORAGE_KEYS.PROGRESS);
    }

    // Merge progress: seed progress as base, stored progress overrides
    this._progressById = { ...toProgressRecord(INITIAL_PROGRESS), ...storedProgress };
    this._lessons = validStoredLessons;

    // Load other collections with diagnostics - explicit calls for type safety
    const classesResult = loadListWithDiagnostics<ClassItem>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES, isValidClassShape);
    this._recordCorruption(classesResult, corruptedKeys);
    if (classesResult.status === 'valid' && classesResult.data.length > 0) {
      this._classes = classesResult.data;
      recoveredKeys.push(STORAGE_KEYS.CLASSES);
    } else if (classesResult.status === 'schema_invalid' && classesResult.data.length > 0) {
      this._classes = classesResult.data;
      recoveredKeys.push(STORAGE_KEYS.CLASSES);
    } else {
      this._classes = INITIAL_CLASSES;
    }

    const subjectsResult = loadListWithDiagnostics<SubjectItem>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS, isValidSubjectShape);
    this._recordCorruption(subjectsResult, corruptedKeys);
    if (subjectsResult.status === 'valid' && subjectsResult.data.length > 0) {
      this._subjects = subjectsResult.data;
      recoveredKeys.push(STORAGE_KEYS.SUBJECTS);
    } else if (subjectsResult.status === 'schema_invalid' && subjectsResult.data.length > 0) {
      this._subjects = subjectsResult.data;
      recoveredKeys.push(STORAGE_KEYS.SUBJECTS);
    } else {
      this._subjects = INITIAL_SUBJECTS;
    }

    const sessionsResult = loadListWithDiagnostics<AcademicSession>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS, isValidSessionShape);
    this._recordCorruption(sessionsResult, corruptedKeys);
    if (sessionsResult.status === 'valid' && sessionsResult.data.length > 0) {
      this._sessions = sessionsResult.data;
      recoveredKeys.push(STORAGE_KEYS.SESSIONS);
    } else if (sessionsResult.status === 'schema_invalid' && sessionsResult.data.length > 0) {
      this._sessions = sessionsResult.data;
      recoveredKeys.push(STORAGE_KEYS.SESSIONS);
    } else {
      this._sessions = INITIAL_SESSIONS;
    }

    const weeksResult = loadListWithDiagnostics<Week>(STORAGE_KEYS.WEEKS, INITIAL_WEEKS, isValidWeekShape);
    this._recordCorruption(weeksResult, corruptedKeys);
    if (weeksResult.status === 'valid' && weeksResult.data.length > 0) {
      this._weeks = weeksResult.data;
      recoveredKeys.push(STORAGE_KEYS.WEEKS);
    } else if (weeksResult.status === 'schema_invalid' && weeksResult.data.length > 0) {
      this._weeks = weeksResult.data;
      recoveredKeys.push(STORAGE_KEYS.WEEKS);
    } else {
      this._weeks = INITIAL_WEEKS;
    }

    // Load topics with diagnostics
    const topicsResult = loadListWithDiagnostics<Topic>(
      STORAGE_KEYS.TOPICS,
      [],
      isNewTopicShape
    );
    this._recordCorruption(topicsResult, corruptedKeys);

    let validTopics: Topic[];
    if (topicsResult.status === 'valid' && topicsResult.data.length > 0) {
      validTopics = topicsResult.data;
      recoveredKeys.push(STORAGE_KEYS.TOPICS);
    } else if (topicsResult.status === 'schema_invalid' && topicsResult.data.length > 0) {
      validTopics = topicsResult.data;
      recoveredKeys.push(STORAGE_KEYS.TOPICS);
    } else {
      validTopics = INITIAL_TOPICS;
    }
    this._topics = validTopics;

    // Repair orphaned lessons (lessons whose topicId doesn't match any loaded topic)
    const orphanedLessons = this.repairOrphanedLessons();

    // Persist collections that are still missing after load and repair. A
    // successful repair write already covers them (see the null check below),
    // so this only fires when nothing else has written them yet. This keeps
    // the first user edit from being the largest multi-key write of the app's
    // life (all seven keys created from scratch). Never fatal: a failure is
    // recorded in diagnostics and startup continues.
    const missingKeys = [
      lessonsResult, progressResult, classesResult, subjectsResult,
      sessionsResult, weeksResult, topicsResult,
    ]
      .filter((result) => result.status === 'missing')
      .map((result) => result.key)
      .filter((key) => localStorage.getItem(key) === null);
    if (missingKeys.length > 0) {
      const seedValues: Record<string, string> = {
        [STORAGE_KEYS.CLASSES]: JSON.stringify(this._classes),
        [STORAGE_KEYS.SUBJECTS]: JSON.stringify(this._subjects),
        [STORAGE_KEYS.SESSIONS]: JSON.stringify(this._sessions),
        [STORAGE_KEYS.WEEKS]: JSON.stringify(this._weeks),
        [STORAGE_KEYS.TOPICS]: JSON.stringify(this._topics),
        [STORAGE_KEYS.LESSONS]: JSON.stringify(this._lessons),
        [STORAGE_KEYS.PROGRESS]: JSON.stringify(this._progressById),
      };
      try {
        commitJournaledWrite(
          missingKeys.map((key) => ({ key, value: seedValues[key] })),
          'seed_missing_keys',
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this._seedPersist = { persisted: false, error: message };
        console.warn('[CurriculumRepository] Failed to persist seeded collections:', message);
      }
    }

    // Build diagnostics if any corruption, unresolved orphan, repair persistence
    // issue, or interrupted-write recovery was detected.
    if (
      corruptedKeys.length > 0 ||
      orphanedLessons.length > 0 ||
      this._orphanRepair !== null ||
      this._seedPersist !== null ||
      pendingWriteRecovery.status !== 'none'
    ) {
      this._diagnostics = {
        timestamp: new Date().toISOString(),
        corruptedKeys,
        recoveredKeys,
        orphanedLessons,
        orphanRepair: this._orphanRepair ?? undefined,
        seedPersist: this._seedPersist ?? undefined,
        pendingWriteRecovery: pendingWriteRecovery.status !== 'none' ? pendingWriteRecovery : undefined,
        blockedOverwriteKeys: [...this._unsafeToOverwrite],
      };
      console.warn('[CurriculumRepository] Storage corruption detected:', this._diagnostics);
    }

    this._loaded = true;
  }

  /**
   * Record a corrupted load result in the diagnostics and durably preserve the
   * COMPLETE payload before any code path can replace or discard it.
   *
   * Only `malformed_json` and `schema_invalid` are corruption. A missing key is
   * a clean first launch (or a key that was never written) and is NOT recorded.
   */
  private _recordCorruption<T>(result: LoadResult<T>, corruptedKeys: CorruptionDiagnostics['corruptedKeys']): void {
    if (result.status !== 'malformed_json' && result.status !== 'schema_invalid') {
      return;
    }

    const entry: CorruptionDiagnostics['corruptedKeys'][number] = {
      key: result.key,
      status: result.status,
      error: result.error,
      // Display-only preview. The durable backup below holds the full payload.
      rawPreview: result.raw ? result.raw.slice(0, 200) : '',
      backupStatus: 'not_needed',
      rejectedRecordCount: result.rejectedItems?.length ?? 0,
    };

    if (result.raw !== undefined) {
      const preservation = preserveCorruptedPayload({
        originalKey: result.key,
        corruptionType: result.status,
        reason: result.error ?? '',
        raw: result.raw,
        rejectedRecords: result.rejectedItems,
      });

      if (preservation.ok) {
        entry.backupStatus = 'saved';
        entry.backupId = preservation.record.id;
        entry.backupDeduped = preservation.deduped;
        if (preservation.pruned) {
          entry.pruned = preservation.pruned;
        }
      } else {
        // The payload could not be backed up (typically storage is full).
        // The original key must stay untouched from now on; saveAll() enforces
        // this via _unsafeToOverwrite and the failure is surfaced in diagnostics.
        entry.backupStatus = 'failed';
        entry.backupError = preservation.error;
        this._unsafeToOverwrite.add(result.key);
        console.error(
          `[CurriculumRepository] Failed to preserve corrupted payload for "${result.key}":`,
          preservation.error,
        );
      }
    }

    corruptedKeys.push(entry);
  }

  /**
   * Result of attempting to repair an orphaned lesson's topic relationship.
   */
  private repairOrphanedLessons(): Array<{ lessonId: string; topicId: string; reason: string }> {
    type OrphanRepairResult = {
      lessonId: string;
      topicId: string;
      repaired: boolean;
      targetWeekId?: string;
      reason?: string;
    };

    const topicIds = new Set(this._topics.map((t) => t.id));
    const orphanedLessons = this._lessons.filter((lesson) => !topicIds.has(lesson.topicId));

    if (orphanedLessons.length === 0) return [];

    // Group orphaned lessons by their topicId to avoid duplicate topic creation
    const topicsToCreate = new Map<string, { lesson: Lesson; targetWeekId: string; reason: string }>();
    const repairResults: OrphanRepairResult[] = [];

    for (const lesson of orphanedLessons) {
      if (topicsToCreate.has(lesson.topicId)) {
        repairResults.push({
          lessonId: lesson.id,
          topicId: lesson.topicId,
          repaired: true,
          targetWeekId: topicsToCreate.get(lesson.topicId)!.targetWeekId,
          reason: 'shared_with_repaired_topic',
        });
        continue;
      }

      // Try to resolve the lesson's scope via existing hierarchy (topic -> week -> session)
      const scope = getLessonScope(lesson.topicId, this._topics, this._weeks, this._sessions);

      // If we can resolve the scope because the topic exists in hierarchy, use that week
      let targetWeekId = scope.week?.id;
      let reason = 'resolved_via_existing_hierarchy';

      // Otherwise, try to infer from the topicId pattern: topic-{subjectId}-w{weekNumber}-{order}
      // Example: topic-sub-jss3-dt-w1-01 where subjectId = "sub-jss3-dt"
      if (!targetWeekId) {
        const match = lesson.topicId.match(/^topic-(.+)-w(\d+)-\d+$/);
        if (match) {
          const subjectId = match[1]; // Already contains full subjectId (e.g., "sub-jss3-dt")
          const weekNumber = parseInt(match[2], 10);
          const session = this._sessions.find((s) => s.subjectId === subjectId);
          if (session) {
            const week = this._weeks.find((w) => w.sessionId === session.id && w.number === weekNumber);
            if (week) {
              targetWeekId = week.id;
              reason = 'inferred_from_topicId_pattern';
            }
          }
        }
      }

      // NOTE: We intentionally do NOT fall back to week 1 or any guessed week.
      // If the correct week cannot be established from reliable evidence,
      // the lesson is preserved as-is and reported for manual review.

      if (targetWeekId) {
        topicsToCreate.set(lesson.topicId, { lesson, targetWeekId, reason });
        repairResults.push({
          lessonId: lesson.id,
          topicId: lesson.topicId,
          repaired: true,
          targetWeekId,
          reason,
        });
      } else {
        // Unresolved orphan - preserve lesson, report for review
        repairResults.push({
          lessonId: lesson.id,
          topicId: lesson.topicId,
          repaired: false,
          reason: 'unresolvable_topicId_no_matching_session_or_week',
        });
      }
    }

    // Create missing topics for resolved orphans
    for (const [topicId, { lesson, targetWeekId, reason }] of topicsToCreate) {
      if (this._topics.some((t) => t.id === topicId)) continue;
      const order = this._topics.filter((t) => t.weekId === targetWeekId).length + 1;
      this._topics.push({ id: topicId, weekId: targetWeekId, title: lesson.title, order });
    }

    // Log repair results for diagnostics
    const repaired = repairResults.filter(r => r.repaired).length;
    const unresolved = repairResults.filter(r => !r.repaired).length;
    if (repairResults.length > 0) {
      console.info('[CurriculumRepository] Orphan repair summary:', {
        total: repairResults.length,
        repaired,
        unresolved,
        details: repairResults,
      });
    }

    // If we created any topics, persist the repair. A persistence failure must
    // never be reported as a successful repair: the outcome is recorded so
    // callers can detect it via getOrphanRepairStatus() / getDiagnostics().
    // The repaired topics stay available in memory for the current session,
    // and because repair is deterministic and idempotent, the next successful
    // save (or next startup) persists the same result.
    if (topicsToCreate.size > 0) {
      try {
        this.saveAll();
        this._orphanRepair = {
          attempted: true,
          topicsCreated: topicsToCreate.size,
          persisted: true,
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this._orphanRepair = {
          attempted: true,
          topicsCreated: topicsToCreate.size,
          persisted: false,
          error: message,
        };
        console.warn(
          '[CurriculumRepository] Orphan repair was NOT persisted (repair remains in memory only):',
          message,
        );
      }
    }

    // Return unresolved orphans for diagnostics
    return repairResults
      .filter(r => !r.repaired)
      .map(r => ({ lessonId: r.lessonId, topicId: r.topicId, reason: r.reason ?? 'unknown' }));
  }

  /**
   * Persist all state to localStorage as one journaled, rollback-protected
   * operation. Throws on failure so callers can handle it — persistence success
   * is never claimed when a write failed.
   *
   * Safety rules:
   * - Every key's original value is recorded in a write-ahead journal before
   *   the first write; a failed write rolls the already-written keys back.
   * - If rollback also fails, the journal is preserved so the next startup can
   *   detect and resolve the incomplete operation (see resolvePendingWrite).
   * - Keys whose corrupted payload could not be backed up are never overwritten;
   *   the write is refused instead so the only recoverable copy survives.
   *
   * Limitation: localStorage has no true multi-key atomicity. The journal
   * bounds the inconsistent window to a crash between two setItem calls, with
   * durable recovery information covering that window.
   */
  saveAll(): void {
    const keys = [
      STORAGE_KEYS.CLASSES,
      STORAGE_KEYS.SUBJECTS,
      STORAGE_KEYS.SESSIONS,
      STORAGE_KEYS.WEEKS,
      STORAGE_KEYS.TOPICS,
      STORAGE_KEYS.LESSONS,
      STORAGE_KEYS.PROGRESS,
    ];
    const values: Record<string, string> = {
      [STORAGE_KEYS.CLASSES]: JSON.stringify(this._classes),
      [STORAGE_KEYS.SUBJECTS]: JSON.stringify(this._subjects),
      [STORAGE_KEYS.SESSIONS]: JSON.stringify(this._sessions),
      [STORAGE_KEYS.WEEKS]: JSON.stringify(this._weeks),
      [STORAGE_KEYS.TOPICS]: JSON.stringify(this._topics),
      [STORAGE_KEYS.LESSONS]: JSON.stringify(this._lessons),
      [STORAGE_KEYS.PROGRESS]: JSON.stringify(this._progressById),
    };
    const entries = keys.map((key) => ({ key, value: values[key] }));

    const blocked = entries.filter((entry) => this._unsafeToOverwrite.has(entry.key));
    if (blocked.length > 0) {
      throw new Error(
        `Failed to persist curriculum data: refusing to overwrite ${blocked.map((e) => e.key).join(', ')} — ` +
          'the original corrupted payload could not be backed up (storage may be full), so it must not be destroyed. ' +
          'See getDiagnostics().blockedOverwriteKeys.',
      );
    }

    try {
      commitJournaledWrite(entries, 'saveAll');
    } catch (error) {
      // Re-throw with context so callers can handle persistence failures
      throw new Error(`Failed to persist curriculum data: ${error instanceof Error ? error.message : 'Unknown storage error'}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // READ API (mirrors the prompt's conceptual contracts)
  // ─────────────────────────────────────────────────────────────────────────────

  getClasses(): ClassItem[] { return this._classes; }
  getSubjects(classId?: string): SubjectItem[] {
    return classId ? this._subjects.filter((s) => s.classId === classId) : this._subjects;
  }
  getSessions(subjectId?: string): AcademicSession[] {
    return subjectId ? this._sessions.filter((s) => s.subjectId === subjectId) : this._sessions;
  }
  getWeeks(sessionId?: string): Week[] {
    return sessionId ? this._weeks.filter((w) => w.sessionId === sessionId) : this._weeks;
  }
  getTopics(weekId?: string): Topic[] {
    return weekId ? this._topics.filter((t) => t.weekId === weekId) : this._topics;
  }
  getLessons(filters?: { topicId?: string; classId?: string; subjectId?: string }): Lesson[] {
    let result = this._lessons;
    if (filters?.topicId) result = result.filter((l) => l.topicId === filters.topicId);
    if (filters?.classId || filters?.subjectId) {
      result = result.filter((l) => {
        const scope = getLessonScope(l.topicId, this._topics, this._weeks, this._sessions);
        return (
          (!filters.classId || scope.classId === filters.classId) &&
          (!filters.subjectId || scope.subjectId === filters.subjectId)
        );
      });
    }
    return result;
  }
  getLesson(id: string): Lesson | undefined {
    return this._lessons.find((l) => l.id === id);
  }
  getLessonWithProgress(id: string): LessonWithProgress | undefined {
    const lesson = this.getLesson(id);
    if (!lesson) return undefined;
    const progress = this._progressById[id];
    return {
      ...lesson,
      status: progress?.status ?? 'planned',
      currentSectionId: progress?.currentSectionId ?? null,
      completedSectionIds: progress?.completedSectionIds ?? [],
      lastVisitedAt: progress?.lastVisitedAt,
    };
  }
  getAllLessonsWithProgress(): LessonWithProgress[] {
    return this._lessons.map((lesson) => {
      const progress = this._progressById[lesson.id];
      return {
        ...lesson,
        status: progress?.status ?? 'planned',
        currentSectionId: progress?.currentSectionId ?? null,
        completedSectionIds: progress?.completedSectionIds ?? [],
        lastVisitedAt: progress?.lastVisitedAt,
      };
    });
  }
  getProgress(lessonId: string): TeachingProgress | undefined {
    return this._progressById[lessonId];
  }
  getAllProgress(): Record<string, TeachingProgress> {
    return this._progressById;
  }
  getTopic(id: string): Topic | undefined {
    return this._topics.find((t) => t.id === id);
  }
  getTopicOfLesson(lessonId: string): Topic | undefined {
    const lesson = this.getLesson(lessonId);
    return lesson ? this.getTopic(lesson.topicId) : undefined;
  }
  getLessonScope(lessonId: string) {
    const lesson = this.getLesson(lessonId);
    if (!lesson) return { topic: undefined, week: undefined, session: undefined, subjectId: undefined, classId: undefined, weekNumber: undefined };
    return getLessonScope(lesson.topicId, this._topics, this._weeks, this._sessions);
  }
  getTopicLessons(topicId: string): LessonWithProgress[] {
    return lessonsOfTopic({ id: topicId, weekId: '', title: '', order: 0 } as Topic, this.getAllLessonsWithProgress());
  }
  getTopicStatus(topicId: string): TopicStatus {
    const topic = this.getTopic(topicId);
    if (!topic) return 'not_prepared';
    return topicStatus(topic, this.getAllLessonsWithProgress());
  }

  /** Get all taught lessons for a topic's subject (for revision/context). */
  getTaughtLessonsForSubject(subjectId: string): LessonWithProgress[] {
    return this.getAllLessonsWithProgress().filter(
      (l) => {
        const scope = getLessonScope(l.topicId, this._topics, this._weeks, this._sessions);
        return scope.subjectId === subjectId && l.status === 'taught';
      },
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // WRITE API
  // ─────────────────────────────────────────────────────────────────────────────

  saveLesson(lesson: Lesson, options?: { weekId?: string; topicTitle?: string }): void {
    const isNewLesson = !this._lessons.some((l) => l.id === lesson.id);
    const previousLesson = isNewLesson ? null : this._lessons.find((l) => l.id === lesson.id);
    const previousProgress = this._progressById[lesson.id];
    const previousTopics = [...this._topics];

    const idx = this._lessons.findIndex((l) => l.id === lesson.id);
    if (idx >= 0) this._lessons[idx] = lesson;
    else this._lessons.push(lesson);

    if (!this._progressById[lesson.id]) {
      this._progressById[lesson.id] = {
        lessonId: lesson.id,
        status: 'planned',
        currentSectionId: lesson.sections[0]?.id ?? null,
        completedSectionIds: [],
      };
    }
    if (options?.weekId) this.ensureTopicForLesson(lesson, options.weekId, options.topicTitle);

    try {
      this.saveAll();
    } catch (error) {
      // Rollback on persistence failure
      if (isNewLesson) {
        this._lessons = this._lessons.filter((l) => l.id !== lesson.id);
      } else if (previousLesson) {
        const idx2 = this._lessons.findIndex((l) => l.id === lesson.id);
        if (idx2 >= 0) this._lessons[idx2] = previousLesson;
      }
      if (previousProgress) {
        this._progressById[lesson.id] = previousProgress;
      } else {
        delete this._progressById[lesson.id];
      }
      this._topics = previousTopics;
      throw error;
    }
  }

  private ensureTopicForLesson(lesson: Lesson, weekId: string, topicTitle?: string): void {
    if (this._topics.some((t) => t.id === lesson.topicId)) return;
    const order = this._topics.filter((t) => t.weekId === weekId).length + 1;
    this._topics.push({ id: lesson.topicId, weekId, title: topicTitle ?? lesson.title, order });
    // Note: saveAll is called by the public method that called this
  }

  updateProgress(lessonId: string, patch: Partial<TeachingProgress>): void {
    const previousProgress = this._progressById[lessonId];
    const existing = this._progressById[lessonId];
    this._progressById[lessonId] = {
      lessonId,
      status: existing?.status ?? 'planned',
      currentSectionId: existing?.currentSectionId ?? null,
      completedSectionIds: existing?.completedSectionIds ?? [],
      lastVisitedAt: existing?.lastVisitedAt,
      ...patch,
    };
    try {
      this.saveAll();
    } catch (error) {
      if (previousProgress) {
        this._progressById[lessonId] = previousProgress;
      } else {
        delete this._progressById[lessonId];
      }
      throw error;
    }
  }

  updateLessonStatus(lessonId: string, status: LessonStatus): void {
    this.updateProgress(lessonId, { status });
  }

  setCurrentSection(lessonId: string, sectionId: string): void {
    this.updateProgress(lessonId, { currentSectionId: sectionId, lastVisitedAt: new Date().toISOString() });
  }

  toggleSectionCompleted(lessonId: string, sectionId: string): void {
    const previousProgress = this._progressById[lessonId];
    const existing = this._progressById[lessonId];
    const completed = existing?.completedSectionIds ?? [];
    const nextCompleted = completed.includes(sectionId)
      ? completed.filter((id) => id !== sectionId)
      : [...completed, sectionId];

    const lesson = this.getLesson(lessonId);
    const allSectionsDone = lesson && nextCompleted.length >= lesson.sections.length;

    this._progressById[lessonId] = {
      lessonId,
      status: existing?.status ?? 'planned',
      currentSectionId: existing?.currentSectionId ?? null,
      completedSectionIds: nextCompleted,
      lastVisitedAt: existing?.lastVisitedAt,
      ...(allSectionsDone && existing?.status !== 'taught' ? { status: 'taught' as LessonStatus } : {}),
    };

    try {
      this.saveAll();
    } catch (error) {
      if (previousProgress) {
        this._progressById[lessonId] = previousProgress;
      } else {
        delete this._progressById[lessonId];
      }
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESET / SEED
  // ─────────────────────────────────────────────────────────────────────────────

  resetAll(): void {
    const previousState = {
      classes: [...this._classes],
      subjects: [...this._subjects],
      sessions: [...this._sessions],
      weeks: [...this._weeks],
      topics: [...this._topics],
      lessons: [...this._lessons],
      progressById: { ...this._progressById },
    };
    this._classes = INITIAL_CLASSES;
    this._subjects = INITIAL_SUBJECTS;
    this._sessions = INITIAL_SESSIONS;
    this._weeks = INITIAL_WEEKS;
    this._topics = INITIAL_TOPICS;
    this._lessons = INITIAL_LESSONS;
    this._progressById = toProgressRecord(INITIAL_PROGRESS);
    try {
      this.saveAll();
    } catch (error) {
      this._classes = previousState.classes;
      this._subjects = previousState.subjects;
      this._sessions = previousState.sessions;
      this._weeks = previousState.weeks;
      this._topics = previousState.topics;
      this._lessons = previousState.lessons;
      this._progressById = previousState.progressById;
      throw error;
    }
  }

  /** Delete a lesson and its associated progress. */
  deleteLesson(lessonId: string): void {
    const previousLessons = [...this._lessons];
    const previousProgress = this._progressById[lessonId] ? { ...this._progressById[lessonId] } : null;
    this._lessons = this._lessons.filter((l) => l.id !== lessonId);
    delete this._progressById[lessonId];
    try {
      this.saveAll();
    } catch (error) {
      this._lessons = previousLessons;
      if (previousProgress) {
        this._progressById[lessonId] = previousProgress;
      }
      throw error;
    }
  }
}

/** Singleton instance for the app lifetime. */
export const curriculumRepository = new CurriculumRepository();

/** Re-export curriculum helpers for convenience. */
export type { TopicStatus } from '../utils/curriculum';
export { TOPIC_STATUS_LABEL, getLessonScope, lessonsOfTopic, topicStatus } from '../utils/curriculum';