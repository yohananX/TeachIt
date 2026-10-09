import React, { useEffect, useRef } from 'react';
import { useCurriculum } from '../context/CurriculumContext';
import { X, CheckCircle2, Circle, Clock, ArrowRight } from 'lucide-react';

interface SectionNavModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSection: (sectionId: string) => void;
  onSelectAnchor: (anchorId: string) => void;
}

export const SectionNavModal: React.FC<SectionNavModalProps> = ({
  isOpen,
  onClose,
  onSelectSection,
  onSelectAnchor,
}) => {
  const { activeLesson, currentSectionId } = useCurriculum();
  const listRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !activeLesson) return null;

  const sections = activeLesson.sections;

  // Focus management & keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const items = Array.from(
          listRef.current?.querySelectorAll('[data-section]:not([data-completed="true"])') ?? []
        ) as HTMLElement[];
        const focused = document.activeElement as HTMLElement | null;
        const currentIndex = items.findIndex((el) => el === focused);
        if (currentIndex === -1) {
          // No item focused yet - focus the first
          items[0]?.focus();
        } else {
          const nextIndex =
            e.key === 'ArrowDown'
              ? Math.min(currentIndex + 1, items.length - 1)
              : Math.max(currentIndex - 1, 0);
          items[nextIndex]?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Auto-focus current section on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const current = listRef.current?.querySelector('[data-current="true"]') as HTMLElement;
        current?.focus();
        current?.scrollIntoView({ block: 'nearest' });
      }, 50);
    }
  }, [isOpen]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-start justify-center sm:p-6 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg bg-[#FAF8F3] border border-[#DDD3BF] rounded-t-xl sm:rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E8DFC9] bg-[#F2ECDD]">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-wider text-[#786F62] font-mono">
              Lesson Procedure Index
            </div>
            <div className="text-base font-serif font-medium text-[#1C1917] truncate max-w-sm">
              {activeLesson.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
            aria-label="Close procedure index"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick jump anchors */}
        <div className="px-5 py-2.5 bg-[#FAF7F0] border-b border-[#EAE1CD] flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#574D42]">
          <span className="font-semibold text-[#786F62] shrink-0">Jump:</span>
          <button
            onClick={() => {
              onSelectAnchor('lesson-overview');
              onClose();
            }}
            className="hover:text-[#1C1917] hover:underline px-1.5 py-0.5 whitespace-nowrap"
          >
            Overview
          </button>
          <span>·</span>
          <button
            onClick={() => {
              onSelectAnchor('lesson-objectives');
              onClose();
            }}
            className="hover:text-[#1C1917] hover:underline px-1.5 py-0.5 whitespace-nowrap"
          >
            Objectives
          </button>
          <span>·</span>
          <button
            onClick={() => {
              onSelectAnchor('lesson-materials');
              onClose();
            }}
            className="hover:text-[#1C1917] hover:underline px-1.5 py-0.5 whitespace-nowrap"
          >
            Materials
          </button>
          <span>·</span>
          <button
            onClick={() => {
              onSelectAnchor('student-note');
              onClose();
            }}
            className="text-[#9A3412] hover:underline px-1.5 py-0.5 font-medium whitespace-nowrap"
          >
            Student Note
          </button>
        </div>

        {/* Section List */}
        <div
          ref={listRef}
          className="overflow-y-auto p-3 space-y-1 divide-y divide-[#EFE8D8]"
          role="listbox"
          aria-label="Lesson sections"
        >
          {sections.map((sec, idx) => {
            const isCurrent = sec.id === currentSectionId;
            const isCompleted = activeLesson.completedSectionIds.includes(sec.id);

            return (
              <div
                key={sec.id}
                tabIndex={0}
                role="option"
                aria-selected={isCurrent}
                aria-current={isCurrent ? 'true' : undefined}
                data-section={sec.id}
                data-current={isCurrent}
                data-completed={isCompleted}
                onClick={() => {
                  onSelectSection(sec.id);
                  onClose();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectSection(sec.id);
                    onClose();
                  }
                }}
                className={`group flex items-center justify-between p-3 rounded cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-[#9A3412] focus:ring-offset-2 ${
                  isCurrent
                    ? 'bg-[#EFE8D8] text-[#1C1917] font-medium border-l-4 border-[#9A3412]'
                    : 'hover:bg-[#F4EEE0] text-[#443E37]'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <div className="shrink-0 flex items-center justify-center">
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                    ) : isCurrent ? (
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-[#9A3412] flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#9A3412]" />
                      </div>
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-[#A89E8F]" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs text-[#786F62]">{idx + 1}.</span>
                      <span className="text-sm font-medium text-[#1C1917] truncate">{sec.title}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {sec.durationMinutes != null && (
                    <span className="text-xs font-mono text-[#786F62] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#A89E8F]" />
                      {sec.durationMinutes}m
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[11px] font-mono font-bold text-[#9A3412] bg-[#E5DAC4] px-1.5 py-0.5 rounded">
                      HERE
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-[#A89E8F] group-hover:text-[#1C1917] group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer hint */}
        <div className="p-3 bg-[#F2ECDD] border-t border-[#E8DFC9] text-xs text-[#574D42]">
          <span className="text-[#8C8375]">Click or press Enter to jump · ↑/↓ to navigate · ESC to close</span>
        </div>
      </div>
    </div>
  );
};
