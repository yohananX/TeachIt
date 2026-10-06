import React from 'react';
import { useLesson } from '../context/LessonContext';
import { SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  const { viewMode, setViewMode, activeLesson, preferences, updatePreferences } = useLesson();

  const cycleFontSize = () => {
    const sequence: ('sm' | 'md' | 'lg' | 'xl')[] = ['sm', 'md', 'lg', 'xl'];
    const currentIndex = sequence.indexOf(preferences.fontSize);
    const nextSize = sequence[(currentIndex + 1) % sequence.length];
    updatePreferences({ fontSize: nextSize });
  };

  const navLinkClass = (isActive: boolean) =>
    `transition-colors pb-0.5 whitespace-nowrap cursor-pointer ${
      isActive ? 'text-[#1C1917] border-b-2 border-[#9A3412] font-semibold' : 'hover:text-[#1C1917]'
    }`;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 px-3 sm:px-8 py-3.5 bg-[#FAF7F2]/95 backdrop-blur-md border-b border-[#E7E0D3]">
      {/* Zone 1: Single text element wordmark */}
      <button
        onClick={() => setViewMode('today')}
        className="text-xl sm:text-2xl font-serif font-medium tracking-tight text-[#1C1917] hover:text-[#78350F] transition-colors text-left shrink-0"
        title="TeachIt — back to today"
      >
        TeachIt
      </button>

      {/* Zone 2: Primary navigation — Today, Plan, Teach.
          The lesson library is a secondary utility reached from Plan. */}
      <nav className="flex items-center gap-3 sm:gap-7 text-sm font-medium text-[#574D42] min-w-0">
        <button onClick={() => setViewMode('today')} className={navLinkClass(viewMode === 'today')}>
          Today
        </button>

        <button onClick={() => setViewMode('plan')} className={navLinkClass(viewMode === 'plan')}>
          Plan
        </button>

        {activeLesson && (
          <button onClick={() => setViewMode('lesson')} className={navLinkClass(viewMode === 'lesson')}>
            Teach
          </button>
        )}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <button
          onClick={cycleFontSize}
          className="flex items-center justify-center gap-1.5 min-h-[32px] min-w-[32px] px-2 py-1.5 text-xs font-mono text-[#574D42] bg-[#EDE6D8] hover:bg-[#E2DACB] rounded transition-colors whitespace-nowrap"
          title="Toggle reading size: Small, Medium, Large, Extra Large"
        >
          <span className="hidden sm:inline font-semibold text-xs">Text</span>
          <span className="uppercase text-[11px] font-bold text-[#78350F]">{preferences.fontSize}</span>
        </button>

        <button
          onClick={onOpenSettings}
          className="flex items-center justify-center min-h-[32px] min-w-[32px] p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#EDE6D8] rounded transition-colors"
          title="Settings"
          aria-label="Settings"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
