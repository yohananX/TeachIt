import {
  AcademicSession,
  LessonStatus,
  LessonWithProgress,
  Topic,
  Week,
} from '../types/lesson';

/**
 * Status of a topic as seen while planning: derived from the progress of the
 * lessons attached to it, never stored. 'not_prepared' means the topic exists
 * in the plan but has no lesson written for it yet.
 */
export type TopicStatus = 'not_prepared' | LessonStatus;

export const lessonsOfTopic = (
  topic: Topic,
  lessons: LessonWithProgress[],
): LessonWithProgress[] => lessons.filter((lesson) => lesson.topicId === topic.id);

export const topicStatus = (topic: Topic, lessons: LessonWithProgress[]): TopicStatus => {
  const topicLessons = lessonsOfTopic(topic, lessons);
  if (topicLessons.length === 0) return 'not_prepared';
  if (topicLessons.some((lesson) => lesson.status === 'in_progress')) return 'in_progress';
  if (topicLessons.every((lesson) => lesson.status === 'taught')) return 'taught';
  return 'planned';
};

export const TOPIC_STATUS_LABEL: Record<TopicStatus, string> = {
  not_prepared: 'No lesson yet',
  planned: 'Planned',
  in_progress: 'In progress',
  taught: 'Taught',
};

// ─────────────────────────────────────────────────────────────────────────────
// Hierarchy resolvers: Lesson → Topic → Week → Session → Subject → Class.
// Lessons carry only topicId; everything else is derived via joins.
// ─────────────────────────────────────────────────────────────────────────────

export const getTopicOfLesson = (
  lessonTopicId: string,
  topics: Topic[],
): Topic | undefined => topics.find((t) => t.id === lessonTopicId);

export const getWeekOfTopic = (topic: Topic | undefined, weeks: Week[]): Week | undefined =>
  topic ? weeks.find((w) => w.id === topic.weekId) : undefined;

export const getSessionOfWeek = (
  week: Week | undefined,
  sessions: AcademicSession[],
): AcademicSession | undefined =>
  week ? sessions.find((s) => s.id === week.sessionId) : undefined;

export interface LessonScope {
  topic?: Topic;
  week?: Week;
  session?: AcademicSession;
  subjectId?: string;
  classId?: string;
  weekNumber?: number;
}

export const getLessonScope = (
  lessonTopicId: string,
  topics: Topic[],
  weeks: Week[],
  sessions: AcademicSession[],
): LessonScope => {
  const topic = getTopicOfLesson(lessonTopicId, topics);
  const week = getWeekOfTopic(topic, weeks);
  const session = getSessionOfWeek(week, sessions);
  return {
    topic,
    week,
    session,
    subjectId: session?.subjectId,
    weekNumber: week?.number,
  };
};
