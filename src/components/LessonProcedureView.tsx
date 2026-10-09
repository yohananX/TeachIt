import React, { useRef } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { useUI } from '../context/UIContext';
import { LessonResource } from '../types/lesson';
import { getFontSizeClass } from '../utils/theme';
import { getLessonScope } from '../utils/curriculum';
import { StudentNoteBlock } from './StudentNoteBlock';
import {
  Clock,
  CheckCircle2,
  Circle,
  BookOpen,
  Image as ImageIcon,
  ExternalLink,
  MessageSquareQuote,
  Target,
  Package,
  Eye,
  ArrowRight,
  FileCheck2,
} from 'lucide-react';

interface LessonProcedureViewProps {
  onOpenResource: (resource: LessonResource) => void;
  onOpenSectionNav: () => void;
  registerScrollTarget: (id: string, el: HTMLElement | null) => void;
  /** Jump to an anchor inside this document (e.g. the student note block). */
  onJumpToAnchor: (anchorId: string) => void;
}

export const LessonProcedureView: React.FC<LessonProcedureViewProps> = ({
  onOpenResource,
  onOpenSectionNav,
  registerScrollTarget,
  onJumpToAnchor,
}) => {
  const {
    activeLesson,
    currentSectionId,
    setCurrentSection,
    toggleSectionCompleted,
    topics,
    weeks,
    sessions,
    subjects,
    classes,
    updateLessonStatus,
    selectLesson,
    getTaughtLessonsForSubject,
  } = useCurriculum();

  const { preferences } = useUI();

  const fontClasses = getFontSizeClass(preferences.fontSize);
  const currentSectionRef = useRef<HTMLElement | null>(null);

  if (!activeLesson) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#6B6358] font-serif text-lg">No lesson currently loaded.</p>
      </div>
    );
  }

  const scope = getLessonScope(activeLesson.topicId, topics, weeks, sessions);
  const subject = subjects.find((s) => s.id === scope.subjectId);
  const cls = subject ? classes.find((c) => c.id === subject.classId) : undefined;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">
      {/* 1. LESSON HEADER / OVERVIEW */}
      <section
        id="lesson-overview"
        ref={(el) => registerScrollTarget('lesson-overview', el)}
        className="mb-10 pb-8 border-b border-[#E2D8C3]"
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#786F62] mb-3">
          {cls && <span>{cls.name}</span>}
          {cls && <span aria-hidden="true">·</span>}
          {subject && <span>{subject.name}</span>}
          {subject && <span aria-hidden="true">·</span>}
          {scope.weekNumber != null && <span>Week {scope.weekNumber}</span>}
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1 font-semibold text-[#1C1917]">
            <Clock className="w-3 h-3 text-[#9A3412]" />
            {activeLesson.durationMinutes} min
          </span>
        </div>

        <h1 className={`${fontClasses.heading1} text-[#1C1917] tracking-tight leading-tight mb-2`}>
          {activeLesson.title}
        </h1>

        {scope.topic && (
          <p className="text-xs text-[#786F62] italic mb-4">
            Topic: {scope.topic.title}
          </p>
        )}

        {activeLesson.priorKnowledge && (
          <p className="text-xs text-[#574D42] mb-4 pl-3 border-l-2 border-[#1E3A8A]/40">
            <span className="font-semibold text-[#1C1917]">Prior knowledge: </span>
            {activeLesson.priorKnowledge}
          </p>
        )}

        {/* Learning Objectives */}
        <div
          id="lesson-objectives"
          ref={(el) => registerScrollTarget('lesson-objectives', el)}
          className="my-6 pl-3 sm:pl-4 border-l-2 border-[#78350F]"
        >
          <div className="flex items-center justify-between gap-2 mb-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#78350F] font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Learning Objectives
            </h2>
            <span className="text-[11px] text-[#786F62] shrink-0">
              {activeLesson.learningObjectives.length} measurable targets
            </span>
          </div>

          <p className="text-xs text-[#6B6358] mb-3">
            By the end of this lesson, students should be able to:
          </p>

          <ul className="space-y-2 text-sm text-[#292524]">
            {activeLesson.learningObjectives.map((obj, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="text-xs font-mono font-bold text-[#9A3412] mt-0.5 shrink-0">
                  0{i + 1}.
                </span>
                <span className="leading-snug">{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Materials */}
        <div
          id="lesson-materials"
          ref={(el) => registerScrollTarget('lesson-materials', el)}
          className="mt-6"
        >
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#786F62] font-semibold mb-1.5 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#8C8375]" />
            Materials & Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-0.5 text-xs text-[#443E37]">
            {activeLesson.materials.map((mat, i) => (
              <div key={i} className="flex items-start gap-2 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9A3412] mt-1.5 shrink-0" />
                <span>{mat}</span>
              </div>
            ))}
          </div>
        </div>

        {activeLesson.teacherNotes && (
          <div className="mt-6 p-3 bg-[#F5EFE3] border-l-2 border-[#78350F] text-xs text-[#443E37]">
            <span className="font-semibold text-[#78350F] text-[11px] uppercase tracking-wider block mb-1">
              Teacher notes
            </span>
            <p className="leading-relaxed whitespace-pre-line">{activeLesson.teacherNotes}</p>
          </div>
        )}
      </section>

      {/* 2. LESSON PROCEDURE */}
      <section className="space-y-12">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2D8C3]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#786F62]">
              Instructional Sequence
            </span>
            <h2 className="text-xl font-serif font-medium text-[#1C1917]">
              Lesson Procedure
            </h2>
          </div>

          <button
            onClick={onOpenSectionNav}
            className="flex items-center gap-1 min-h-[36px] px-2 -mx-2 text-xs font-medium text-[#9A3412] hover:underline"
          >
            <span>Index</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {activeLesson.sections.map((section, index) => {
          const isCurrent = section.id === currentSectionId;
          const isCompleted = activeLesson.completedSectionIds.includes(section.id);

          return (
            <article
              key={section.id}
              id={section.id}
              ref={(el) => {
                registerScrollTarget(section.id, el);
                if (isCurrent) currentSectionRef.current = el;
              }}
              className={`relative transition-colors duration-200 p-4 sm:p-6 border-l-[3px] ${
                isCurrent
                  ? 'bg-[#F8F2E5] border-[#9A3412]'
                  : 'bg-transparent border-[#E3DAC9] hover:border-[#C4B7A2]'
              }`}
            >
              {isCurrent && (
                <div className="mb-3 flex items-center justify-between gap-2 text-[11px] font-mono font-bold text-[#9A3412] tracking-wider uppercase">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#9A3412]" aria-hidden="true" />
                    You are here
                  </span>
                  <span className="text-[10px] text-[#786F62] normal-case font-sans font-medium">
                    Section {index + 1} of {activeLesson.sections.length}
                  </span>
                </div>
              )}

              <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 mb-4">
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-base sm:text-lg font-mono font-bold text-[#9A3412]">
                      {index + 1}.
                    </span>
                    <h3 className={`${fontClasses.heading2} text-[#1C1917]`}>
                      {section.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-auto pt-0.5">
                  {section.durationMinutes != null && preferences.showTimingGuidance && (
                    <span className="text-xs font-mono text-[#786F62] bg-[#EDE5D5] px-2 py-1 rounded tabular-nums flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A89E8F]" />
                      {section.durationMinutes} min
                    </span>
                  )}

                  {!isCurrent && (
                    <button
                      onClick={() => setCurrentSection(section.id)}
                      className="min-h-[32px] px-2.5 py-1.5 text-xs text-[#786F62] hover:text-[#9A3412] hover:bg-[#EAE1CD] rounded transition-colors"
                      title="Set as your current position"
                    >
                      Set as Current
                    </button>
                  )}

                  <button
                    onClick={() => toggleSectionCompleted(section.id)}
                    className="flex items-center justify-center min-h-[32px] min-w-[32px] p-2 -m-1 text-[#8C8375] hover:text-emerald-700 hover:bg-[#EAE1CD] rounded transition-colors"
                    title={isCompleted ? 'Mark incomplete' : 'Mark section completed'}
                    aria-label={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Main content */}
              <div className={`space-y-2.5 text-[#292524] ${fontClasses.body}`}>
                <p className="leading-relaxed whitespace-pre-line">{section.content}</p>
              </div>

              {/* Teacher guidance */}
              <div className="my-4 pl-3 sm:pl-4 border-l-2 border-[#E0D5BE]">
                <span className="text-[11px] font-mono uppercase tracking-wider text-[#78350F] font-semibold flex items-center gap-1.5 mb-2">
                  <Eye className="w-3 h-3 text-[#78350F]" />
                  Teacher Guidance
                </span>
                <p className={`text-[#292524] leading-relaxed whitespace-pre-line ${fontClasses.body}`}>
                  {section.teacherGuidance}
                </p>
              </div>

              {section.activity && (
                <div className="my-3 pl-3 border-l border-[#DDD4C1] text-xs text-[#574D42]">
                  <span className="font-semibold text-[#1C1917] block mb-1">
                    Activity:
                  </span>
                  <p className="leading-relaxed">{section.activity}</p>
                </div>
              )}
            </article>
          );
        })}

        {/* Mark Lesson Taught button - appears when lesson is not yet taught */}
        {activeLesson.status !== 'taught' && (
          <div className="mt-8 pt-6 border-t border-[#E2D8C3] flex justify-center">
            <button
              onClick={() => updateLessonStatus(activeLesson.id, 'taught')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Lesson as Taught</span>
            </button>
          </div>
        )}

        {activeLesson.status === 'taught' && (
          <div className="mt-8 pt-6 border-t border-[#E2D8C3] text-center">
            <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded font-medium text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Lesson marked as taught · {new Date(activeLesson.lastVisitedAt ?? Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}

      </section>

      {/* Revision Context: Previously taught lessons for this subject */}
      {(() => {
        const scope = getLessonScope(activeLesson.topicId, topics, weeks, sessions);
        if (!scope.subjectId) return null;
        const taughtLessons = getTaughtLessonsForSubject(scope.subjectId)
          .filter((l) => l.id !== activeLesson.id)
          .sort((a, b) => new Date(b.lastVisitedAt ?? 0).getTime() - new Date(a.lastVisitedAt ?? 0).getTime())
          .slice(0, 5);
        if (taughtLessons.length === 0) return null;
        return (
          <section className="mt-16 pt-8 border-t border-[#E2D8C3] bg-[#F5EFE3]/50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-[#786F62]">Revision</span>
                <h2 className="text-xl font-serif font-medium text-[#1C1917]">Previously Taught Material</h2>
              </div>
              <span className="text-xs text-[#786F62]">Tap to review</span>
            </div>
            <div className="space-y-3">
              {taughtLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  onClick={() => selectLesson(lesson.id)}
                  className="w-full text-left p-3 bg-white/70 border border-[#E4DAC5] rounded hover:border-[#9A3412] hover:bg-[#FAF7F0] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-[#9A3412] font-semibold">
                        {(() => {
                          const ls = getLessonScope(lesson.topicId, topics, weeks, sessions);
                          return ls.weekNumber ? `W${ls.weekNumber}` : '';
                        })()}
                      </span>
                      <span className="font-medium text-[#1C1917]">{lesson.title}</span>
                    </div>
                    <span className="text-xs text-[#786F62]">
                      {new Date(lesson.lastVisitedAt ?? 0).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <p className="text-xs text-[#574D42] mt-1 line-clamp-1">{lesson.learningObjectives[0]}</p>
                </button>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Lesson-wide resources */}
      {activeLesson.resources && activeLesson.resources.length > 0 && (
        <section className="mt-12 pt-6 border-t border-[#E2D8C3]">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#786F62] block mb-2">
            Attached lesson materials:
          </span>
          <div className="flex flex-wrap gap-2">
            {activeLesson.resources.map((res) => (
              <button
                key={res.id}
                onClick={() => onOpenResource(res)}
                className="inline-flex items-center gap-2 min-h-[40px] px-3 py-2 bg-[#EFE8D8] hover:bg-[#E4DBC8] text-[#1C1917] text-xs rounded border border-[#DDD3BF] transition-colors"
              >
                {res.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-[#9A3412]" />}
                {res.type === 'link' && <ExternalLink className="w-3.5 h-3.5 text-[#1E3A8A]" />}
                {res.type === 'video' && <ExternalLink className="w-3.5 h-3.5 text-[#9A3412]" />}
                <span className="font-medium truncate max-w-[200px] sm:max-w-[260px]">
                  {res.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 3. EVALUATION */}
      <section
        id="lesson-evaluation"
        ref={(el) => registerScrollTarget('lesson-evaluation', el)}
        className="mt-16 pt-8 border-t border-[#E2D8C3]"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#786F62]">
              Oral & Board Check
            </span>
            <h2 className="text-xl font-serif font-medium text-[#1C1917]">
              Classroom Evaluation
            </h2>
          </div>
        </div>

        {activeLesson.evaluation.length === 0 ? (
          <p className="text-xs text-[#8C8375] italic">No evaluation questions yet.</p>
        ) : (
          <div className="space-y-4">
            {activeLesson.evaluation.map((q) => (
              <div key={q.id} className="pb-4 border-b border-[#EAE1CD] last:border-0 last:pb-0">
                <div className="flex items-start gap-2.5">
                  <span className="text-xs font-mono font-bold text-[#9A3412] mt-0.5 shrink-0">
                    Q{q.questionNumber}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <p className="text-sm font-medium text-[#1C1917]">{q.question}</p>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#786F62]">
                        {q.type}
                      </span>
                    </div>
                    {q.expectedAnswer && (
                      <details className="mt-2 text-xs text-[#574D42] group">
                        <summary className="cursor-pointer text-[#78350F] hover:underline font-mono text-[11px] select-none min-h-[32px] flex items-center">
                          Show Expected Answer & Marking Guide
                        </summary>
                        <p className="mt-1 mb-1 pl-3 border-l-2 border-[#E0D5BE] text-[#292524] leading-relaxed">
                          {q.expectedAnswer}
                        </p>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. STUDENT NOTE — part of this lesson, not a separate screen */}
      <section className="mt-16 pt-8 border-t border-[#E2D8C3]">
        <div className="flex flex-wrap items-end justify-between gap-2 mb-4">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#786F62]">
              For exercise books
            </span>
            <h2 className="text-xl font-serif font-medium text-[#1C1917]">Student Note</h2>
          </div>
          <span className="text-xs font-mono text-[#786F62]">Copy · Print · Present</span>
        </div>

        <div id="student-note" ref={(el) => registerScrollTarget('student-note', el)}>
          <StudentNoteBlock />
        </div>

        <button
          onClick={() => onJumpToAnchor('student-note')}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        >
          <BookOpen className="w-3 h-3" />
          <MessageSquareQuote className="w-3 h-3" />
          <FileCheck2 className="w-3 h-3" />
        </button>
      </section>
    </div>
  );
};
