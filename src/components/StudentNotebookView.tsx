import React, { useState } from 'react';
import { useLesson } from '../context/LessonContext';
import { getFontSizeClass } from '../utils/theme';
import { Printer, Copy, Check, ArrowLeft, Maximize2, Minimize2, BookOpen } from 'lucide-react';

interface StudentNotebookViewProps {
  onBackToLesson: () => void;
}

export const StudentNotebookView: React.FC<StudentNotebookViewProps> = ({ onBackToLesson }) => {
  const { activeLesson, preferences } = useLesson();
  const [copied, setCopied] = useState(false);
  const [isPresenterMode, setIsPresenterMode] = useState(false);

  if (!activeLesson) return null;

  const fontClasses = getFontSizeClass(preferences.fontSize);
  const note = activeLesson.studentNote;

  const handleCopyNotes = () => {
    let text = `SUBJECT: ${note.subject}\nTOPIC: ${note.topic}\nCLASS: ${note.className}\nTERM: ${note.term} (Week ${note.week})\n\n`;
    note.sections.forEach((sec) => {
      text += `${sec.heading.toUpperCase()}\n`;
      if (sec.subheading) text += `${sec.subheading}\n`;
      text += `${sec.content}\n`;
      if (sec.bulletPoints) {
        sec.bulletPoints.forEach((bp) => (text += `• ${bp}\n`));
      }
      if (sec.examples) {
        text += `Examples:\n`;
        sec.examples.forEach((ex) => (text += `- ${ex}\n`));
      }
      text += `\n`;
    });
    text += `KEY SUMMARY:\n${note.takeawaySummary}\n`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-28 ${isPresenterMode ? 'fixed inset-0 z-50 bg-[#FAF8F2] overflow-y-auto p-8 max-w-none' : ''}`}>
      {/* Control bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 gap-y-3 mb-6 pb-4 border-b border-[#E0D7C4]">
        <button
          onClick={onBackToLesson}
          className="inline-flex items-center gap-2 min-h-[40px] px-1 -mx-1 text-xs sm:text-sm font-medium text-[#78350F] hover:text-[#522409] hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>
            <span className="sm:hidden">Teaching Procedure</span>
            <span className="hidden sm:inline">Return to Teaching Procedure</span>
          </span>
        </button>

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

      {/* ─────────────────────────────────────────────────────────────
          THE NOTEBOOK PAGE CONTAINER (Section 21 Visual Design)
      ───────────────────────────────────────────────────────────── */}
      <div className="relative bg-[#FAF8F2] border border-[#DDD3BF] rounded-lg shadow-sm overflow-hidden p-4 sm:p-10 notebook-subtle-lines">
        {/* Left notebook vertical margin rule */}
        <div className="absolute top-0 bottom-0 left-6 sm:left-14 w-[1px] bg-red-400/35 pointer-events-none" />

        {/* ── NOTEBOOK HEADER SPACE (Subject, Topic, Date, Class) ── */}
        <div className="pl-5 sm:pl-10 pb-5 mb-6 sm:mb-8 border-b-2 border-[#1E3A8A]/30">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono uppercase tracking-wider text-[#574D42]">
            <div>
              <span className="text-[#8C8375] block text-[10px]">SUBJECT:</span>
              <span className="font-bold text-[#1C1917]">{note.subject}</span>
            </div>
            <div>
              <span className="text-[#8C8375] block text-[10px]">CLASS:</span>
              <span className="font-bold text-[#1C1917]">{note.className}</span>
            </div>
            <div>
              <span className="text-[#8C8375] block text-[10px]">TERM / WEEK:</span>
              <span className="font-bold text-[#1C1917]">Week {note.week} · {note.term}</span>
            </div>
            <div>
              <span className="text-[#8C8375] block text-[10px]">DATE:</span>
              <span className="font-bold text-[#1C1917]">
                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#EAE1CD]">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#8C8375] block">
              TOPIC:
            </span>
            <h1 className="text-2xl sm:text-3xl font-serif font-medium text-[#1C1917] tracking-tight mt-0.5">
              {note.topic}
            </h1>
          </div>
        </div>

        {/* ── NOTEBOOK CONTENT SECTIONS ── */}
        <div className="pl-5 sm:pl-10 space-y-8">
          {note.sections.map((section, idx) => (
            <section key={idx} className="space-y-3">
              <div className="border-b border-[#E8DEC9] pb-1">
                <h2 className="text-lg sm:text-xl font-serif font-semibold text-[#1C1917]">
                  {section.heading}
                </h2>
                {section.subheading && (
                  <span className="text-xs font-mono uppercase tracking-wider text-[#786F62]">
                    {section.subheading}
                  </span>
                )}
              </div>

              <p className={`text-[#292524] font-serif leading-relaxed ${fontClasses.body}`}>
                {section.content}
              </p>

              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <ul className="space-y-1.5 pl-4 sm:pl-6 text-sm text-[#38332E] font-serif">
                  {section.bulletPoints.map((point, pIdx) => (
                    <li key={pIdx} className="list-disc list-outside leading-relaxed">
                      {point}
                    </li>
                  ))}
                </ul>
              )}

              {section.examples && section.examples.length > 0 && (
                <div className="mt-3 p-3.5 bg-[#F5EFE3]/80 rounded border-l-2 border-[#78350F] text-xs sm:text-sm text-[#443E37] font-serif">
                  <span className="font-sans font-semibold text-[#78350F] text-xs uppercase tracking-wider block mb-1.5">
                    Class Examples:
                  </span>
                  <div className="space-y-1.5">
                    {section.examples.map((ex, eIdx) => (
                      <p key={eIdx} className="leading-relaxed">
                        {ex}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </section>
          ))}

          {/* Key Summary / Takeaway */}
          {note.takeawaySummary && (
            <div className="mt-10 p-4 bg-[#EDE5D5] border-t-2 border-b-2 border-[#1E3A8A]/30 text-xs sm:text-sm text-[#1C1917] font-serif">
              <span className="font-sans font-semibold text-[#1E3A8A] text-xs uppercase tracking-wider block mb-1">
                Summary Takeaway for Exercise Books:
              </span>
              <p className="italic leading-relaxed">
                {note.takeawaySummary}
              </p>
            </div>
          )}
        </div>

        {/* Notebook page bottom footer rule */}
        <div className="pl-5 sm:pl-10 mt-12 pt-4 border-t border-[#EAE1CD] flex flex-wrap items-center justify-between gap-1 text-[11px] font-mono text-[#8C8375]">
          <span>TeachIt Notebook Edition</span>
          <span>End of Student Lesson Note · Page 1/1</span>
        </div>
      </div>
    </div>
  );
};
