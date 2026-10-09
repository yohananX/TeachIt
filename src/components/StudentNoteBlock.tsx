import React, { useState } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { Printer, Copy, Check, Maximize2, Minimize2 } from 'lucide-react';

/**
 * The student lesson note as a page block. Rendered inside the lesson document
 * (it is part of the lesson, not a separate destination), with copy / print /
 * present-to-class actions. Phase 1: reads the simplified `studentNotes`
 * markdown string on Lesson.
 */
export const StudentNoteBlock: React.FC = () => {
  const { activeLesson } = useCurriculum();
  const [copied, setCopied] = useState(false);
  const [isPresenterMode, setIsPresenterMode] = useState(false);

  if (!activeLesson) return null;

  const noteText = activeLesson.studentNotes ?? '';

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(noteText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  if (!noteText) {
    return (
      <p className="text-xs text-[#8C8375] italic py-2">
        No student note written for this lesson yet.
      </p>
    );
  }

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 ${isPresenterMode ? 'fixed inset-0 z-50 bg-[#FAF8F2] overflow-y-auto p-8 max-w-none' : ''}`}>
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-end gap-2 gap-y-3 mb-6 pb-4 border-b border-[#E0D7C4]">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyNotes}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium text-[#574D42] bg-[#EDE5D5] hover:bg-[#E2DACB] rounded transition-colors"
            title="Copy formatted note text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Note'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium text-[#574D42] bg-[#EDE5D5] hover:bg-[#E2DACB] rounded transition-colors hidden sm:inline-flex"
            title="Print or Export Student Note"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Note</span>
          </button>

          <button
            onClick={() => setIsPresenterMode(!isPresenterMode)}
            className="inline-flex items-center gap-1.5 min-h-[40px] px-3 py-1.5 text-xs font-medium text-white bg-[#9A3412] hover:bg-[#852C0F] rounded transition-colors"
            title="Project large clean notes on board for students to copy"
            aria-label={isPresenterMode ? 'Exit presentation' : 'Present to class'}
          >
            {isPresenterMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isPresenterMode ? 'Exit Presentation' : 'Present to Class'}</span>
          </button>
        </div>
      </div>

      {/* Notebook page container */}
      <div className="relative bg-[#FAF8F2] border border-[#DDD3BF] rounded-lg shadow-sm overflow-hidden p-4 sm:p-10 notebook-subtle-lines">
        <div className="absolute top-0 bottom-0 left-6 sm:left-14 w-[1px] bg-red-400/35 pointer-events-none" />

        <div className="pl-5 sm:pl-10 pb-5 mb-6 sm:mb-8 border-b-2 border-[#1E3A8A]/30">
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C8375] block">
            Student note
          </span>
          <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#1C1917] tracking-tight mt-0.5">
            {activeLesson.title}
          </h1>
        </div>

        <div className="pl-5 sm:pl-10">
          <p className="text-[#292524] font-serif leading-relaxed whitespace-pre-line text-sm sm:text-base">
            {noteText}
          </p>
        </div>

        <div className="pl-5 sm:pl-10 mt-12 pt-4 border-t border-[#EAE1CD] flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-[#8C8375]">
          <span>TeachIt Notebook Edition</span>
          <span>End of Student Lesson Note · Page 1/1</span>
        </div>
      </div>
    </div>
  );
};
