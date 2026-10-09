import React, { useState } from 'react';
import { useLesson } from '../context/LessonContext';
import { Plus, Play, Search } from 'lucide-react';
import { getLessonScope } from '../utils/curriculum';

interface LessonLibraryViewProps {
  onOpenNewLesson: () => void;
}

export const LessonLibraryView: React.FC<LessonLibraryViewProps> = ({ onOpenNewLesson }) => {
  const {
    classes,
    subjects,
    topics,
    weeks,
    sessions,
    lessons,
    selectedClassId,
    setSelectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
    selectLesson,
  } = useLesson();

  const [searchQuery, setSearchQuery] = useState('');

  const classSubjects = subjects.filter((s) => s.classId === selectedClassId);

  const filteredLessons = lessons.filter((l) => {
    const scope = getLessonScope(l.topicId, topics, weeks, sessions);
    const subject = subjects.find((s) => s.id === scope.subjectId);
    const matchesClass = subject?.classId === selectedClassId;
    const matchesSubject = !selectedSubjectId || scope.subjectId === selectedSubjectId;
    const matchesSearch =
      !searchQuery ||
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      scope.topic?.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesClass && matchesSubject && matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-28">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-[#E2D8C3]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#786F62] block mb-1">
            Teacher Lesson Vault
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1C1917] tracking-tight">
            Curriculum & Lesson Library
          </h1>
          <p className="text-sm text-[#574D42] mt-1 max-w-xl">
            Select your class and subject. No file directories, no lost Word documents. Open and teach immediately.
          </p>
        </div>

        <button
          onClick={onOpenNewLesson}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Lesson Plan</span>
        </button>
      </div>

      <div className="mb-6">
        <label className="text-xs font-mono uppercase tracking-wider text-[#786F62] block mb-2">
          Select Active Class:
        </label>
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#F2ECDD] rounded-lg border border-[#DDD3BF]">
          {classes.map((c) => {
            const isSelected = c.id === selectedClassId;
            return (
              <button
                key={c.id}
                onClick={() => {
                  setSelectedClassId(c.id);
                  const firstSub = subjects.find((s) => s.classId === c.id);
                  if (firstSub) setSelectedSubjectId(firstSub.id);
                }}
                className={`px-4 py-2 text-xs sm:text-sm font-medium rounded transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs font-semibold'
                    : 'text-[#574D42] hover:text-[#1C1917]'
                }`}
              >
                <span>{c.name}</span>
                {c.arm && <span className="ml-1 text-[11px] text-[#786F62]">({c.arm})</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-mono text-[#786F62] mr-1 hidden sm:inline">Subjects:</span>
          {classSubjects.map((sub) => {
            const isSelected = sub.id === selectedSubjectId;
            return (
              <button
                key={sub.id}
                onClick={() => setSelectedSubjectId(sub.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-[#1C1917] text-white border-[#1C1917]'
                    : 'bg-[#FAF8F3] text-[#574D42] border-[#DDD3BF] hover:bg-[#F2ECDD]'
                }`}
              >
                {sub.name}
              </button>
            );
          })}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-[#8C8375] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search topics or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF8F3] border border-[#DDD3BF] rounded text-[#1C1917] placeholder-[#8C8375] focus:outline-none focus:border-[#9A3412]"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filteredLessons.length === 0 ? (
          <div className="py-16 text-center bg-[#F7F3EB] rounded-lg border border-[#E4DAC5]">
            <p className="text-sm font-medium text-[#1C1917] mb-1">No lessons found for this subject.</p>
            <p className="text-xs text-[#786F62] mb-4">You can draft a new lesson plan in seconds.</p>
            <button
              onClick={onOpenNewLesson}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#9A3412] text-white text-xs font-semibold rounded hover:bg-[#852C0F] transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Week Lesson</span>
            </button>
          </div>
        ) : (
          filteredLessons.map((lesson) => {
            const currentSec = lesson.sections.find((s) => s.id === lesson.currentSectionId);
            const isInProgress = lesson.status === 'in_progress';
            const isTaught = lesson.status === 'taught';
            const scope = getLessonScope(lesson.topicId, topics, weeks, sessions);
            const subjectName = subjects.find((s) => s.id === scope.subjectId)?.name ?? '';

            return (
              <div
                key={lesson.id}
                className="bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg p-5 hover:border-[#BAAEA0] transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono uppercase tracking-wider text-[#786F62] mb-2">
                  <div className="flex items-center gap-2">
                    {scope.weekNumber != null && (
                      <span className="font-semibold text-[#1C1917]">Week {scope.weekNumber}</span>
                    )}
                    {scope.weekNumber != null && <span aria-hidden="true">·</span>}
                    <span>{subjectName}</span>
                    <span aria-hidden="true">·</span>
                    <span>{lesson.durationMinutes} min</span>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    {isInProgress && (
                      <span className="text-[#9A3412] font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#9A3412] animate-pulse" />
                        In Progress
                      </span>
                    )}
                    {isTaught && (
                      <span className="text-emerald-700 font-semibold">
                        ✓ Taught
                      </span>
                    )}
                    {lesson.status === 'planned' && (
                      <span className="text-[#786F62]">
                        Planned
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="text-xl sm:text-2xl font-serif font-medium text-[#1C1917] tracking-tight mb-1">
                  {lesson.title}
                </h3>
                {scope.topic && scope.topic.title !== lesson.title && (
                  <p className="text-xs text-[#786F62] italic mb-2">Topic: {scope.topic.title}</p>
                )}

                <div className="text-xs text-[#574D42] mb-4 space-y-1">
                  <span className="font-semibold text-[#1C1917]">Objectives preview:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[#443E37]">
                    {lesson.learningObjectives.slice(0, 2).map((obj, i) => (
                      <li key={i} className="truncate">{obj}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-3 border-t border-[#EAE1CD] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs">
                    {isInProgress && currentSec ? (
                      <span className="text-[#9A3412] font-medium flex items-center gap-1">
                        <span className="font-mono font-bold">Resume point:</span>
                        <span>{currentSec.title}</span>
                      </span>
                    ) : (
                      <span className="text-[#786F62]">
                        {lesson.sections.length} instructional sections
                        {lesson.studentNotes ? ' · Student note ready' : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => selectLesson(lesson.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>{isInProgress ? 'Continue Teaching' : 'Open Lesson'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
