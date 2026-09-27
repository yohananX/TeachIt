import React, { useRef, useEffect } from 'react';
import { useLesson } from '../context/LessonContext';
import { LessonSection, LessonResource } from '../types/lesson';
import { getFontSizeClass } from '../utils/theme';
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
  HelpCircle,
  Sparkles,
  ArrowRight,
  Eye,
  FileCheck2,
} from 'lucide-react';

interface LessonProcedureViewProps {
  onOpenResource: (resource: LessonResource) => void;
  onOpenSectionNav: () => void;
  registerScrollTarget: (id: string, el: HTMLElement | null) => void;
}

export const LessonProcedureView: React.FC<LessonProcedureViewProps> = ({
  onOpenResource,
  onOpenSectionNav,
  registerScrollTarget,
}) => {
  const {
    activeLesson,
    currentSectionId,
    setCurrentSection,
    toggleSectionCompleted,
    preferences,
    setViewMode,
  } = useLesson();

  const fontClasses = getFontSizeClass(preferences.fontSize);
  const currentSectionRef = useRef<HTMLElement | null>(null);

  if (!activeLesson) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#6B6358] font-serif text-lg">No lesson currently loaded.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-32">
      {/* ─────────────────────────────────────────────────────────────
          1. LESSON HEADER / OVERVIEW (Section 8)
      ───────────────────────────────────────────────────────────── */}
      <section
        id="lesson-overview"
        ref={(el) => registerScrollTarget('lesson-overview', el)}
        className="mb-10 pb-8 border-b border-[#E2D8C3]"
      >
        {/* Unboxed Metadata Line with typographic separators (anti-slop rule) */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#786F62] mb-3">
          <span>{activeLesson.className}</span>
          <span aria-hidden="true">·</span>
          <span>{activeLesson.subjectName}</span>
          <span aria-hidden="true">·</span>
          <span>Week {activeLesson.week}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1 font-semibold text-[#1C1917]">
            <Clock className="w-3 h-3 text-[#9A3412]" />
            {activeLesson.durationMinutes}
          </span>
          {activeLesson.isRevision && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#9A3412] font-semibold">
                Revision of JSS 2
              </span>
            </>
          )}
        </div>

        {/* Title in Newsreader editorial serif */}
        <h1 className={`${fontClasses.heading1} text-[#1C1917] tracking-tight leading-tight mb-4`}>
          {activeLesson.topic}
        </h1>

        {activeLesson.revisionReference && (
          <p className="text-xs text-[#786F62] italic mb-6">
            Curriculum context: {activeLesson.revisionReference}
          </p>
        )}

        {/* Learning Objectives */}
        <div
          id="lesson-objectives"
          ref={(el) => registerScrollTarget('lesson-objectives', el)}
          className="my-6 p-4 sm:p-5 bg-[#F4EFE6] border-l-2 border-[#78350F] rounded-r"
        >
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-[#78350F] font-semibold flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5" />
              Learning Objectives
            </h2>
            <span className="text-[11px] text-[#786F62]">5 Measurable Targets</span>
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

        {/* Materials / Resources Checklist */}
        <div
          id="lesson-materials"
          ref={(el) => registerScrollTarget('lesson-materials', el)}
          className="mt-6"
        >
          <h2 className="text-xs font-mono uppercase tracking-wider text-[#786F62] font-semibold mb-2.5 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-[#8C8375]" />
            Materials & Resources
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[#443E37]">
            {activeLesson.materials.map((mat, i) => (
              <div key={i} className="flex items-center gap-2 py-1 px-2.5 bg-[#F7F3EB] rounded border border-[#EAE1CD]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#9A3412]" />
                <span className="truncate">{mat}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          2. LESSON PROCEDURE (Sections 9–11, 15, 20)
      ───────────────────────────────────────────────────────────── */}
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
            className="text-xs font-medium text-[#9A3412] hover:underline flex items-center gap-1"
          >
            <span>Index</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Iterate through sections */}
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
              className={`relative transition-all duration-200 rounded-md p-4 sm:p-6 ${
                isCurrent
                  ? 'bg-[#F4EFE5] border-l-4 border-[#9A3412] shadow-xs ring-1 ring-[#E2D6C0]'
                  : 'bg-transparent border-l-2 border-[#DDD4C1] hover:border-[#BAAEA0]'
              }`}
            >
              {/* CURRENT POSITION IDENTIFIER (Section 10 & 27: Unmistakable when looking back) */}
              {isCurrent && (
                <div className="mb-3 flex items-center justify-between text-xs font-mono font-bold text-[#9A3412] tracking-wider uppercase">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#9A3412] animate-ping" />
                    <span>Current Teaching Position</span>
                  </div>
                  <span className="text-[11px] text-[#786F62] normal-case font-normal font-sans">
                    You are here
                  </span>
                </div>
              )}

              {/* Section Header */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  {section.groupTitle && (
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#786F62]">
                      {section.groupTitle}
                    </span>
                  )}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-base sm:text-lg font-mono font-bold text-[#9A3412]">
                      {section.sectionNumber}.
                    </span>
                    <h3 className={`${fontClasses.heading2} text-[#1C1917]`}>
                      {section.title}
                    </h3>
                  </div>
                </div>

                {/* Timing & completion actions */}
                <div className="flex items-center gap-2 shrink-0 pt-1">
                  {section.suggestedDurationMinutes && preferences.showTimingGuidance && (
                    <span className="text-xs font-mono text-[#786F62] bg-[#EDE5D5] px-2 py-0.5 rounded tabular-nums flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A89E8F]" />
                      {section.suggestedDurationMinutes} min
                    </span>
                  )}

                  {/* Mark as Current button */}
                  {!isCurrent && (
                    <button
                      onClick={() => setCurrentSection(section.id)}
                      className="text-xs text-[#786F62] hover:text-[#9A3412] hover:bg-[#EAE1CD] px-2 py-0.5 rounded transition-colors"
                      title="Set as your current position"
                    >
                      Set as Current
                    </button>
                  )}

                  {/* Completed Checkbox */}
                  <button
                    onClick={() => toggleSectionCompleted(section.id)}
                    className="p-1 text-[#8C8375] hover:text-emerald-700 transition-colors"
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

              {/* ───────────────────────────────────────────────────
                  TEACHER GUIDANCE BLOCK (Section 15: Distinct Visuals)
              ─────────────────────────────────────────────────── */}
              <div className="my-4 p-4 bg-[#F8F4EC] border border-[#E8DEC9] rounded">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#78350F] font-semibold flex items-center gap-1">
                    <Eye className="w-3 h-3 text-[#78350F]" />
                    Teacher Guidance
                  </span>
                  <span className="text-[10px] text-[#8C8375] uppercase">
                    Instructional Execution
                  </span>
                </div>

                <div className={`space-y-2.5 text-[#292524] ${fontClasses.body}`}>
                  {section.teacherGuidance.map((step, idx) => (
                    <p key={idx} className="leading-relaxed">
                      {step}
                    </p>
                  ))}
                </div>

                {/* Spoken Quote / Spoken Hook Prompt */}
                {section.teacherQuote && (
                  <div className="mt-3.5 pt-3 border-t border-[#EAE0CB]">
                    <div className="flex items-start gap-2">
                      <MessageSquareQuote className="w-4 h-4 text-[#9A3412] shrink-0 mt-0.5" />
                      <div>
                        <span className="text-[10px] font-mono uppercase text-[#786F62] tracking-wider block mb-0.5">
                          Say to class / Suggested Prompt:
                        </span>
                        <blockquote className={`${fontClasses.quote} text-[#1C1917] font-serif`}>
                          “{section.teacherQuote}”
                        </blockquote>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Key Teaching Points (if any) */}
              {section.keyPoints && section.keyPoints.length > 0 && (
                <div className="my-3 pl-3 border-l border-[#DDD4C1] text-xs text-[#574D42]">
                  <span className="font-semibold text-[#1C1917] block mb-1">
                    Key Concepts to Emphasize:
                  </span>
                  <ul className="list-disc list-inside space-y-0.5">
                    {section.keyPoints.map((kp, k) => (
                      <li key={k}>{kp}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* ───────────────────────────────────────────────────
                  STUDENT NOTE SNIPPET (Section 15 & 16)
              ─────────────────────────────────────────────────── */}
              {section.studentNoteSnippet && (
                <div className="my-4 p-3.5 bg-[#FAF7F0] border-l-2 border-[#1E3A8A] rounded-r">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#1E3A8A] font-semibold flex items-center gap-1.5">
                      <BookOpen className="w-3 h-3 text-[#1E3A8A]" />
                      Student Note Material
                    </span>
                    <button
                      onClick={() => setViewMode('notebook')}
                      className="text-[11px] text-[#1E3A8A] hover:underline font-medium"
                    >
                      Open in Student Notebook →
                    </button>
                  </div>
                  <p className="text-xs sm:text-sm text-[#1C1917] leading-relaxed font-serif bg-white/50 p-2.5 rounded border border-[#EDE4D0]">
                    {section.studentNoteSnippet}
                  </p>
                </div>
              )}

              {/* ───────────────────────────────────────────────────
                  INLINE EDUCATIONAL RESOURCES (Section 17 & 18)
              ─────────────────────────────────────────────────── */}
              {section.resources && section.resources.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E5DAC4]">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[#786F62] block mb-2">
                    Attached Lesson Materials:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {section.resources.map((res) => (
                      <button
                        key={res.id}
                        onClick={() => onOpenResource(res)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#EFE8D8] hover:bg-[#E4DBC8] text-[#1C1917] text-xs rounded border border-[#DDD3BF] transition-colors"
                      >
                        {res.type === 'image' && <ImageIcon className="w-3.5 h-3.5 text-[#9A3412]" />}
                        {res.type === 'link' && <ExternalLink className="w-3.5 h-3.5 text-[#1E3A8A]" />}
                        <span className="font-medium truncate max-w-[240px]">{res.title}</span>
                        <span className="text-[10px] text-[#786F62] uppercase font-mono">
                          View
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </section>

      {/* ─────────────────────────────────────────────────────────────
          3. EVALUATION SECTION (Questions with Revealable Answers)
      ───────────────────────────────────────────────────────────── */}
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
          <span className="text-xs font-mono text-[#786F62]">3–4 minutes</span>
        </div>

        <div className="space-y-4">
          {activeLesson.evaluationQuestions.map((q) => (
            <div key={q.id} className="p-4 bg-[#F7F3EB] rounded border border-[#E6DCC6]">
              <div className="flex items-start gap-2.5">
                <span className="text-xs font-mono font-bold text-[#9A3412] mt-0.5">
                  Q{q.questionNumber}.
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[#1C1917]">{q.question}</p>
                  {q.expectedAnswer && (
                    <details className="mt-2 text-xs text-[#574D42] group">
                      <summary className="cursor-pointer text-[#78350F] hover:underline font-mono text-[11px] select-none">
                        Show Expected Answer & Marking Guide
                      </summary>
                      <p className="mt-2 p-2.5 bg-white/70 rounded border border-[#E8DEC9] text-[#292524] leading-relaxed">
                        {q.expectedAnswer}
                      </p>
                    </details>
                  )}
                </div>
                <span className="text-[10px] font-mono uppercase text-[#786F62] bg-[#EAE0CB] px-1.5 py-0.5 rounded">
                  {q.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          4. TAKE-HOME ASSIGNMENT
      ───────────────────────────────────────────────────────────── */}
      <section
        id="lesson-assignment"
        ref={(el) => registerScrollTarget('lesson-assignment', el)}
        className="mt-12 p-5 bg-[#F4EFE6] border border-[#DDD3BF] rounded-lg"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#78350F] font-semibold flex items-center gap-1.5">
            <FileCheck2 className="w-4 h-4 text-[#78350F]" />
            Take-Home Homework Assignment
          </span>
          {activeLesson.assignment.submissionDeadline && (
            <span className="text-xs text-[#786F62]">
              Due: {activeLesson.assignment.submissionDeadline}
            </span>
          )}
        </div>

        <h3 className="text-base font-serif font-medium text-[#1C1917] mb-2">
          {activeLesson.assignment.title}
        </h3>

        <p className="text-xs sm:text-sm text-[#443E37] whitespace-pre-line leading-relaxed mb-3">
          {activeLesson.assignment.instructions}
        </p>

        {activeLesson.assignment.gradingCriteria && (
          <div className="text-[11px] text-[#786F62] pt-2 border-t border-[#EAE1CD]">
            <span className="font-semibold">Grading breakdown:</span> {activeLesson.assignment.gradingCriteria}
          </div>
        )}
      </section>
    </div>
  );
};
