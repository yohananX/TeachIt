import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  saveLesson: (lesson: Lesson, options?: { weekId?: string }) => void;
  getTaughtLessonsForSubject: (subjectId: string) => LessonWithProgress[];
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

const CurriculumContext = createContext<CurriculumContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────────────────────
// CurriculumProvider — owns repository sync + domain mutations
// ─────────────────────────────────────────────────────────────────────────────
export const CurriculumProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [, setBootTick] = useState(0);

  // Load repository once at boot
  useEffect(() => {
    curriculumRepository.loadAll();
    setBootTick((t) => t + 1);
  }, []);

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
    if (activeLessonId) localStorage.setItem(STORAGE_KEYS.ACTIVE_LESSON_ID, activeLessonId);
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
  }, []);

  const setCurrentSection = useCallback((sectionId: string) => {
    if (!activeLessonId) return;
    curriculumRepository.setCurrentSection(activeLessonId, sectionId);
    setBootTick((t) => t + 1);
  }, [activeLessonId]);

  const toggleSectionCompleted = useCallback((sectionId: string) => {
    if (!activeLessonId) return;
    curriculumRepository.toggleSectionCompleted(activeLessonId, sectionId);
    setBootTick((t) => t + 1);
  }, [activeLessonId]);

  const updateLessonStatus = useCallback((lessonId: string, status: LessonStatus) => {
    curriculumRepository.updateLessonStatus(lessonId, status);
    setBootTick((t) => t + 1);
  }, []);

  const saveLesson = useCallback((lesson: Lesson, options?: { weekId?: string }) => {
    curriculumRepository.saveLesson(lesson, options);
    setBootTick((t) => t + 1);
  }, []);

  const getTaughtLessonsForSubject = useCallback((subjectId: string) => {
    return curriculumRepository.getTaughtLessonsForSubject(subjectId);
  }, []);

  const resetAllData = useCallback(() => {
    curriculumRepository.resetAll();
    setActiveLessonIdState('lesson-jss3-dt-w1');
    setBootTick((t) => t + 1);
  }, []);

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
        getTaughtLessonsForSubject,
        resetAllData,
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