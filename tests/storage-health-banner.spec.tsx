/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StorageHealthBanner } from '../src/components/StorageHealthBanner';

describe('StorageHealthBanner', () => {
  const mockOnDismiss = vi.fn();

  beforeEach(() => {
    mockOnDismiss.mockClear();
  });

  describe('Corruption condition', () => {
    it('renders corruption condition with key name, rejected count, and backup status', () => {
      const conditions = [{
        type: 'corruption' as const,
        key: 'teachit_lessons_v1',
        status: 'schema_invalid' as const,
        error: 'Invalid duration',
        rejectedCount: 2,
        backupId: 'backup-123',
        backupStatus: 'saved' as const,
        backupError: undefined,
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Corrupted lessons')).toBeInTheDocument();
      expect(screen.getByText(/2 records failed validation and were not loaded/)).toBeInTheDocument();
      expect(screen.getByText(/A complete backup of the original data was preserved/)).toBeInTheDocument();
      expect(screen.getByText(/Your current lessons may be incomplete/)).toBeInTheDocument();
    });

    it('shows failed backup status when backup failed', () => {
      const conditions = [{
        type: 'corruption' as const,
        key: 'teachit_topics_v1',
        status: 'malformed_json' as const,
        error: 'JSON parse error',
        rejectedCount: 0,
        backupId: 'backup-456',
        backupStatus: 'failed' as const,
        backupError: 'QuotaExceededError',
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Corrupted topics')).toBeInTheDocument();
      expect(screen.getByText(/The stored data could not be read \(malformed JSON\)/)).toBeInTheDocument();
      expect(screen.getByText(/Backup failed: QuotaExceededError/)).toBeInTheDocument();
    });

    it('shows guidance for saved backup', () => {
      const conditions = [{
        type: 'corruption' as const,
        key: 'teachit_lessons_v1',
        status: 'schema_invalid' as const,
        rejectedCount: 1,
        backupId: 'backup-123',
        backupStatus: 'saved' as const,
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByText(/The backup is preserved for recovery/)).toBeInTheDocument();
    });
  });

  describe('Blocked write condition', () => {
    it('renders blocked write condition with key names', () => {
      const conditions = [{
        type: 'blocked_write' as const,
        keys: ['teachit_topics_v1', 'teachit_lessons_v1'],
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Saving blocked')).toBeInTheDocument();
      expect(screen.getByText(/Cannot save changes to topics, lessons/)).toBeInTheDocument();
      expect(screen.getByText(/New changes will not be persisted until this is resolved/)).toBeInTheDocument();
    });
  });

  describe('Unresolved journal condition', () => {
    it('renders unresolved journal condition', () => {
      const conditions = [{
        type: 'unresolved_journal' as const,
        journalId: 'write-abc123',
        error: 'Rollback failed',
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Unresolved save operation')).toBeInTheDocument();
      expect(screen.getByText(/A previous save operation was interrupted/)).toBeInTheDocument();
      expect(screen.getByText(/Saving may be unreliable until resolved/)).toBeInTheDocument();
    });
  });

  describe('Write failed condition', () => {
    it('renders write failed condition with operation and error', () => {
      const conditions = [{
        type: 'write_failed' as const,
        operation: 'saveLesson',
        error: 'Quota exceeded',
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Save failed')).toBeInTheDocument();
      expect(screen.getByText(/Failed to save saveLesson: Quota exceeded/)).toBeInTheDocument();
    });
  });

  describe('Preference persist failed condition', () => {
    it('renders preference persist failed condition', () => {
      const conditions = [{
        type: 'preference_persist_failed' as const,
        operation: 'persistActiveLessonId',
        error: 'QuotaExceededError',
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      expect(screen.getByText('Preference not saved')).toBeInTheDocument();
      expect(screen.getByText(/Could not save persistActiveLessonId preference/)).toBeInTheDocument();
    });
  });

  describe('Dismiss behavior', () => {
    it('calls onDismiss when dismiss button is clicked', () => {
      const conditions = [{
        type: 'write_failed' as const,
        operation: 'saveLesson',
        error: 'Quota exceeded',
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

      expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      expect(mockOnDismiss).toHaveBeenCalledWith(conditions[0]);
    });

    it('does not render when conditions array is empty', () => {
      render(<StorageHealthBanner conditions={[]} onDismiss={mockOnDismiss} />);

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Backup messaging', () => {
    it('does not claim backup can be restored when saved', () => {
      const conditions = [{
        type: 'corruption' as const,
        key: 'teachit_lessons_v1',
        status: 'schema_invalid' as const,
        rejectedCount: 1,
        backupId: 'backup-123',
        backupStatus: 'saved' as const,
      }];

      render(<StorageHealthBanner conditions={conditions} onDismiss={mockOnDismiss} />);

      // Should NOT contain "can be restored"
      expect(screen.getByText(/A complete backup of the original data was preserved/)).toBeInTheDocument();
      expect(screen.queryByText(/can be restored/i)).not.toBeInTheDocument();
    });
  });
});