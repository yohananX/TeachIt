import React, { createContext, useContext, useState, useEffect } from 'react';
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
import { getLessonScope } from '../utils/curriculum';

/**
 * UI navigation state only — never persisted, never domain data.
 * Four destinations: Home/Today, Plan, Lesson (teach mode) and the secondary
 * lesson library.
 */
export type ViewMode = 'today' | 'plan' | 'lesson' | 'library';

interface LessonContextType {
  // Domain collections (persistent)
  classes: ClassItem[];
  subjects: SubjectItem[];
  sessions: AcademicSession[];
  weeks: Week[];
  topics: Topic[];
  lessons: LessonWithProgress[];
  progressById: Record<string, TeachingProgress>;
  // Selection / UI state
  activeLessonId: string | null;
  activeLesson: LessonWithProgress | null;
  currentSectionId: string | null;
  preferences: TeacherPreferences;
  selectedClassId: string;
  selectedSubjectId: string;
  viewMode: ViewMode;
  setSelectedClassId: (id: string) => void;
  setSelectedSubjectId: (id: string) => void;
  setViewMode: (mode: ViewMode) => void;
  selectLesson: (lessonId: string) => void;
  setCurrentSection: (sectionId: string) => void;
  toggleSectionCompleted: (sectionId: string) => void;
  updateLessonStatus: (lessonId: string, status: LessonStatus) => void;
  updatePreferences: (newPrefs: Partial<TeacherPreferences>) => void;
  saveLesson: (lesson: Lesson, options?: { weekId?: string }) => void;
  resetAllData: () => void;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Storage reads. Phase 1: strict shape check — old stored lessons without
// topicId/title fall back to seed data instead of limping along.
// ─────────────────────────────────────────────────────────────────────────────
function loadList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : fallback;
  } catch {
    return fallback;
  }
}

function loadRecord<T>(key: string, fallback: Record<string, T>): Record<string, T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, T>)
      : fallback;
  } catch {
    return fallback;
  }
}

const isNewLessonShape = (value: unknown): value is Lesson => {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.topicId === 'string' &&
    typeof v.title === 'string' &&
    typeof v.durationMinutes === 'number' &&
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

const toProgressRecord = (list: TeachingProgress[]): Record<string, TeachingProgress> =>
  Object.fromEntries(list.map((progress) => [progress.lessonId, progress]));

function loadLessonsAndProgress(): {
  lessons: Lesson[];
  progressById: Record<string, TeachingProgress>;
} {
  const storedLessons = loadList<unknown>(STORAGE_KEYS.LESSONS, []);
  const storedProgress = loadRecord<TeachingProgress>(STORAGE_KEYS.PROGRESS, {});
  const validStored = storedLessons.filter(isNewLessonShape);
  // Fresh boot or pre-Phase-1 data: reseed rather than migrate field-by-field.
  if (validStored.length === 0) {
    return { lessons: INITIAL_LESSONS, progressById: toProgressRecord(INITIAL_PROGRESS) };
  }
  return {
    lessons: validStored,
    progressById: { ...toProgressRecord(INITIAL_PROGRESS), ...storedProgress },
  };
}

function loadTopics(): Topic[] {
  const stored = loadList<unknown>(STORAGE_KEYS.TOPICS, []);
  const valid = stored.filter(isNewTopicShape);
  return valid.length > 0 ? valid : INITIAL_TOPICS;
}

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassItem[]>(() =>
    loadList<ClassItem>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES),
  );

  const [subjects, setSubjects] = useState<SubjectItem[]>(() =>
    loadList<SubjectItem>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS),
  );

  const [sessions, setSessions] = useState<AcademicSession[]>(() =>
    loadList<AcademicSession>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS),
  );

  const [weeks, setWeeks] = useState<Week[]>(() =>
    loadList<Week>(STORAGE_KEYS.WEEKS, INITIAL_WEEKS),
  );

  // One boot read shared by the lesson and progress state.
  const [bootData] = useState(loadLessonsAndProgress);

  const [lessons, setLessons] = useState<Lesson[]>(bootData.lessons);

  const [progressById, setProgressById] = useState<Record<string, TeachingProgress>>(
    bootData.progressById,
  );

  const [topics, setTopics] = useState<Topic[]>(loadTopics);

  const [activeLessonId, setActiveLessonId] = useState<string | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_LESSON_ID);
    return saved || 'lesson-jss3-dt-w1';
  });

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_CLASS_ID);
    return saved || 'class-jss3';
  });

  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_SUBJECT_ID);
    return saved || 'sub-jss3-dt';
  });

  const [preferences, setPreferences] = useState<TeacherPreferences>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    try {
      const parsed = saved ? (JSON.parse(saved) as Partial<TeacherPreferences>) : null;
      if (!parsed) return DEFAULT_PREFERENCES;
      // Drop pre-Phase-1 preference fields.
      return {
        fontSize: parsed.fontSize ?? DEFAULT_PREFERENCES.fontSize,
        paperMode: parsed.paperMode ?? DEFAULT_PREFERENCES.paperMode,
        showTimingGuidance:
          parsed.showTimingGuidance ?? DEFAULT_PREFERENCES.showTimingGuidance,
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>('today');

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(classes));
  }, [classes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(weeks));
  }, [weeks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
  }, [lessons]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(progressById));
  }, [progressById]);

  useEffect(() => {
    if (activeLessonId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LESSON_ID, activeLessonId);
    }
  }, [activeLessonId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_CLASS_ID, selectedClassId);
  }, [selectedClassId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_SUBJECT_ID, selectedSubjectId);
  }, [selectedSubjectId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  }, [preferences]);

  // Read model for the UI: lesson content joined with its teaching progress.
  const lessonsWithProgress: LessonWithProgress[] = lessons.map((lesson) => {
    const progress = progressById[lesson.id];
    return {
      ...lesson,
      status: progress?.status ?? 'planned',
      currentSectionId: progress?.currentSectionId ?? null,
      completedSectionIds: progress?.completedSectionIds ?? [],
    };
  });

  const activeLesson =
    lessonsWithProgress.find((l) => l.id === activeLessonId) ?? lessonsWithProgress[0] ?? null;
  const currentSectionId = activeLesson?.currentSectionId ?? activeLesson?.sections[0]?.id ?? null;

  const patchProgress = (lessonId: string, patch: Partial<TeachingProgress>) => {
    setProgressById((prev) => {
      const existing = prev[lessonId];
      return {
        ...prev,
        [lessonId]: {
          lessonId,
          status: existing?.status ?? 'planned',
          currentSectionId: existing?.currentSectionId ?? null,
          completedSectionIds: existing?.completedSectionIds ?? [],
          lastVisitedAt: existing?.lastVisitedAt,
          ...patch,
        },
      };
    });
  };

  const selectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    const target = lessons.find((l) => l.id === lessonId);
    if (target) {
      // Derive class/subject via Topic → Week → Session → Subject.
      const scope = getLessonScope(target.topicId, topics, weeks, sessions);
      if (scope.subjectId) {
        const subject = subjects.find((s) => s.id === scope.subjectId);
        if (subject) {
          setSelectedClassId(subject.classId);
          setSelectedSubjectId(subject.id);
        }
      }
    }
    setViewMode('lesson');
  };

  const setCurrentSection = (sectionId: string) => {
    if (!activeLessonId) return;
    patchProgress(activeLessonId, {
      currentSectionId: sectionId,
      lastVisitedAt: new Date().toISOString(),
    });
  };

  const toggleSectionCompleted = (sectionId: string) => {
    if (!activeLessonId) return;
    const lessonId = activeLessonId;
    setProgressById((prev) => {
      const existing = prev[lessonId];
      const completed = existing?.completedSectionIds ?? [];
      const nextCompleted = completed.includes(sectionId)
        ? completed.filter((id) => id !== sectionId)
        : [...completed, sectionId];
      return {
        ...prev,
        [lessonId]: {
          lessonId,
          status: existing?.status ?? 'planned',
          currentSectionId: existing?.currentSectionId ?? null,
          completedSectionIds: nextCompleted,
          lastVisitedAt: existing?.lastVisitedAt,
        },
      };
    });
  };

  const updateLessonStatus = (lessonId: string, status: LessonStatus) => {
    patchProgress(lessonId, { status });
  };

  const updatePreferences = (newPrefs: Partial<TeacherPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  };

  /**
   * Keep the hierarchy reachable: an authored lesson must belong to a topic.
   * The editor passes the target weekId when creating a new topic.
   */
  const ensureTopicForLesson = (
    existing: Topic[],
    lesson: Lesson,
    fallbackWeekId?: string,
  ): Topic[] => {
    if (existing.some((topic) => topic.id === lesson.topicId)) return existing;
    const weekId =
      fallbackWeekId ?? weeks[0]?.id ?? sessions[0] ? weeks[0]?.id : undefined;
    if (!weekId) return existing;
    const order = existing.filter((topic) => topic.weekId === weekId).length + 1;
    return [
      ...existing,
      { id: lesson.topicId, weekId, title: lesson.title, order },
    ];
  };

  const saveLesson = (lesson: Lesson, options?: { weekId?: string }) => {
    setLessons((prev) => {
      const exists = prev.some((l) => l.id === lesson.id);
      if (exists) {
        return prev.map((l) => (l.id === lesson.id ? lesson : l));
      }
      return [...prev, lesson];
    });
    // Editing a lesson must never reset delivery progress it already has.
    setProgressById((prev) =>
      prev[lesson.id]
        ? prev
        : {
            ...prev,
            [lesson.id]: {
              lessonId: lesson.id,
              status: 'planned',
              currentSectionId: lesson.sections[0]?.id ?? null,
              completedSectionIds: [],
            },
          },
    );
    setTopics((prev) => ensureTopicForLesson(prev, lesson, options?.weekId));
    setActiveLessonId(lesson.id);
    setViewMode('lesson');
  };

  const resetAllData = () => {
    setClasses(INITIAL_CLASSES);
    setSubjects(INITIAL_SUBJECTS);
    setSessions(INITIAL_SESSIONS);
    setWeeks(INITIAL_WEEKS);
    setTopics(INITIAL_TOPICS);
    setLessons(INITIAL_LESSONS);
    setProgressById(toProgressRecord(INITIAL_PROGRESS));
    setActiveLessonId('lesson-jss3-dt-w1');
    setSelectedClassId('class-jss3');
    setSelectedSubjectId('sub-jss3-dt');
    setPreferences(DEFAULT_PREFERENCES);
    setViewMode('today');
  };

  return (
    <LessonContext.Provider
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
        preferences,
        selectedClassId,
        selectedSubjectId,
        viewMode,
        setSelectedClassId,
        setSelectedSubjectId,
        setViewMode,
        selectLesson,
        setCurrentSection,
        toggleSectionCompleted,
        updateLessonStatus,
        updatePreferences,
        saveLesson,
        resetAllData,
      }}
    >
      {children}
    </LessonContext.Provider>
  );
};

export const useLesson = () => {
  const context = useContext(LessonContext);
  if (!context) {
    throw new Error('useLesson must be used within a LessonProvider');
  }
  return context;
};
