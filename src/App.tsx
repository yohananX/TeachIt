import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CurriculumProvider, useCurriculum } from './context/CurriculumContext';
import { UIProvider, useUI } from './context/UIContext';
import { Header } from './components/Header';
import { PositionRibbon } from './components/PositionRibbon';
import { LessonProcedureView } from './components/LessonProcedureView';
import { LessonLibraryView } from './components/LessonLibraryView';
import { PlanView } from './components/PlanView';
import { TodayView } from './components/TodayView';
import { SectionNavModal } from './components/SectionNavModal';
import { ResourceViewerModal } from './components/ResourceViewerModal';
import { PreferencesModal } from './components/PreferencesModal';
import { LessonEditorModal } from './components/LessonEditorModal';
import { LessonResource } from './types/lesson';
import { getPaperThemeClass } from './utils/theme';

const MainContent: React.FC = () => {
  const {
    activeLesson,
    activeLessonId,
    currentSectionId,
    setCurrentSection,
    selectLesson,
  } = useCurriculum();

  const {
    viewMode,
    setViewMode,
    preferences,
    isSectionNavOpen,
    setIsSectionNavOpen,
    isPreferencesOpen,
    setIsPreferencesOpen,
    isEditorOpen,
    setIsEditorOpen,
    activeResource,
    setActiveResource,
  } = useUI();

  // Map of anchor / section IDs to HTML elements for smooth scrolling
  const scrollTargets = useRef<Map<string, HTMLElement>>(new Map());

  const registerScrollTarget = useCallback((id: string, el: HTMLElement | null) => {
    if (el) {
      scrollTargets.current.set(id, el);
    } else {
      scrollTargets.current.delete(id);
    }
  }, []);

  const scrollToElement = useCallback((id: string, behavior: ScrollBehavior = 'smooth') => {
    const el = scrollTargets.current.get(id);
    if (el) {
      const yOffset = -120; // Top header + ribbon height offset
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior });
    }
  }, []);

  const scrollToCurrentSection = useCallback(() => {
    if (currentSectionId) {
      scrollToElement(currentSectionId);
    }
  }, [currentSectionId, scrollToElement]);

  // Opening a lesson (from Today, Plan or the library) restores the saved
  // teaching position. Manual scrolling is never interrupted while the teacher
  // stays in the lesson, and an explicit "jump to X" always wins.
  const previousModeRef = useRef(viewMode);
  const previousLessonRef = useRef(activeLessonId);
  const pendingNavScrollRef = useRef<string | null>(null);
  useEffect(() => {
    const previousMode = previousModeRef.current;
    const previousLesson = previousLessonRef.current;
    previousModeRef.current = viewMode;
    previousLessonRef.current = activeLessonId;

    if (pendingNavScrollRef.current) {
      pendingNavScrollRef.current = null;
      return;
    }

    if (viewMode !== 'lesson' || !currentSectionId) return;
    const enteredLessonView = previousMode !== 'lesson';
    const lessonChanged = previousLesson !== activeLessonId;
    if (!enteredLessonView && !lessonChanged) return;

    const timer = setTimeout(() => scrollToElement(currentSectionId, 'auto'), 80);
    return () => clearTimeout(timer);
  }, [viewMode, activeLessonId, currentSectionId, scrollToElement]);

  const handleSelectSectionFromNav = (sectionId: string) => {
    setCurrentSection(sectionId);
    if (viewMode !== 'lesson') {
      setViewMode('lesson');
    }
    // Delay scroll slightly to allow DOM layout
    pendingNavScrollRef.current = sectionId;
    setTimeout(() => {
      scrollToElement(sectionId);
      pendingNavScrollRef.current = null;
    }, 80);
  };

  const handleSelectAnchorFromNav = (anchorId: string) => {
    if (viewMode !== 'lesson') {
      setViewMode('lesson');
    }
    pendingNavScrollRef.current = anchorId;
    setTimeout(() => {
      scrollToElement(anchorId);
      pendingNavScrollRef.current = null;
    }, 80);
  };

  // Escape closes any open overlay
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
  }, [setIsSectionNavOpen, setIsPreferencesOpen, setIsEditorOpen, setActiveResource]);

  const themeStyle = getPaperThemeClass(preferences.paperMode);

  return (
    <div className={`min-h-screen ${themeStyle.bg} text-[#1C1917] transition-colors duration-200 flex flex-col`}>
      {/* 3-Zone Top Bar Contract */}
      <Header onOpenSettings={() => setIsPreferencesOpen(true)} />

      {/* Position Ribbon: The persistent "Where am I right now?" companion */}
      {viewMode === 'lesson' && activeLesson && (
        <PositionRibbon
          onOpenSectionNav={() => setIsSectionNavOpen(true)}
          onScrollToCurrentSection={scrollToCurrentSection}
        />
      )}

      {/* Main View Router */}
      <main className="flex-1 w-full">
        {viewMode === 'today' && <TodayView />}

        {viewMode === 'plan' && <PlanView />}

        {viewMode === 'library' && (
          <LessonLibraryView onOpenNewLesson={() => setIsEditorOpen(true)} />
        )}

        {viewMode === 'lesson' && (
          <LessonProcedureView
            onOpenResource={(res) => setActiveResource(res)}
            onOpenSectionNav={() => setIsSectionNavOpen(true)}
            registerScrollTarget={registerScrollTarget}
            onJumpToAnchor={handleSelectAnchorFromNav}
          />
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
    <CurriculumProvider>
      <UIProvider>
        <MainContent />
      </UIProvider>
    </CurriculumProvider>
  );
}