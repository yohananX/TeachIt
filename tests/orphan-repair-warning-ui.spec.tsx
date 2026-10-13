/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import App from '../src/App';
import { CurriculumProvider, useCurriculum } from '../src/context/CurriculumContext';
import { curriculumRepository } from '../src/services/curriculumRepository';

const createMockStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) || null),
    setItem: vi.fn((key: string, value: string) => store.set(key, value)),
    removeItem: vi.fn((key: string) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
    getStore: () => store,
  };
};

/**
 * Fail only the data-collection and recovery writes (what the repository uses
 * during saveAll / orphan-repair persistence), while letting the UI-level
 * keys (selected class/subject, preferences, active lesson id) succeed.
 */
const failDataWrites = (storage: ReturnType<typeof createMockStorage>) => {
  const DATA_PREFIXES = ['teachit_classes_v1', 'teachit_subjects_v1', 'teachit_sessions_v1', 'teachit_weeks_v1', 'teachit_topics_v1', 'teachit_lessons_v1', 'teachit_progress_v1', 'teachit_recovery_v1'];
  storage.setItem.mockImplementation((key: string, value: string) => {
    if (DATA_PREFIXES.some((p) => key.startsWith(p))) {
      throw new Error('QuotaExceededError: storage is full');
    }
    return storage.getStore().set(key, value);
  });
};

/**
 * Seed storage with a lesson whose topicId references a topic that does NOT
 * exist in the topics list (topics has a different entry), so orphan repair
 * will trigger and try to create the missing topic.
 */
const seedOrphanedLesson = (storage: ReturnType<typeof createMockStorage>) => {
  const lesson = { id: 'lesson-1', topicId: 'topic-sub-jss3-dt-w1-01', title: 'T', durationMinutes: 30, learningObjectives: [], materials: [], sections: [], evaluation: [] };
  // Topics has a different valid topic (not the one referenced by the lesson)
  const otherTopic = { id: 'topic-sub-jss3-dt-w2-01', weekId: 'wk-sess-sub-jss3-dt-t1-02', title: 'Other', order: 1 };
  storage.getStore().set('teachit_lessons_v1', JSON.stringify([lesson]));
  storage.getStore().set('teachit_topics_v1', JSON.stringify([otherTopic]));
  storage.getStore().set('teachit_classes_v1', JSON.stringify([{ id: 'class-jss3', name: 'JSS 3', level: 'Junior' }]));
  storage.getStore().set('teachit_subjects_v1', JSON.stringify([{ id: 'sub-jss3-dt', classId: 'class-jss3', name: 'Digital Tech', code: 'DT' }]));
  storage.getStore().set('teachit_sessions_v1', JSON.stringify([{ id: 'sess-sub-jss3-dt-t1', subjectId: 'sub-jss3-dt', term: 1, label: 'First Term', totalWeeks: 12, currentWeek: 1 }]));
  storage.getStore().set('teachit_weeks_v1', JSON.stringify([
    { id: 'wk-sess-sub-jss3-dt-t1-01', sessionId: 'sess-sub-jss3-dt-t1', number: 1 },
    { id: 'wk-sess-sub-jss3-dt-t1-02', sessionId: 'sess-sub-jss3-dt-t1', number: 2 },
  ]));
  storage.getStore().set('teachit_progress_v1', JSON.stringify({}));
};

let capturedWarning: unknown = null;
const WarningProbe = () => {
  const { orphanRepairWarning } = useCurriculum();
  capturedWarning = orphanRepairWarning;
  return null;
};

describe('Orphan Repair Warning UI', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    global.localStorage = mockStorage as unknown as Storage;

    // Reset repository singleton for each test
    (curriculumRepository as any)._loaded = false;
    (curriculumRepository as any)._orphanRepair = null;
    capturedWarning = null;
  });

  afterEach(() => {
    cleanup();
    global.localStorage = originalLocalStorage;
  });

  // ── Test 1: Context exposes warning when orphan repair persistence fails ──
  describe('CurriculumContext exposes the warning', () => {
    it('sets orphanRepairWarning when repair persistence fails', async () => {
      seedOrphanedLesson(mockStorage);
      failDataWrites(mockStorage);

      render(
        <CurriculumProvider>
          <WarningProbe />
        </CurriculumProvider>
      );

      await waitFor(() => {
        expect(capturedWarning).not.toBeNull();
        expect((capturedWarning as any).message).toContain('couldn\'t be saved to storage');
      });
    });
  });

  // ── Test 2: Banner renders when a warning exists ──
  describe('Banner renders when warning exists', () => {
    it('shows an alert with message and dismiss button', async () => {
      seedOrphanedLesson(mockStorage);
      failDataWrites(mockStorage);

      render(<App />);

      const banner = await screen.findByRole('alert');
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(/couldn't be saved to storage/i);
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
    });
  });

  // ── Test 3: Dismissing the banner hides it without changing repository status ──
  describe('Dismissing the banner', () => {
    it('hides the banner and does not alter getOrphanRepairStatus', async () => {
      seedOrphanedLesson(mockStorage);
      failDataWrites(mockStorage);

      render(<App />);

      await screen.findByRole('alert');
      const repairStatusBefore = curriculumRepository.getOrphanRepairStatus();
      expect(repairStatusBefore?.persisted).toBe(false);

      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });

      const repairStatusAfter = curriculumRepository.getOrphanRepairStatus();
      expect(repairStatusAfter?.persisted).toBe(false);
    });
  });

  // ── Test 4: Successful repair does not show the warning ──
  describe('Successful repair', () => {
    it('does not show the warning banner', async () => {
      seedOrphanedLesson(mockStorage);
      // Storage works fine — repair succeeds

      render(<App />);

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      });
    });
  });

  // ── Test 5: App remains usable while warning is visible ──
  describe('App remains usable with warning visible', () => {
    it('allows navigation while warning is displayed', async () => {
      seedOrphanedLesson(mockStorage);
      failDataWrites(mockStorage);

      render(<App />);

      await screen.findByRole('alert');

      const planButton = screen.getByRole('button', { name: 'Plan', exact: true });
      expect(planButton).toBeInTheDocument();
      fireEvent.click(planButton);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});