import React from 'react';
import { useLesson } from '../context/LessonContext';
import { LessonStatus } from '../types/lesson';
import { TOPIC_STATUS_LABEL, getLessonScope, lessonsOfTopic, topicStatus } from '../utils/curriculum';
import { ArrowRight, Play, Compass } from 'lucide-react';

/**
 * Home / Today — the answer to "what do I teach now, and what comes next?"
 * Deliberately small: identity, position, this week's topics.
 */
export const TodayView: React.FC = () => {
  const {
    classes,
    subjects,
    sessions,
    weeks,
    topics,
    lessons,
    selectedClassId,
    selectedSubjectId,
    activeLesson,
    currentSectionId,
    setViewMode,
    selectLesson,
  } = useLesson();

  const currentClass = classes.find((c) => c.id === selectedClassId) ?? classes[0];
  const currentSubject =
    subjects.find((s) => s.id === selectedSubjectId && s.classId === selectedClassId) ??
    subjects.find((s) => s.classId === selectedClassId) ??
    subjects[0];

  const session = sessions.find((s) => s.subjectId === currentSubject?.id);
  const currentWeek = session
    ? weeks.find((w) => w.sessionId === session.id && w.number === session.currentWeek)
    : undefined;
  const weekTopics = currentWeek
    ? topics
        .filter((topic) => topic.weekId === currentWeek.id)
        .sort((a, b) => a.order - b.order)
    : [];

  const currentSection = activeLesson?.sections.find((s) => s.id === currentSectionId);
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const statusText = (status: LessonStatus) =>
    status === 'taught' ? '✓ Taught' : status === 'in_progress' ? 'In progress' : 'Planned';

  const activeScope = activeLesson
    ? getLessonScope(activeLesson.topicId, topics, weeks, sessions)
    : null;
  const activeSubject = activeScope
    ? subjects.find((s) => s.id === activeScope.subjectId)
    : undefined;
  const activeClass = activeSubject
    ? classes.find((c) => c.id === activeSubject.classId)
    : undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-28">
      <div className="mb-8 pb-6 border-b border-[#E2D8C3]">
        <span className="text-xs font-mono uppercase tracking-widest text-[#786F62] block mb-1">
          Today
        </span>
        <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1C1917] tracking-tight">
          {today}
        </h1>
        <p className="text-sm text-[#574D42] mt-1">
          {[currentClass?.name, currentSubject?.name, session?.label].filter(Boolean).join(' · ')}
          {session && (
            <>
              <span aria-hidden="true"> · </span>
              <span className="font-semibold text-[#1C1917]">
                Week {session.currentWeek} of {session.totalWeeks}
              </span>
            </>
          )}
        </p>
      </div>

      {activeLesson ? (
        <section className="bg-[#FAF8F3] border border-[#DDD3BF] border-l-[3px] border-l-[#9A3412] rounded-lg p-5 sm:p-6 mb-10">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono uppercase tracking-widest text-[#9A3412] font-semibold">
              Continue teaching
            </span>
            <span className="text-xs font-mono text-[#786F62]">{statusText(activeLesson.status)}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-serif font-medium text-[#1C1917] tracking-tight mb-2">
            {activeLesson.title}
          </h2>

          <p className="text-xs font-mono uppercase tracking-wider text-[#786F62] mb-4">
            {activeClass?.name} · {activeSubject?.name}
            {activeScope?.weekNumber != null && <> · Week {activeScope.weekNumber}</>} ·{' '}
            {activeLesson.durationMinutes} min
          </p>

          {currentSection && (
            <p className="text-sm text-[#9A3412] font-medium mb-5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#9A3412]" />
              <span>Currently at: {currentSection.title}</span>
            </p>
          )}

          <button
            onClick={() => setViewMode('lesson')}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9A3412] hover:bg-[#852C0F] text-white text-sm font-semibold rounded transition-colors"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Resume teaching</span>
          </button>
        </section>
      ) : (
        <section className="bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg p-6 mb-10 text-center">
          <p className="text-sm font-medium text-[#1C1917] mb-1">No lesson open yet.</p>
          <p className="text-xs text-[#786F62] mb-4">
            Pick a class and subject in the plan to see what comes next.
          </p>
          <button
            onClick={() => setViewMode('plan')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors"
          >
            <span>Open the plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </section>
      )}

      <section>
        <div className="flex items-end justify-between pb-3 mb-4 border-b border-[#E2D8C3]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#786F62] block">
              {session?.label ?? 'This term'}
            </span>
            <h2 className="text-xl font-serif font-medium text-[#1C1917]">
              This week{currentWeek ? ` · Week ${currentWeek.number}` : ''}
            </h2>
          </div>
          <button
            onClick={() => setViewMode('plan')}
            className="flex items-center gap-1 min-h-[36px] px-2 -mx-2 text-xs font-medium text-[#9A3412] hover:underline"
          >
            <span>Full plan</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {!session || !currentWeek ? (
          <p className="text-sm text-[#786F62] italic py-3">
            No academic session found for this subject yet.
          </p>
        ) : weekTopics.length === 0 ? (
          <p className="text-sm text-[#786F62] italic py-3">
            Nothing planned for Week {currentWeek.number} yet.
          </p>
        ) : (
          <div className="divide-y divide-[#EAE1CD]">
            {weekTopics.map((topic) => {
              const status = topicStatus(topic, lessons);
              const topicLessons = lessonsOfTopic(topic, lessons);
              const sectionCount = topicLessons.reduce((sum, l) => sum + l.sections.length, 0);

              return (
                <div key={topic.id} className="py-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span
                      className={`text-xs font-mono uppercase tracking-wider font-semibold flex items-center gap-1.5 mb-1 ${
                        status === 'in_progress'
                          ? 'text-[#9A3412]'
                          : status === 'taught'
                            ? 'text-emerald-700'
                            : 'text-[#786F62]'
                      }`}
                    >
                      {status === 'in_progress' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#9A3412]" />
                      )}
                      {TOPIC_STATUS_LABEL[status]}
                    </span>
                    <h3 className="text-lg font-serif font-medium text-[#1C1917] leading-snug">
                      {topic.title}
                    </h3>
                    <span className="text-xs text-[#786F62]">
                      {topicLessons.length === 0
                        ? 'No lesson written yet'
                        : `${topicLessons.length} lesson${topicLessons.length > 1 ? 's' : ''} · ${sectionCount} sections`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {topicLessons.map((lesson) => (
                      <button
                        key={lesson.id}
                        onClick={() => selectLesson(lesson.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>{lesson.status === 'in_progress' ? 'Continue' : 'Open lesson'}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
