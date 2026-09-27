import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  ClassItem,
  SubjectItem,
  Lesson,
  LessonStatus,
  TeacherPreferences,
  FontSizeSetting,
  ThemePaperMode,
} from '../types/lesson';
import { INITIAL_CLASSES, INITIAL_SUBJECTS, INITIAL_LESSONS } from '../data/initialCurriculum';

interface LessonContextType {
  classes: ClassItem[];
  subjects: SubjectItem[];
  lessons: Lesson[];
  activeLessonId: string | null;
  activeLesson: Lesson | null;
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
  deleteLesson: (lessonId: string) => void;
  resetAllData: () => void;
}

const STORAGE_KEYS = {
  CLASSES: 'teachit_classes_v1',
  SUBJECTS: 'teachit_subjects_v1',
  LESSONS: 'teachit_lessons_v1',
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

const LessonContext = createContext<LessonContextType | undefined>(undefined);

export const LessonProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [classes, setClasses] = useState<ClassItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLASSES);
    return saved ? JSON.parse(saved) : INITIAL_CLASSES;
  });

  const [subjects, setSubjects] = useState<SubjectItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
  });

  const [lessons, setLessons] = useState<Lesson[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LESSONS);
    return saved ? JSON.parse(saved) : INITIAL_LESSONS;
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
    return saved ? JSON.parse(saved) : DEFAULT_PREFERENCES;
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
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(lessons));
  }, [lessons]);

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

  const activeLesson = lessons.find((l) => l.id === activeLessonId) || lessons[0] || null;
  const currentSectionId = activeLesson?.currentSectionId || activeLesson?.sections[0]?.id || null;

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
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id === activeLessonId) {
          return {
            ...l,
            currentSectionId: sectionId,
            lastVisitedTimestamp: new Date().toISOString(),
          };
        }
        return l;
      })
    );
  };

  const toggleSectionCompleted = (sectionId: string) => {
    if (!activeLessonId) return;
    setLessons((prev) =>
      prev.map((l) => {
        if (l.id === activeLessonId) {
          const isDone = l.completedSectionIds.includes(sectionId);
          const nextCompleted = isDone
            ? l.completedSectionIds.filter((id) => id !== sectionId)
            : [...l.completedSectionIds, sectionId];
          return { ...l, completedSectionIds: nextCompleted };
        }
        return l;
      })
    );
  };

  const updateLessonStatus = (lessonId: string, status: LessonStatus) => {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, status } : l))
    );
  };

  const updatePreferences = (newPrefs: Partial<TeacherPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  };

  const saveLesson = (lesson: Lesson) => {
    setLessons((prev) => {
      const exists = prev.some((l) => l.id === lesson.id);
      if (exists) {
        return prev.map((l) => (l.id === lesson.id ? lesson : l));
      }
      return [...prev, lesson];
    });
    setActiveLessonId(lesson.id);
    setViewMode('lesson');
  };

  const deleteLesson = (lessonId: string) => {
    setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    if (activeLessonId === lessonId) {
      const remaining = lessons.filter((l) => l.id !== lessonId);
      setActiveLessonId(remaining[0]?.id || null);
    }
  };

  const resetAllData = () => {
    setClasses(INITIAL_CLASSES);
    setSubjects(INITIAL_SUBJECTS);
    setLessons(INITIAL_LESSONS);
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
        lessons,
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
        deleteLesson,
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
