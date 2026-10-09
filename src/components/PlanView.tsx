import React, { useState } from 'react';
import { useLesson } from '../context/LessonContext';
import { ArrowRight, Layers } from 'lucide-react';
import { LessonStatus, LessonWithProgress } from '../types/lesson';
import { TOPIC_STATUS_LABEL, getLessonScope, lessonsOfTopic, topicStatus } from '../utils/curriculum';
import { ClassSubjectSelector } from './ClassSubjectSelector';

type StatusFilter = 'all' | 'planned' | 'in_progress' | 'taught';

/**
 * Plan — the primary curriculum screen.
 * Class → Subject → Academic session → Week → Topic → Lesson.
 */
export const PlanView: React.FC = () => {
  const {
    classes,
    subjects,
    sessions,
    weeks,
    topics,
    lessons,
    selectedClassId,
    setSelectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    selectLesson,
    updateLessonStatus,
    setViewMode,
  } = useLesson();

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all');

  const currentClass = classes.find((c) => c.id === selectedClassId) ?? classes[0];
  const classSubjects = subjects.filter((s) => s.classId === selectedClassId);
  const currentSubject =
    classSubjects.find((s) => s.id === selectedSubjectId) ?? classSubjects[0];

  const session = sessions.find((s) => s.subjectId === currentSubject?.id);
  const sessionWeeks = session
    ? weeks
        .filter((w) => w.sessionId === session.id)
        .sort((a, b) => a.number - b.number)
    : [];

  // Lessons belong to a subject via Topic → Week → Session.
  const subjectLessons = lessons.filter((l) => {
    const scope = getLessonScope(l.topicId, topics, weeks, sessions);
    return scope.subjectId === currentSubject?.id;
  });

  const matchesFilter = (status: LessonStatus) =>
    filterStatus === 'all' || status === filterStatus;

  const filterButton = (value: StatusFilter, label: string) => (
    <button
      key={value}
      onClick={() => setFilterStatus(value)}
      className={`px-3 py-1 font-medium rounded transition-colors ${
        filterStatus === value
          ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs'
          : 'text-[#574D42] hover:text-[#1C1917]'
      }`}
    >
      {label}
    </button>
  );

  const renderLessonCard = (lesson: LessonWithProgress, showTitle: boolean) => {
    const currentSec = lesson.sections.find((s) => s.id === lesson.currentSectionId);

    return (
      <div
        key={lesson.id}
        className="p-4 bg-white/70 border border-[#E4DAC5] rounded hover:border-[#BAAEA0] transition-colors"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs font-mono text-[#786F62]">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1C1917]">{currentSubject?.name}</span>
            <span aria-hidden="true">·</span>
            <span>{lesson.durationMinutes} min</span>
          </div>

          <select
            value={lesson.status}
            onChange={(e) => updateLessonStatus(lesson.id, e.target.value as LessonStatus)}
            aria-label={`Status for ${lesson.title}`}
            className="bg-[#F2ECDD] border border-[#DDD3BF] text-[#1C1917] rounded px-2 py-0.5 text-xs font-medium cursor-pointer"
          >
            <option value="planned">Status: Planned</option>
            <option value="in_progress">Status: In Progress</option>
            <option value="taught">Status: Taught / Completed</option>
          </select>
        </div>

        {showTitle && (
          <h4 className="text-base sm:text-lg font-serif font-medium text-[#1C1917] mb-2">
            {lesson.title}
          </h4>
        )}

        {lesson.status === 'in_progress' && currentSec && (
          <div className="text-xs text-[#9A3412] font-medium mb-3 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9A3412]" />
            <span>Currently at: {currentSec.title}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#EFE8D8] text-xs">
          <span className="text-[#786F62]">{lesson.sections.length} instructional sections</span>

          <button
            onClick={() => selectLesson(lesson.id)}
            className="inline-flex items-center gap-1 px-3 py-1 bg-[#9A3412] text-white rounded font-medium hover:bg-[#852C0F] transition-colors"
          >
            <span>{lesson.status === 'in_progress' ? 'Continue' : 'Open Lesson'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 pb-6 border-b border-[#E2D8C3]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#786F62] block mb-1">
            Term curriculum plan
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1C1917] tracking-tight">
            Plan
          </h1>
          <p className="text-sm text-[#574D42] mt-1 max-w-xl">
            {currentSubject?.name} · {currentClass?.name}
            {session && (
              <>
                {' · '}
                {session.label} · Week {session.currentWeek} of {session.totalWeeks}
              </>
            )}
          </p>
        </div>

        <button
          onClick={() => setViewMode('library')}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#574D42] hover:text-[#9A3412] hover:underline self-start sm:self-auto shrink-0"
        >
          <span>Lesson library</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scope: class → subject */}
      <ClassSubjectSelector
        showClass={true}
        showSubject={true}
        classLabel="Class"
        subjectLabel="Subjects"
      />

      <div className="flex items-center gap-1 p-1 bg-[#EFE8D8] rounded-md border border-[#DDD3BF] self-start sm:self-auto text-xs">
        {filterButton('all', 'All Weeks')}
        {filterButton('in_progress', 'Active')}
        {filterButton('taught', 'Taught')}
      </div>

      {/* Week → Topic → Lesson */}
      {!session ? (
        <div className="py-16 text-center bg-[#F7F3EB] rounded-lg border border-[#E4DAC5]">
          <p className="text-sm font-medium text-[#1C1917] mb-1">
            No academic session for this subject yet.
          </p>
          <p className="text-xs text-[#786F62]">
            Choose another subject, or create lessons from the lesson library.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {sessionWeeks.map((week) => {
            const topicsOfWeek = topics
              .filter((t) => t.weekId === week.id)
              .sort((a, b) => a.order - b.order);

            const coveredTopicIds = new Set(topicsOfWeek.map((t) => t.id));
            const orphanLessons = subjectLessons.filter((l) => {
              const scope = getLessonScope(l.topicId, topics, weeks, sessions);
              return scope.weekNumber === week.number && !coveredTopicIds.has(l.topicId);
            });

            const visibleTopics = topicsOfWeek
              .map((topic) => ({
                topic,
                lessons: lessonsOfTopic(topic, lessons).filter((l) => matchesFilter(l.status)),
              }))
              .filter((entry) => filterStatus === 'all' || entry.lessons.length > 0);

            const visibleOrphans = orphanLessons.filter((l) => matchesFilter(l.status));

            const hasContent =
              filterStatus === 'all' || visibleTopics.length > 0 || visibleOrphans.length > 0;

            if (!hasContent) return null;

            const isCurrentWeek = session.currentWeek === week.number;

            return (
              <div
                key={week.id}
                className={`p-5 sm:p-6 rounded-lg border transition-all ${
                  isCurrentWeek
                    ? 'bg-[#FAF7F0] border-[#9A3412]/40 shadow-xs'
                    : 'bg-[#FAF8F3] border-[#DDD3BF]'
                }`}
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAE1CD]">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                        isCurrentWeek ? 'bg-[#9A3412] text-white' : 'bg-[#EAE0CB] text-[#574D42]'
                      }`}
                    >
                      W{week.number}
                    </div>
                    <div>
                      <h2 className="text-lg font-serif font-medium text-[#1C1917]">
                        Week {week.number}
                      </h2>
                      <span className="text-xs text-[#786F62]">
                        {topicsOfWeek.length === 0
                          ? 'No topics planned'
                          : `${topicsOfWeek.length} topic(s) outlined`}
                      </span>
                    </div>
                  </div>

                  {isCurrentWeek && (
                    <span className="text-xs font-mono font-bold text-[#9A3412] flex items-center gap-1.5 uppercase">
                      <span className="w-2 h-2 rounded-full bg-[#9A3412] animate-ping" />
                      Current week
                    </span>
                  )}
                </div>

                {topicsOfWeek.length === 0 && orphanLessons.length === 0 ? (
                  <p className="text-xs text-[#8C8375] italic py-2">
                    Nothing planned for Week {week.number} yet. Draft a lesson from the lesson
                    library.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {visibleTopics.map(({ topic, lessons: topicLessons }) => {
                      const status = topicStatus(topic, lessons);
                      const singleLesson = topicLessons.length === 1;
                      const allTopicLessons = lessonsOfTopic(topic, lessons);

                      return (
                        <div key={topic.id}>
                          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 mb-2">
                            <div className="flex flex-wrap items-baseline gap-2">
                              <Layers className="w-3.5 h-3.5 text-[#786F62] shrink-0 translate-y-0.5" />
                              <h3 className="text-base sm:text-lg font-serif font-medium text-[#1C1917]">
                                {topic.title}
                              </h3>
                            </div>
                            <span
                              className={`text-[11px] font-mono uppercase tracking-wider font-semibold ${
                                status === 'in_progress'
                                  ? 'text-[#9A3412]'
                                  : status === 'taught'
                                    ? 'text-emerald-700'
                                    : 'text-[#786F62]'
                              }`}
                            >
                              {TOPIC_STATUS_LABEL[status]}
                            </span>
                          </div>

                          {allTopicLessons.length === 0 ? (
                            <p className="text-xs text-[#8C8375] italic pl-5">
                              No lesson written for this topic yet.
                            </p>
                          ) : topicLessons.length === 0 ? (
                            <p className="text-xs text-[#8C8375] italic pl-5">
                              No lessons match this filter.
                            </p>
                          ) : (
                            <div className="space-y-3">
                              {topicLessons.map((lesson) =>
                                renderLessonCard(lesson, !singleLesson),
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {visibleOrphans.length > 0 && (
                      <div className="space-y-3">{visibleOrphans.map((lesson) => renderLessonCard(lesson, true))}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
