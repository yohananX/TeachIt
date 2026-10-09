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
  Object.fromEntries(list.map((p) => [p.lessonId, p]));

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

  /** Load all data from localStorage (or seed). Call once at app boot. */
  loadAll(): void {
    if (this._loaded) return;

    const storedLessons = loadList<unknown>(STORAGE_KEYS.LESSONS, []);
    const validStored = storedLessons.filter(isNewLessonShape);

    if (validStored.length === 0) {
      this._lessons = INITIAL_LESSONS;
      this._progressById = toProgressRecord(INITIAL_PROGRESS);
    } else {
      this._lessons = validStored;
      const storedProgress = loadRecord<TeachingProgress>(STORAGE_KEYS.PROGRESS, {});
      this._progressById = { ...toProgressRecord(INITIAL_PROGRESS), ...storedProgress };
    }

    this._classes = loadList<ClassItem>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES);
    this._subjects = loadList<SubjectItem>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
    this._sessions = loadList<AcademicSession>(STORAGE_KEYS.SESSIONS, INITIAL_SESSIONS);
    this._weeks = loadList<Week>(STORAGE_KEYS.WEEKS, INITIAL_WEEKS);

    const storedTopics = loadList<unknown>(STORAGE_KEYS.TOPICS, []);
    const validTopics = storedTopics.filter(isNewTopicShape);
    this._topics = validTopics.length > 0 ? validTopics : INITIAL_TOPICS;

    this._loaded = true;
  }

  /** Persist all dirty state to localStorage. */
  saveAll(): void {
    localStorage.setItem(STORAGE_KEYS.CLASSES, JSON.stringify(this._classes));
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(this._subjects));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(this._sessions));
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(this._weeks));
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(this._topics));
    localStorage.setItem(STORAGE_KEYS.LESSONS, JSON.stringify(this._lessons));
    localStorage.setItem(STORAGE_KEYS.PROGRESS, JSON.stringify(this._progressById));
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

  // ─────────────────────────────────────────────────────────────────────────────
  // WRITE API
  // ─────────────────────────────────────────────────────────────────────────────

  saveLesson(lesson: Lesson, options?: { weekId?: string }): void {
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
    if (options?.weekId) this.ensureTopicForLesson(lesson, options.weekId);
    this.saveAll();
  }

  private ensureTopicForLesson(lesson: Lesson, weekId: string): void {
    if (this._topics.some((t) => t.id === lesson.topicId)) return;
    const order = this._topics.filter((t) => t.weekId === weekId).length + 1;
    this._topics.push({ id: lesson.topicId, weekId, title: lesson.title, order });
    this.saveAll();
  }

  updateProgress(lessonId: string, patch: Partial<TeachingProgress>): void {
    const existing = this._progressById[lessonId];
    this._progressById[lessonId] = {
      lessonId,
      status: existing?.status ?? 'planned',
      currentSectionId: existing?.currentSectionId ?? null,
      completedSectionIds: existing?.completedSectionIds ?? [],
      lastVisitedAt: existing?.lastVisitedAt,
      ...patch,
    };
    this.saveAll();
  }

  updateLessonStatus(lessonId: string, status: LessonStatus): void {
    this.updateProgress(lessonId, { status });
  }

  setCurrentSection(lessonId: string, sectionId: string): void {
    this.updateProgress(lessonId, { currentSectionId: sectionId, lastVisitedAt: new Date().toISOString() });
  }

  toggleSectionCompleted(lessonId: string, sectionId: string): void {
    const existing = this._progressById[lessonId];
    const completed = existing?.completedSectionIds ?? [];
    const nextCompleted = completed.includes(sectionId)
      ? completed.filter((id) => id !== sectionId)
      : [...completed, sectionId];
    this.updateProgress(lessonId, { completedSectionIds: nextCompleted });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RESET / SEED
  // ─────────────────────────────────────────────────────────────────────────────

  resetAll(): void {
    this._classes = INITIAL_CLASSES;
    this._subjects = INITIAL_SUBJECTS;
    this._sessions = INITIAL_SESSIONS;
    this._weeks = INITIAL_WEEKS;
    this._topics = INITIAL_TOPICS;
    this._lessons = INITIAL_LESSONS;
    this._progressById = toProgressRecord(INITIAL_PROGRESS);
    this.saveAll();
  }
}

/** Singleton instance for the app lifetime. */
export const curriculumRepository = new CurriculumRepository();

/** Re-export curriculum helpers for convenience. */
export type { TopicStatus } from '../utils/curriculum';
export { TOPIC_STATUS_LABEL, getLessonScope, lessonsOfTopic, topicStatus } from '../utils/curriculum';