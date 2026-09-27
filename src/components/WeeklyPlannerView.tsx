import React, { useState } from 'react';
import { useLesson } from '../context/LessonContext';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  BookOpen,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { LessonStatus } from '../types/lesson';

export const WeeklyPlannerView: React.FC = () => {
  const { lessons, classes, subjects, selectedClassId, setSelectedClassId, selectLesson, updateLessonStatus } = useLesson();
  const [filterStatus, setFilterStatus] = useState<'all' | 'planned' | 'in_progress' | 'taught'>('all');

  const classLessons = lessons.filter((l) => l.classId === selectedClassId);

  // Group lessons by week
  const weekMap: Record<number, typeof lessons> = {};
  for (let w = 1; w <= 6; w++) {
    weekMap[w] = [];
  }
  classLessons.forEach((l) => {
    if (!weekMap[l.week]) weekMap[l.week] = [];
    weekMap[l.week].push(l);
  });

  const allWeeks = Object.keys(weekMap).map(Number).sort((a, b) => a - b);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-28">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8 pb-6 border-b border-[#E2D8C3]">
        <div>
          <span className="text-xs font-mono uppercase tracking-widest text-[#786F62] block mb-1">
            Term Curriculum Timeline
          </span>
          <h1 className="text-3xl sm:text-4xl font-serif font-medium text-[#1C1917] tracking-tight">
            Weekly Lesson Planner
          </h1>
          <p className="text-sm text-[#574D42] mt-1 max-w-xl">
            Track planned material, in-progress delivery, and completed curriculum. Multiple topics and revisions per week supported.
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex items-center gap-1 p-1 bg-[#EFE8D8] rounded-md border border-[#DDD3BF] self-start sm:self-auto text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 font-medium rounded transition-colors ${
              filterStatus === 'all' ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs' : 'text-[#574D42] hover:text-[#1C1917]'
            }`}
          >
            All Weeks
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1 font-medium rounded transition-colors ${
              filterStatus === 'in_progress' ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs' : 'text-[#574D42] hover:text-[#1C1917]'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterStatus('taught')}
            className={`px-3 py-1 font-medium rounded transition-colors ${
              filterStatus === 'taught' ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs' : 'text-[#574D42] hover:text-[#1C1917]'
            }`}
          >
            Taught
          </button>
        </div>
      </div>

      {/* Week Timeline Columns */}
      <div className="space-y-8">
        {allWeeks.map((weekNum) => {
          let weekItems = weekMap[weekNum] || [];

          if (filterStatus !== 'all') {
            weekItems = weekItems.filter((l) => l.status === filterStatus);
          }

          if (filterStatus !== 'all' && weekItems.length === 0) return null;

          const isCurrentTeachingWeek = weekItems.some((l) => l.status === 'in_progress');

          return (
            <div
              key={weekNum}
              className={`p-5 sm:p-6 rounded-lg border transition-all ${
                isCurrentTeachingWeek
                  ? 'bg-[#FAF7F0] border-[#9A3412]/40 shadow-xs'
                  : 'bg-[#FAF8F3] border-[#DDD3BF]'
              }`}
            >
              {/* Week Title & State */}
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#EAE1CD]">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-mono font-bold text-xs ${
                    isCurrentTeachingWeek ? 'bg-[#9A3412] text-white' : 'bg-[#EAE0CB] text-[#574D42]'
                  }`}>
                    W{weekNum}
                  </div>
                  <div>
                    <h2 className="text-lg font-serif font-medium text-[#1C1917]">
                      Week {weekNum}
                    </h2>
                    <span className="text-xs text-[#786F62]">
                      {weekItems.length === 0 ? 'No lesson notes scheduled' : `${weekItems.length} topic(s) outlined`}
                    </span>
                  </div>
                </div>

                {isCurrentTeachingWeek && (
                  <span className="text-xs font-mono font-bold text-[#9A3412] flex items-center gap-1.5 uppercase">
                    <span className="w-2 h-2 rounded-full bg-[#9A3412] animate-ping" />
                    Current Teaching Week
                  </span>
                )}
              </div>

              {/* Week Items */}
              {weekItems.length === 0 ? (
                <p className="text-xs text-[#8C8375] italic py-2">
                  No lesson notes recorded for Week {weekNum}. Draft a lesson from the library.
                </p>
              ) : (
                <div className="space-y-3">
                  {weekItems.map((lesson) => {
                    const currentSec = lesson.sections.find((s) => s.id === lesson.currentSectionId);

                    return (
                      <div
                        key={lesson.id}
                        className="p-4 bg-white/70 border border-[#E4DAC5] rounded hover:border-[#BAAEA0] transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs font-mono text-[#786F62]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1C1917]">{lesson.subjectName}</span>
                            <span>·</span>
                            <span>{lesson.durationMinutes}</span>
                            {lesson.isRevision && (
                              <>
                                <span>·</span>
                                <span className="text-[#9A3412] font-semibold">Revision Topic</span>
                              </>
                            )}
                          </div>

                          {/* Status toggle pill/segmented */}
                          <div className="flex items-center gap-1 text-[11px]">
                            <select
                              value={lesson.status}
                              onChange={(e) => updateLessonStatus(lesson.id, e.target.value as LessonStatus)}
                              className="bg-[#F2ECDD] border border-[#DDD3BF] text-[#1C1917] rounded px-2 py-0.5 text-xs font-medium cursor-pointer"
                            >
                              <option value="planned">Status: Planned</option>
                              <option value="in_progress">Status: In Progress</option>
                              <option value="taught">Status: Taught / Completed</option>
                            </select>
                          </div>
                        </div>

                        <h3 className="text-base sm:text-lg font-serif font-medium text-[#1C1917] mb-2">
                          {lesson.topic}
                        </h3>

                        {lesson.status === 'in_progress' && currentSec && (
                          <div className="text-xs text-[#9A3412] font-medium mb-3 flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#9A3412]" />
                            <span>Currently at: {currentSec.sectionNumber}. {currentSec.title}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-[#EFE8D8] text-xs">
                          <span className="text-[#786F62]">
                            {lesson.sections.length} instructional sections
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => selectLesson(lesson.id, 'notebook')}
                              className="text-[#574D42] hover:text-[#1C1917] hover:underline px-2 py-1"
                            >
                              Student Note
                            </button>
                            <button
                              onClick={() => selectLesson(lesson.id, 'lesson')}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-[#9A3412] text-white rounded font-medium hover:bg-[#852C0F] transition-colors"
                            >
                              <span>Open Lesson</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
