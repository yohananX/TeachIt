import React, { createContext, useContext, useState, useEffect } from 'react';
import { TeacherPreferences } from '../types/lesson';

/**
 * Ephemeral UI state — never persisted to localStorage (except preferences).
 * Modal visibility, view mode, selection, preferences.
 */
export type ViewMode = 'today' | 'plan' | 'lesson' | 'library';

interface UIContextType {
  // UI state
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedClassId: string;
  setSelectedClassId: (id: string) => void;
  selectedSubjectId: string;
  setSelectedSubjectId: (id: string) => void;
  preferences: TeacherPreferences;
  updatePreferences: (newPrefs: Partial<TeacherPreferences>) => void;
  // Modal states
  isSectionNavOpen: boolean;
  setIsSectionNavOpen: (open: boolean) => void;
  isPreferencesOpen: boolean;
  setIsPreferencesOpen: (open: boolean) => void;
  isEditorOpen: boolean;
  setIsEditorOpen: (open: boolean) => void;
  activeResource: any; // LessonResource | null
  setActiveResource: (resource: any) => void;
}

const STORAGE_KEYS = {
  SELECTED_CLASS_ID: 'teachit_selected_class_id_v1',
  SELECTED_SUBJECT_ID: 'teachit_selected_sub_id_v1',
  PREFERENCES: 'teachit_preferences_v1',
};

const DEFAULT_PREFERENCES: TeacherPreferences = {
  fontSize: 'md',
  paperMode: 'warm-paper',
  showTimingGuidance: true,
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_CLASS_ID);
    return saved || 'class-jss3';
  });
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_SUBJECT_ID);
    return saved || 'sub-jss3-dt';
  });
  const [preferences, setPreferences] = useState<TeacherPreferences>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PREFERENCES);
    try {
      const parsed = saved ? (JSON.parse(saved) as Partial<TeacherPreferences>) : null;
      if (!parsed) return DEFAULT_PREFERENCES;
      return {
        fontSize: parsed.fontSize ?? DEFAULT_PREFERENCES.fontSize,
        paperMode: parsed.paperMode ?? DEFAULT_PREFERENCES.paperMode,
        showTimingGuidance: parsed.showTimingGuidance ?? DEFAULT_PREFERENCES.showTimingGuidance,
      };
    } catch {
      return DEFAULT_PREFERENCES;
    }
  });

  // Modal states (ephemeral, never persisted)
  const [isSectionNavOpen, setIsSectionNavOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeResource, setActiveResource] = useState<any>(null);

  // Persist UI selections & preferences
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_CLASS_ID, selectedClassId);
  }, [selectedClassId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_SUBJECT_ID, selectedSubjectId);
  }, [selectedSubjectId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(preferences));
  }, [preferences]);

  const updatePreferences = (newPrefs: Partial<TeacherPreferences>) => {
    setPreferences((prev) => ({ ...prev, ...newPrefs }));
  };

  return (
    <UIContext.Provider
      value={{
        viewMode,
        setViewMode,
        selectedClassId,
        setSelectedClassId,
        selectedSubjectId,
        setSelectedSubjectId,
        preferences,
        updatePreferences,
        isSectionNavOpen,
        setIsSectionNavOpen,
        isPreferencesOpen,
        setIsPreferencesOpen,
        isEditorOpen,
        setIsEditorOpen,
        activeResource,
        setActiveResource,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
};