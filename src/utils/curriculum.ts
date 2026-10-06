import { LessonStatus, LessonWithProgress, Topic } from '../types/lesson';

/**
 * Status of a topic as seen while planning: derived from the progress of the
 * lessons attached to it, never stored. 'not_prepared' means the topic exists
 * in the plan but has no lesson written for it yet.
 */
export type TopicStatus = 'not_prepared' | LessonStatus;

export const lessonsOfTopic = (
  topic: Topic,
  lessons: LessonWithProgress[],
): LessonWithProgress[] => lessons.filter((lesson) => topic.lessonIds.includes(lesson.id));

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
