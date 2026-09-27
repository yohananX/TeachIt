import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LessonProvider, useLesson } from './context/LessonContext';
import { Header } from './components/Header';
import { PositionRibbon } from './components/PositionRibbon';
import { LessonProcedureView } from './components/LessonProcedureView';
import { StudentNotebookView } from './components/StudentNotebookView';
import { LessonLibraryView } from './components/LessonLibraryView';
import { WeeklyPlannerView } from './components/WeeklyPlannerView';
import { SectionNavModal } from './components/SectionNavModal';
import { ResourceViewerModal } from './components/ResourceViewerModal';
import { PreferencesModal } from './components/PreferencesModal';
import { LessonEditorModal } from './components/LessonEditorModal';
import { LessonResource } from './types/lesson';
import { getPaperThemeClass } from './utils/theme';

const MainContent: React.FC = () => {
  const {
    viewMode,
    setViewMode,
    activeLesson,
    currentSectionId,
    setCurrentSection,
    preferences,
  } = useLesson();

  const [isSectionNavOpen, setIsSectionNavOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeResource, setActiveResource] = useState<LessonResource | null>(null);

  // Map of anchor / section IDs to HTML elements for smooth scrolling
  const scrollTargets = useRef<Map<string, HTMLElement>>(new Map());

  const registerScrollTarget = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      scrollTargets.current.set(id, el);
    } else {
      scrollTargets.current.delete(id);
    }
  }, []);

  const scrollToElement = useCallback((id: string) => {
    const el = scrollTargets.current.get(id);
    if (el) {
      const yOffset = -120; // Top header + ribbon height offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }, []);

  const scrollToCurrentSection = useCallback(() => {
    if (currentSectionId) {
      scrollToElement(currentSectionId);
    }
  }, [currentSectionId, scrollToElement]);

  const handleSelectSectionFromNav = (sectionId: string) => {
    setCurrentSection(sectionId);
    if (viewMode !== 'lesson') {
      setViewMode('lesson');
    }
    // Delay scroll slightly to allow DOM layout
    setTimeout(() => {
      scrollToElement(sectionId);
    }, 80);
  };

  const handleSelectAnchorFromNav = (anchorId: string) => {
    if (viewMode !== 'lesson') {
      setViewMode('lesson');
    }
    setTimeout(() => {
      scrollToElement(anchorId);
    }, 80);
  };

  // Keyboard navigation shortcuts: Left/Right arrows for lesson steps
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        setIsSectionNavOpen(false);
        setIsPreferencesOpen(false);
        setIsEditorOpen(false);
        setActiveResource(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const themeStyle = getPaperThemeClass(preferences.paperMode);

  return (
    <div className={`min-h-screen ${themeStyle.bg} text-[#1C1917] transition-colors duration-200 flex flex-col`}>
      {/* 3-Zone Top Bar Contract */}
      <Header
        onOpenSettings={() => setIsPreferencesOpen(true)}
        onOpenNewLesson={() => setIsEditorOpen(true)}
      />

      {/* Position Ribbon: The persistent "Where am I right now?" companion */}
      {(viewMode === 'lesson' || viewMode === 'notebook') && activeLesson && (
        <PositionRibbon
          onOpenSectionNav={() => setIsSectionNavOpen(true)}
          onScrollToCurrentSection={scrollToCurrentSection}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {viewMode === 'library' && (
          <LessonLibraryView onOpenNewLesson={() => setIsEditorOpen(true)} />
        )}

        {viewMode === 'weekly' && <WeeklyPlannerView />}

        {viewMode === 'lesson' && (
          <LessonProcedureView
            onOpenResource={(res) => setActiveResource(res)}
            onOpenSectionNav={() => setIsSectionNavOpen(true)}
            registerScrollTarget={registerScrollTarget}
          />
        )}

        {viewMode === 'notebook' && (
          <StudentNotebookView onBackToLesson={() => setViewMode('lesson')} />
        )}
      </main>

      {/* Modals & Drawers */}
      <SectionNavModal
        isOpen={isSectionNavOpen}
        onClose={() => setIsSectionNavOpen(false)}
        onSelectSection={handleSelectSectionFromNav}
        onSelectAnchor={handleSelectAnchorFromNav}
      />

      <ResourceViewerModal
        resource={activeResource}
        onClose={() => setActiveResource(null)}
      />

      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
      />

      <LessonEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <LessonProvider>
      <MainContent />
    </LessonProvider>
  );
}
