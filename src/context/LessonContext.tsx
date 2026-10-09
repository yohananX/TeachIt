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
  curriculumRepository,
  TopicStatus,
  TOPIC_STATUS_LABEL,
  getLessonScope,
  lessonsOfTopic,
  topicStatus,
} from '../services/curriculumRepository';

/**
 * UI navigation state only — never persisted, never domain data.
 * Four destinations: Home/Today, Plan, Lesson (teach mode) and the secondary
 * lesson library.
 */
export type ViewMode = 'today' | 'plan' | 'lesson' | 'library';

interface LessonContextType {
  // Domain data (delegated to repository)
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

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load repository once at boot
  const [, setBootTick] = useState(0);
  useEffect(() => {
    curriculumRepository.loadAll();
    setBootTick((t) => t + 1);
  }, []);

  // UI state
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
      return {
        fontSize: parsed.fontSize ?? DEFAULT_PREFERENCES.fontSize,
        paperMode: parsed.paperMode ?? DEFAULT_PREFERENCES.paperMode,
        showTimingGuidance: parsed.showTimingGuidance ?? DEFAULT_PREFERENCES.showTimingGuidance,
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  const [viewMode, setViewMode] = useState<ViewMode>('today');

  // Sync UI state to localStorage
  useEffect(() => {
    if (activeLessonId) localStorage.setItem(STORAGE_KEYS.ACTIVE_LESSON_ID, activeLessonId);
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

  // Domain data — read from repository (reactive via boot tick)
  const classes = curriculumRepository.getClasses();
  const subjects = curriculumRepository.getSubjects();
  const sessions = curriculumRepository.getSessions();
  const weeks = curriculumRepository.getWeeks();
  const topics = curriculumRepository.getTopics();
  const lessonsWithProgress = curriculumRepository.getAllLessonsWithProgress();
  const progressById = curriculumRepository.getAllProgress();

  // Derived active lesson & section
  const activeLesson =
    lessonsWithProgress.find((l) => l.id === activeLessonId) ?? lessonsWithProgress[0] ?? null;
  const currentSectionId = activeLesson?.currentSectionId ?? activeLesson?.sections[0]?.id ?? null;

  const patchProgress = (lessonId: string, patch: Partial<TeachingProgress>) => {
    curriculumRepository.updateProgress(lessonId, patch);
    // Force re-render by toggling a dummy state — repository is the source of truth
    setBootTick((t) => t + 1);
  };

  const selectLesson = (lessonId: string) => {
    setActiveLessonId(lessonId);
    const scope = curriculumRepository.getLessonScope(lessonId);
    if (scope.subjectId) {
      const subject = subjects.find((s) => s.id === scope.subjectId);
      if (subject) {
        setSelectedClassId(subject.classId);
        setSelectedSubjectId(subject.id);
      }
    }
    setViewMode('lesson');
  };

  const setCurrentSection = (sectionId: string) => {
    if (!activeLessonId) return;
    curriculumRepository.setCurrentSection(activeLessonId, sectionId);
    setBootTick((t) => t + 1);
  };

  const toggleSectionCompleted = (sectionId: string) => {
    if (!activeLessonId) return;
    curriculumRepository.toggleSectionCompleted(activeLessonId, sectionId);
    setBootTick((t) => t + 1);
  };

  const updateLessonStatus = (lessonId: string, status: LessonStatus) => {
    curriculumRepository.updateLessonStatus(lessonId, status);
    setBootTick((t) => t + 1);
  };

  const updatePreferences = (newPrefs: Partial<TeacherPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  };

  const saveLesson = (lesson: Lesson, options?: { weekId?: string }) => {
    curriculumRepository.saveLesson(lesson, options);
    setBootTick((t) => t + 1);
  };

  const resetAllData = () => {
    curriculumRepository.resetAll();
    setActiveLessonId('lesson-jss3-dt-w1');
    setSelectedClassId('class-jss3');
    setSelectedSubjectId('sub-jss3-dt');
    setPreferences(DEFAULT_PREFERENCES);
    setViewMode('today');
    setBootTick((t) => t + 1);
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

// Re-export curriculum helpers for components that need them
export type { TopicStatus } from '../utils/curriculum';
export { TOPIC_STATUS_LABEL, getLessonScope, lessonsOfTopic, topicStatus } from '../utils/curriculum';