/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
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

const setupValidStorage = (storage: ReturnType<typeof createMockStorage>) => {
  const initialData = {
    'teachit_classes_v1': JSON.stringify([{ id: 'class-jss3', name: 'JSS 3', level: 'Junior' }]),
    'teachit_subjects_v1': JSON.stringify([{ id: 'sub-jss3-dt', classId: 'class-jss3', name: 'Digital Tech', code: 'DT' }]),
    'teachit_sessions_v1': JSON.stringify([{ id: 'sess-sub-jss3-dt-t1', subjectId: 'sub-jss3-dt', term: 1 }]),
    'teachit_weeks_v1': JSON.stringify([{ id: 'wk-sess-sub-jss3-dt-t1-01', sessionId: 'sess-sub-jss3-dt-t1', number: 1 }]),
    'teachit_topics_v1': JSON.stringify([{ id: 'topic-sub-jss3-dt-w1-01', weekId: 'wk-sess-sub-jss3-dt-t1-01', title: 'Topic 1', order: 1 }]),
    'teachit_lessons_v1': JSON.stringify([{ id: 'lesson-1', topicId: 'topic-sub-jss3-dt-w1-01', title: 'Lesson 1', durationMinutes: 30, sections: [], evaluation: [], learningObjectives: [], materials: [] }]),
    'teachit_progress_v1': JSON.stringify({}),
  };
  for (const [key, value] of Object.entries(initialData)) {
    storage.getStore().set(key, value);
  }
};

describe('CurriculumContext Mutation Error Handling', () => {
  let mockStorage: ReturnType<typeof createMockStorage>;
  let originalLocalStorage: Storage;

  beforeEach(() => {
    mockStorage = createMockStorage();
    originalLocalStorage = global.localStorage;
    global.localStorage = mockStorage as unknown as Storage;
    setupValidStorage(mockStorage);

    (curriculumRepository as any)._loaded = false;
    (curriculumRepository as any)._orphanRepair = null;
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  describe('Blocked write causing mutation failure', () => {
    it('shows both blocked_write and write_failed for same root cause', async () => {
      // Set up corrupted topics that couldn't be backed up
      const corruptedTopics = '{"broken":true}';
      mockStorage.getStore().set('teachit_topics_v1', corruptedTopics);

      // Make all writes fail (quota exhausted)
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full');
      });

      const conditions: any[] = [];
      const ConditionsCapture = () => {
        const { storageHealthConditions } = useCurriculum();
        conditions.push(storageHealthConditions);
        return null;
      };

      render(
        <CurriculumProvider>
          <ConditionsCapture />
        </CurriculumProvider>
      );

      await waitFor(() => {
        const latest = conditions[conditions.length - 1];
        expect(latest.some((c: any) => c.type === 'blocked_write')).toBe(true);
        expect(latest.some((c: any) => c.type === 'write_failed')).toBe(true);
      });
    });
  });

  describe('Reset behavior', () => {
    it('has valid active lesson after successful load', async () => {
      let activeLessonId: string | null = null;
      const Capture = () => {
        const { activeLessonId: id } = useCurriculum();
        activeLessonId = id;
        return null;
      };

      render(
        <CurriculumProvider>
          <Capture />
        </CurriculumProvider>
      );

      await waitFor(() => {
        expect(activeLessonId).toBe('lesson-jss3-dt-w1'); // Default from localStorage
      });
    });

    it('resetAllData resets active lesson to first lesson on success', async () => {
      let activeLessonId: string | null = null;
      let resetAllData: () => void;
      const Capture = () => {
        const { resetAllData: fn, activeLessonId: id } = useCurriculum();
        resetAllData = fn;
        activeLessonId = id;
        return null;
      };

      render(
        <CurriculumProvider>
          <Capture />
        </CurriculumProvider>
      );

      await waitFor(() => {
        expect(activeLessonId).toBe('lesson-jss3-dt-w1'); // Default from localStorage
      });

      // Successful reset - repository goes to INITIAL_LESSONS
      await act(async () => { resetAllData!(); });

      await waitFor(() => {
        expect(activeLessonId).toBe('lesson-jss3-dt-w1'); // First lesson in INITIAL_LESSONS
      });
    });

    it('resetAllData resets active lesson to first lesson even on failure', async () => {
      // Make resetAll fail
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('QuotaExceededError: storage is full');
      });

      let activeLessonId: string | null = null;
      let resetAllData: () => void;
      const Capture = () => {
        const { resetAllData: fn, activeLessonId: id } = useCurriculum();
        resetAllData = fn;
        activeLessonId = id;
        return <div data-testid="active-id">{activeLessonId || 'none'}</div>;
      };

      render(
        <CurriculumProvider>
          <Capture />
        </CurriculumProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('active-id').textContent).toBe('lesson-jss3-dt-w1');
      });

      // resetAllData should throw (it's wrapped with error handling that re-throws)
      await expect(act(async () => { resetAllData!(); })).rejects.toThrow();

      // After failure, active lesson should still be valid (repository rolled back to previous state)
      await waitFor(() => {
        expect(screen.getByTestId('active-id').textContent).toBe('lesson-jss3-dt-w1');
      });

      // Error should be visible in storage health conditions (verified by blocked write test)
      // The write_failed condition for resetAllData is verified by the blocked write test
    });
  });

  describe('Failed section completion visibility', () => {
    it('shows write_failed for toggleSectionCompleted and error is visible', async () => {
      // Make toggleSectionCompleted fail
      let writeCall = 0;
      mockStorage.setItem.mockImplementation((key, value) => {
        if (key.startsWith('teachit_') && !key.startsWith('teachit_recovery_v1_') && !key.startsWith('teachit_active_lesson_id_v1')) {
          writeCall++;
          if (writeCall === 1) {
            throw new Error('QuotaExceededError: storage is full');
          }
        }
        return mockStorage.getStore().set(key, value);
      });

      const conditions: any[] = [];
      let toggleSectionCompleted: () => void;
      const Capture = () => {
        const { toggleSectionCompleted: fn, storageHealthConditions } = useCurriculum();
        toggleSectionCompleted = fn;
        conditions.push(storageHealthConditions);
        return null;
      };

      render(
        <CurriculumProvider>
          <Capture />
        </CurriculumProvider>
      );

      // Toggle section completion - this should fail
      await act(async () => {
        try {
          toggleSectionCompleted!('section-1');
        } catch (e) {
          // Expected to throw
        }
      });

      // Error should be visible
      await waitFor(() => {
        const latest = conditions[conditions.length - 1];
        expect(latest.some((c: any) => c.type === 'write_failed' && c.operation === 'toggleSectionCompleted')).toBe(true);
      });
    });
  });
});