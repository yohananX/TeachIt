import React, { useEffect } from 'react';
import { useLesson } from '../context/LessonContext';
import { ChevronLeft, ChevronRight, Menu } from 'lucide-react';

interface PositionRibbonProps {
  onOpenSectionNav: () => void;
  onScrollToCurrentSection: () => void;
}

export const PositionRibbon: React.FC<PositionRibbonProps> = ({
  onOpenSectionNav,
  onScrollToCurrentSection,
}) => {
  const { activeLesson, currentSectionId, setCurrentSection, preferences } = useLesson();

  if (!activeLesson) return null;

  const sections = activeLesson.sections;
  const currentIndex = sections.findIndex((s) => s.id === currentSectionId);
  const currentSection = sections[currentIndex] || sections[0];

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prevId = sections[currentIndex - 1].id;
      setCurrentSection(prevId);
      setTimeout(onScrollToCurrentSection, 50);
    }
  };

  const handleNext = () => {
    if (currentIndex < sections.length - 1) {
      const nextId = sections[currentIndex + 1].id;
      setCurrentSection(nextId);
      setTimeout(onScrollToCurrentSection, 50);
    }
  };

  // Keyboard shortcuts: ArrowLeft/Right for prev/next section
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, sections.length, handlePrev, handleNext]);

  return (
    <aside
      aria-label="Lesson position"
      className="sticky top-[53px] z-20 bg-[#F4EFE6]/98 backdrop-blur-md border-b border-[#E2D8C3] px-2 sm:px-8 py-2"
    >
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: lesson index trigger + current location */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button
            onClick={onOpenSectionNav}
            className="flex items-center justify-center gap-1.5 min-h-[30px] px-2 sm:px-2.5 py-1.5 text-xs font-medium text-[#1C1917] bg-[#E8DFC9] hover:bg-[#DDD2BA] rounded transition-colors shrink-0"
            title="Open the lesson index (M)"
            aria-label="Open the lesson index"
          >
            <Menu className="w-4 h-4" />
            <span className="font-semibold hidden sm:inline">Lesson</span>
          </button>

          <div className="h-4 w-[1px] bg-[#DDD2BA] hidden sm:block shrink-0" />

          {/* Current section: the "Where am I?" answer */}
          <button
            onClick={onScrollToCurrentSection}
            className="flex items-center gap-1.5 min-w-0 flex-1 text-left group py-0.5"
            title="Jump back to your active section"
          >
            <span
              className="w-2 h-2 rounded-full bg-[#9A3412] shrink-0 animate-pulse"
              aria-hidden="true"
            />
            <span className="text-xs font-mono font-semibold text-[#9A3412] shrink-0">
              {currentIndex + 1}.
            </span>
            <span className="text-xs sm:text-sm font-medium text-[#1C1917] truncate group-hover:underline">
              {currentSection?.title}
            </span>
            {currentSection?.durationMinutes != null && preferences.showTimingGuidance && (
              <span className="text-xs text-[#786F62] hidden sm:inline shrink-0">
                · {currentSection.durationMinutes} min
              </span>
            )}
          </button>
        </div>

        {/* Right: section step controls */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-0.5 border-l border-[#E2D8C3] pl-1.5 sm:pl-2">
            <button
              onClick={handlePrev}
              disabled={currentIndex <= 0}
              className="p-1.5 min-h-[30px] min-w-[30px] text-[#A89E8F] sm:text-[#574D42] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none hover:bg-[#E8DFC9] rounded transition-colors"
              title="Previous section (←)"
              aria-label="Previous section"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-xs font-mono text-[#786F62] px-1 hidden sm:inline tabular-nums">
              {currentIndex + 1}/{sections.length}
            </span>

            <button
              onClick={handleNext}
              disabled={currentIndex >= sections.length - 1}
              className="p-1.5 min-h-[30px] min-w-[30px] text-[#A89E8F] sm:text-[#574D42] hover:text-[#1C1917] disabled:opacity-30 disabled:pointer-events-none hover:bg-[#E8DFC9] rounded transition-colors"
              title="Next section (→)"
              aria-label="Next section"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
