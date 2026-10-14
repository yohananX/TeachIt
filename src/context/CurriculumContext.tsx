import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  curriculumRepository,
  TopicStatus,
  TOPIC_STATUS_LABEL,
  getLessonScope,
  lessonsOfTopic,
  topicStatus,
  CorruptionDiagnostics,
} from '../services/curriculumRepository';
import {
  StorageWriteError,
} from '../services/storageRecovery';
import type { StorageHealthCondition } from '../components/StorageHealthBanner';

/**
 * UI navigation state only — never persisted, never domain data.
 * Four destinations: Home/Today, Plan, Lesson (teach mode) and the secondary
 * lesson library.
 */
export type ViewMode = 'today' | 'plan' | 'lesson' | 'library';

interface CurriculumContextType {
  // Domain data (delegated to repository — read-only snapshots)
  classes: ClassItem[];
  subjects: SubjectItem[];
  sessions: AcademicSession[];
  weeks: Week[];
  topics: Topic[];
  lessons: LessonWithProgress[];
  progressById: Record<string, TeachingProgress>;
  // Active lesson state (derived but needed by UI)
  activeLessonId: string | null;
  activeLesson: LessonWithProgress | null;
  currentSectionId: string | null;
  // Domain mutations
  selectLesson: (lessonId: string) => void;
  setCurrentSection: (sectionId: string) => void;
  toggleSectionCompleted: (sectionId: string) => void;
  updateLessonStatus: (lessonId: string, status: LessonStatus) => void;
  saveLesson: (lesson: Lesson, options?: { weekId?: string; topicTitle?: string }) => void;
  deleteLesson: (lessonId: string) => void;
  getTaughtLessonsForSubject: (subjectId: string) => LessonWithProgress[];
  resetAllData: () => void;
  // Diagnostics
  orphanRepairWarning: { message: string; dismiss: () => void } | null;
  // Storage health — derived from repository diagnostics
  storageHealthConditions: StorageHealthCondition[];
  /** Dismiss a storage health condition (does not delete diagnostics/backups) */
  dismissStorageHealthCondition: (condition: StorageHealthCondition) => void;
  /** Acknowledge a condition but keep it visible */
  acknowledgeStorageHealthCondition: (condition: StorageHealthCondition) => void;
  /** Get full diagnostics for advanced UI */
  getDiagnostics: () => CorruptionDiagnostics | null;
  /** Whether any storage health issue exists */
  hasStorageHealthIssues: boolean;
}

const STORAGE_KEYS = {
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

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// CurriculumProvider — owns repository sync + domain mutations
// ─────────────────────────────────────────────────────────────────────────────
export const CurriculumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, setBootTick] = useState(0);
  const [orphanRepairWarning, setOrphanRepairWarning] = useState<{ message: string; dismiss: () => void } | null>(null);

  // Storage health: dismissed and acknowledged conditions (by type + key fingerprint)
  const [dismissedConditions, setDismissedConditions] = useState<Set<string>>(new Set());
  const [acknowledgedConditions, setAcknowledgedConditions] = useState<Set<string>>(new Set());

  // Mutation error state - stores failed mutation errors for UI exposure, keyed by operation
  const [mutationErrors, setMutationErrors] = useState<Map<string, string>>(new Map());

  // Load repository once at boot
  useEffect(() => {
    curriculumRepository.loadAll();
    const repairStatus = curriculumRepository.getOrphanRepairStatus();
    if (repairStatus && repairStatus.attempted && repairStatus.persisted === false) {
      const message = 'Some repaired topic relationships couldn\'t be saved to storage. They\'re available now but may need to be re-repaired after a restart if they aren\'t saved by another action.';
      setOrphanRepairWarning({ message, dismiss: () => setOrphanRepairWarning(null) });
    }
    setBootTick((t) => t + 1);
  }, []);

  /** Create a stable fingerprint for a condition to track dismissal/acknowledgment */
  const conditionFingerprint = useCallback((condition: StorageHealthCondition): string => {
    switch (condition.type) {
      case 'corruption':
        return `corruption:${condition.key}:${condition.status}:${condition.backupId ?? 'no-backup'}`;
      case 'blocked_write':
        return `blocked_write:${condition.keys.sort().join(',')}`;
      case 'unresolved_journal':
        return `unresolved_journal:${condition.journalId}`;
      case 'orphan_repair_failed':
        return `orphan_repair_failed:${condition.topicsCreated}:${condition.error}`;
      case 'seed_persist_failed':
        return `seed_persist_failed:${condition.error}`;
      case 'write_failed':
        return `write_failed:${condition.operation}:${condition.error}`;
      case 'preference_persist_failed':
        return `preference_persist_failed:${condition.operation}:${condition.error}`;
    }
  }, []);

  /** Check if a condition has been dismissed */
  const isConditionDismissed = useCallback((condition: StorageHealthCondition): boolean => {
    return dismissedConditions.has(conditionFingerprint(condition));
  }, [dismissedConditions, conditionFingerprint]);

  /** Check if a condition has been acknowledged */
  const isConditionAcknowledged = useCallback((condition: StorageHealthCondition): boolean => {
    return acknowledgedConditions.has(conditionFingerprint(condition));
  }, [acknowledgedConditions, conditionFingerprint]);

  /** Dismiss a storage health condition */
  const dismissStorageHealthCondition = useCallback((condition: StorageHealthCondition) => {
    setDismissedConditions((prev) => {
      const next = new Set(prev);
      next.add(conditionFingerprint(condition));
      return next;
    });
  }, [conditionFingerprint]);

  /** Acknowledge a storage health condition (keep visible) */
  const acknowledgeStorageHealthCondition = useCallback((condition: StorageHealthCondition) => {
    setAcknowledgedConditions((prev) => {
      const next = new Set(prev);
      next.add(conditionFingerprint(condition));
      return next;
    });
  }, [conditionFingerprint]);

  /** Get full diagnostics from repository */
  const getDiagnostics = useCallback(() => {
    return curriculumRepository.getDiagnostics();
  }, []);

  /** Compute storage health conditions from repository diagnostics and mutation errors */
  const storageHealthConditions = useMemo((): StorageHealthCondition[] => {
    const conditions: StorageHealthCondition[] = [];
    const diagnostics = curriculumRepository.getDiagnostics();

    if (!diagnostics) return conditions;

    // 1. Corrupted keys with diagnostics (only malformed_json and schema_invalid are corruption)
    for (const corrupted of diagnostics.corruptedKeys) {
      if (corrupted.status !== 'malformed_json' && corrupted.status !== 'schema_invalid') continue;

      // backupStatus in diagnostics can be 'saved' | 'failed' | 'not_needed'
      // We only surface 'saved' or 'failed' in the banner
      const backupStatus = corrupted.backupStatus === 'not_needed' ? 'failed' : corrupted.backupStatus;

      conditions.push({
        type: 'corruption',
        key: corrupted.key,
        status: corrupted.status,
        error: corrupted.error,
        rejectedCount: corrupted.rejectedRecordCount,
        backupId: corrupted.backupId,
        backupStatus,
        backupError: corrupted.backupError,
      });
    }

    // 2. Blocked overwrite keys
    if (diagnostics.blockedOverwriteKeys.length > 0) {
      conditions.push({
        type: 'blocked_write',
        keys: diagnostics.blockedOverwriteKeys,
      });
    }

    // 3. Unresolved journal
    if (diagnostics.pendingWriteRecovery &&
        (diagnostics.pendingWriteRecovery.status === 'unresolved' ||
         diagnostics.pendingWriteRecovery.status === 'malformed_journal')) {
      const recovery = diagnostics.pendingWriteRecovery;
      // journalId only exists on 'unresolved' status
      const journalId = recovery.status === 'unresolved' ? recovery.journalId : 'malformed-journal';
      conditions.push({
        type: 'unresolved_journal',
        journalId,
        error: recovery.error ?? 'Unknown journal error',
      });
    }

    // 4. Seed persist failure
    if (diagnostics.seedPersist && diagnostics.seedPersist.persisted === false) {
      conditions.push({
        type: 'seed_persist_failed',
        error: diagnostics.seedPersist.error ?? 'Unknown error',
      });
    }

    // 5. Mutation errors (write failures during user actions) - one per operation
    mutationErrors.forEach((error, operation) => {
      conditions.push({
        type: 'write_failed',
        operation,
        error,
      });
    });

    // Note: orphan_repair_failed is intentionally excluded here because it's
    // surfaced via the existing orphanRepairWarning banner to avoid duplicate alerts.

    // Filter out dismissed conditions
    return conditions.filter((c) => !isConditionDismissed(c));
  }, [curriculumRepository, mutationErrors, isConditionDismissed]);

  /** Whether any storage health issue exists (not dismissed) */
  const hasStorageHealthIssues = storageHealthConditions.length > 0;

  // Domain data — read from repository (reactive via boot tick)
  const classes = curriculumRepository.getClasses();
  const subjects = curriculumRepository.getSubjects();
  const sessions = curriculumRepository.getSessions();
  const weeks = curriculumRepository.getWeeks();
  const topics = curriculumRepository.getTopics();
  const lessonsWithProgress = curriculumRepository.getAllLessonsWithProgress();
  const progressById = curriculumRepository.getAllProgress();

  // Derived active lesson (for convenience in UI)
  const [activeLessonId, setActiveLessonIdState] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_LESSON_ID);
    return saved || 'lesson-jss3-dt-w1';
  });

  // Persist activeLessonId
  useEffect(() => {
    if (activeLessonId) {
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_LESSON_ID, activeLessonId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Report as a preference persistence failure, not a curriculum data failure
        setMutationErrors((prev) => {
          const next = new Map(prev);
          next.set('persistActiveLessonId', message);
          return next;
        });
      }
    }
  }, [activeLessonId]);

  const activeLesson =
    lessonsWithProgress.find((l) => l.id === activeLessonId) ?? lessonsWithProgress[0] ?? null;
  const currentSectionId = activeLesson?.currentSectionId ?? activeLesson?.sections[0]?.id ?? null;

  // Domain mutations
  const setActiveLessonId = useCallback((id: string) => {
    setActiveLessonIdState(id);
  }, []);

  const selectLesson = useCallback((lessonId: string) => {
    setActiveLessonIdState(lessonId);
    // Also update the class/subject selection to match the lesson's curriculum location
    // and switch to teaching mode. This mirrors the old LessonContext behavior.
    const scope = curriculumRepository.getLessonScope(lessonId);
    if (scope.subjectId) {
      const subject = subjects.find((s) => s.id === scope.subjectId);
      if (subject) {
        // We can't directly call UIContext setters from here, so we rely on the
        // components that call selectLesson to also update UIContext.
        // The LessonEditorModal, PlanView, TodayView, LessonLibraryView all
        // have access to both contexts and can coordinate.
      }
    }
  }, []);

  /** Helper to wrap a mutation, catch persistence errors, and expose them */
  const withMutationErrorHandling = useCallback((
    operation: string,
    mutation: () => void
  ) => {
    try {
      mutation();
      // Clear the error for this specific operation on success
      setMutationErrors((prev) => {
        const next = new Map(prev);
        next.delete(operation);
        return next;
      });
      setBootTick((t) => t + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setMutationErrors((prev) => {
        const next = new Map(prev);
        next.set(operation, message);
        return next;
      });
      // Also increment bootTick to force UI re-sync with repository (which has rolled back)
      setBootTick((t) => t + 1);
      // Re-throw so callers can handle if needed
      throw error;
    }
  }, []);

  const setCurrentSection = useCallback((sectionId: string) => {
    if (!activeLessonId) return;
    withMutationErrorHandling('setCurrentSection', () => {
      curriculumRepository.setCurrentSection(activeLessonId, sectionId);
    });
  }, [activeLessonId, withMutationErrorHandling]);

  const toggleSectionCompleted = useCallback((sectionId: string) => {
    if (!activeLessonId) return;
    withMutationErrorHandling('toggleSectionCompleted', () => {
      curriculumRepository.toggleSectionCompleted(activeLessonId, sectionId);
    });
  }, [activeLessonId, withMutationErrorHandling]);

  const updateLessonStatus = useCallback((lessonId: string, status: LessonStatus) => {
    withMutationErrorHandling('updateLessonStatus', () => {
      curriculumRepository.updateLessonStatus(lessonId, status);
    });
  }, [withMutationErrorHandling]);

  const saveLesson = useCallback((lesson: Lesson, options?: { weekId?: string; topicTitle?: string }) => {
    withMutationErrorHandling('saveLesson', () => {
      curriculumRepository.saveLesson(lesson, options);
    });
  }, [withMutationErrorHandling]);

  const getTaughtLessonsForSubject = useCallback((subjectId: string) => {
    return curriculumRepository.getTaughtLessonsForSubject(subjectId);
  }, []);

  const resetAllData = useCallback(() => {
    withMutationErrorHandling('resetAllData', () => {
      try {
        curriculumRepository.resetAll();
      } finally {
        // Always reset active lesson after reset attempt.
        // Repository has already rolled back on failure, so we read the current state.
        const firstLesson = curriculumRepository.getAllLessonsWithProgress()[0];
        setActiveLessonIdState(firstLesson?.id ?? 'lesson-jss3-dt-w1');
      }
    });
  }, [withMutationErrorHandling]);

  const deleteLesson = useCallback((lessonId: string) => {
    withMutationErrorHandling('deleteLesson', () => {
      // If the deleted lesson is the active one, reset to first available
      if (activeLessonId === lessonId) {
        const remainingLessons = curriculumRepository.getAllLessonsWithProgress().filter(l => l.id !== lessonId);
        setActiveLessonIdState(remainingLessons[0]?.id ?? null);
      }
      curriculumRepository.deleteLesson(lessonId);
    });
  }, [activeLessonId, withMutationErrorHandling]);

  return (
    <CurriculumContext.Provider
      value={{
        classes,
        subjects,
        sessions,
        weeks,
        topics,
        lessons: lessonsWithProgress,
        progressById,
        activeLessonId,
        activeLesson,
        currentSectionId,
        selectLesson,
        setCurrentSection,
        toggleSectionCompleted,
        updateLessonStatus,
        saveLesson,
        deleteLesson,
        getTaughtLessonsForSubject,
        resetAllData,
        orphanRepairWarning,
        storageHealthConditions,
        dismissStorageHealthCondition,
        acknowledgeStorageHealthCondition,
        getDiagnostics,
        hasStorageHealthIssues,
      }}
    >
      {children}
    </CurriculumContext.Provider>
  );
};

export const useCurriculum = () => {
  const context = useContext(CurriculumContext);
  if (!context) {
    throw new Error('useCurriculum must be used within a CurriculumProvider');
  }
  return context;
};

// Re-export curriculum helpers
export type { TopicStatus } from '../utils/curriculum';
export { TOPIC_STATUS_LABEL, getLessonScope, lessonsOfTopic, topicStatus };