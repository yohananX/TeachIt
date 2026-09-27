import React from 'react';
import { useLesson } from '../context/LessonContext';
import { SlidersHorizontal, BookOpen, Layers } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenNewLesson: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings, onOpenNewLesson }) => {
  const { viewMode, setViewMode, activeLesson, preferences, updatePreferences } = useLesson();

  const cycleFontSize = () => {
    const sequence: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl'];
    const currentIndex = sequence.indexOf(preferences.fontSize);
    const nextSize = sequence[(currentIndex + 1) % sequence.length];
    updatePreferences({ fontSize: nextSize });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 py-3.5 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E7E0D3]">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => setViewMode('library')}
        className="text-2xl font-serif font-medium tracking-tight text-[#1C1917] hover:text-[#78350F] transition-colors text-left"
        title="TeachIt Classroom Companion"
      >
        TeachIt
      </button>

      {/* Zone 2: Clean text navigation links */}
      <nav className="flex items-center gap-4 sm:gap-7 text-sm font-medium text-[#574D42]">
        <button
          onClick={() => setViewMode('library')}
          className={`transition-colors pb-0.5 whitespace-nowrap cursor-pointer ${
            viewMode === 'library'
              ? 'text-[#1C1917] border-b-2 border-[#9A3412] font-semibold'
              : 'hover:text-[#1C1917]'
          }`}
        >
          Lesson Library
        </button>

        <button
          onClick={() => setViewMode('weekly')}
          className={`transition-colors pb-0.5 whitespace-nowrap cursor-pointer ${
            viewMode === 'weekly'
              ? 'text-[#1C1917] border-b-2 border-[#9A3412] font-semibold'
              : 'hover:text-[#1C1917]'
          }`}
        >
          Weekly Planner
        </button>

        {activeLesson && (
          <>
            <button
              onClick={() => setViewMode('lesson')}
              className={`transition-colors pb-0.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'lesson'
                  ? 'text-[#1C1917] border-b-2 border-[#9A3412] font-semibold'
                  : 'hover:text-[#1C1917]'
              }`}
            >
              Lesson Delivery
            </button>

            <button
              onClick={() => setViewMode('notebook')}
              className={`transition-colors pb-0.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'notebook'
                  ? 'text-[#1C1917] border-b-2 border-[#9A3412] font-semibold'
                  : 'hover:text-[#1C1917]'
              }`}
            >
              Student Notes
            </button>
          </>
        )}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={cycleFontSize}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono text-[#574D42] bg-[#EDE6D8] hover:bg-[#E2DACB] rounded transition-colors whitespace-nowrap"
          title="Toggle font size: Small, Medium, Large, Extra Large"
        >
          <span className="font-semibold text-xs">Text</span>
          <span className="uppercase text-[11px] font-bold text-[#78350F]">{preferences.fontSize}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#EDE6D8] rounded transition-colors"
          title="Display and teaching preferences"
          aria-label="Teaching preferences"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
