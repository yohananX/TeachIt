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
  LegacyLesson,
  buildTopicsFromLessons,
  splitLegacyLesson,
} from '../data/initialCurriculum';

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
  viewMode: 'library' | 'weekly' | 'lesson' | 'notebook' | 'editor';
  setSelectedClassId: (id: string) => void;
  setSelectedSubjectId: (id: string) => void;
  setViewMode: (mode: 'library' | 'weekly' | 'lesson' | 'notebook' | 'editor') => void;
  selectLesson: (lessonId: string, targetView?: 'lesson' | 'notebook') => void;
  setCurrentSection: (sectionId: string) => void;
  toggleSectionCompleted: (sectionId: string) => void;
  updateLessonStatus: (lessonId: string, status: LessonStatus) => void;
  updatePreferences: (newPrefs: Partial<TeacherPreferences>) => void;
  saveLesson: (lesson: Lesson) => void;
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
  autoSaveCurrentPosition: true,
  audioFeedbackOnStep: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Storage reads. Shape validation is intentionally shallow here; the real
// repository layer (Phase 4) owns schema checks and versioned migrations.
// A bad or missing key must never take the app down on boot.
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

const toProgressRecord = (list: TeachingProgress[]): Record<string, TeachingProgress> =>
  Object.fromEntries(list.map((progress) => [progress.lessonId, progress]));

/**
 * Boot loader. Three storage states are handled:
 *  - fresh boot: seed lessons + seed progress;
 *  - pre-Phase-1 browser: lessons carry progress inline → split it out;
 *  - post-Phase-1 browser: clean lessons + a separate progress record.
 */
function loadLessonsAndProgress(): {
  lessons: Lesson[];
  progressById: Record<string, TeachingProgress>;
} {
  const storedLessons = loadList<LegacyLesson>(STORAGE_KEYS.LESSONS, []);
  const storedProgress = loadRecord<TeachingProgress>(STORAGE_KEYS.PROGRESS, {});
  const isFreshBoot = storedLessons.length === 0;

  const split = (isFreshBoot ? INITIAL_LESSONS : storedLessons).map(splitLegacyLesson);
  const progressById = isFreshBoot
    ? toProgressRecord(INITIAL_PROGRESS)
    : toProgressRecord(split.map((entry) => entry.progress));

  return {
    lessons: split.map((entry) => entry.lesson),
    progressById: { ...progressById, ...storedProgress },
  };
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

  const [topics, setTopics] = useState<Topic[]>(() => {
    const stored = loadList<Topic>(STORAGE_KEYS.TOPICS, []);
    return stored.length > 0 ? stored : buildTopicsFromLessons(lessons, sessions, weeks);
  });

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
      return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [viewMode, setViewMode] = useState<'library' | 'weekly' | 'lesson' | 'notebook' | 'editor'>('lesson');

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

  const selectLesson = (lessonId: string, targetView: 'lesson' | 'notebook' = 'lesson') => {
    setActiveLessonId(lessonId);
    const target = lessons.find((l) => l.id === lessonId);
    if (target) {
      setSelectedClassId(target.classId);
      setSelectedSubjectId(target.subjectId);
    }
    setViewMode(targetView);
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
   * Keep the hierarchy reachable: an authored lesson must belong to a topic in
   * its week, otherwise it would never appear in the weekly plan.
   */
  const ensureTopicForLesson = (existing: Topic[], lesson: Lesson): Topic[] => {
    if (existing.some((topic) => topic.lessonIds.includes(lesson.id))) return existing;

    const session = sessions.find((s) => s.subjectId === lesson.subjectId);
    const week = session
      ? weeks.find((w) => w.sessionId === session.id && w.number === lesson.week)
      : undefined;
    if (!week) return existing; // outside the seeded term: attach once the week exists

    const order = existing.filter((topic) => topic.weekId === week.id).length + 1;
    return [
      ...existing,
      {
        id: `topic-${lesson.id}`,
        weekId: week.id,
        title: lesson.topic,
        order,
        lessonIds: [lesson.id],
      },
    ];
  };

  const saveLesson = (lesson: Lesson) => {
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
    setTopics((prev) => ensureTopicForLesson(prev, lesson));
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
    setViewMode('lesson');
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
