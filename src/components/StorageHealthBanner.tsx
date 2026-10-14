import React from 'react';

/**
 * Storage health condition types for the banner.
 * Each condition has a specific message, severity, and action guidance.
 */
export type StorageHealthCondition =
  | { type: 'corruption'; key: string; status: 'malformed_json' | 'schema_invalid'; error?: string; rejectedCount: number; backupId?: string; backupStatus: 'saved' | 'failed'; backupError?: string }
  | { type: 'blocked_write'; keys: string[] }
  | { type: 'unresolved_journal'; journalId: string; error: string }
  | { type: 'orphan_repair_failed'; topicsCreated: number; error: string }
  | { type: 'seed_persist_failed'; error: string }
  | { type: 'write_failed'; operation: string; error: string }
  | { type: 'preference_persist_failed'; operation: string; error: string };

export interface StorageHealthBannerProps {
  /** Current storage health conditions to display */
  conditions: StorageHealthCondition[];
  /** Called when user dismisses a specific condition */
  onDismiss: (condition: StorageHealthCondition) => void;
  /** Called when user acknowledges but wants to keep the condition visible */
  onAcknowledge?: (condition: StorageHealthCondition) => void;
}

/**
 * Maps a storage key to a human-readable data category name.
 */
function getKeyDisplayName(key: string): string {
  const map: Record<string, string> = {
    'teachit_lessons_v1': 'lessons',
    'teachit_topics_v1': 'topics',
    'teachit_weeks_v1': 'weeks',
    'teachit_sessions_v1': 'academic sessions',
    'teachit_subjects_v1': 'subjects',
    'teachit_classes_v1': 'classes',
    'teachit_progress_v1': 'teaching progress',
  };
  return map[key] ?? key.replace(/^teachit_|_v1$/g, '').replace(/_/g, ' ');
}

/**
 * Gets a user-friendly description of the corruption type.
 */
function getCorruptionDescription(status: 'malformed_json' | 'schema_invalid', rejectedCount: number): string {
  if (status === 'malformed_json') {
    return 'The stored data could not be read (malformed JSON).';
  }
  return rejectedCount > 0
    ? `${rejectedCount} record${rejectedCount === 1 ? '' : 's'} failed validation and were not loaded.`
    : 'The stored data did not match the expected format.';
}

/**
 * Gets a user-friendly description of the backup status.
 */
function getBackupDescription(backupStatus: 'saved' | 'failed', backupError?: string): string {
  if (backupStatus === 'saved') {
    return 'A complete backup of the original data was preserved.';
  }
  return `Backup failed: ${backupError ?? 'storage may be full'}. The original data remains in storage but cannot be overwritten safely.`;
}

/**
 * StorageHealthBanner - Displays storage health warnings to the teacher.
 * Builds on the visual conventions of OrphanRepairWarningBanner.
 * Uses role="alert" for accessibility, keyboard-accessible dismiss, and mobile-friendly layout.
 */
export const StorageHealthBanner: React.FC<StorageHealthBannerProps> = ({
  conditions,
  onDismiss,
  onAcknowledge,
}) => {
  if (conditions.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[600] bg-error-bg border-b border-error px-4 py-3 text-sm text-error shadow-lg animate-slide-down">
      <div className="max-w-7xl mx-auto">
        {conditions.map((condition, index) => (
          <div key={`${condition.type}-${index}`} className="mb-3 last:mb-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0" role="alert" aria-live="polite">
                <p className="font-medium">{getConditionTitle(condition)}</p>
                <p className="mt-1 text-sm opacity-90">{getConditionMessage(condition)}</p>
                {getConditionGuidance(condition) && (
                  <p className="mt-1 text-sm opacity-80">{getConditionGuidance(condition)}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button
                  onClick={() => onDismiss(condition)}
                  className="px-3 py-1 text-error hover:bg-error/10 rounded focus-ring whitespace-nowrap"
                  aria-label={`Dismiss ${getConditionTitle(condition).toLowerCase()} warning`}
                >
                  Dismiss
                </button>
                {onAcknowledge && (
                  <button
                    onClick={() => onAcknowledge!(condition)}
                    className="px-3 py-1 text-error/80 hover:bg-error/5 rounded focus-ring whitespace-nowrap text-xs"
                    aria-label={`Acknowledge ${getConditionTitle(condition).toLowerCase()} but keep visible`}
                  >
                    Keep visible
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Returns a short title for the condition. */
function getConditionTitle(condition: StorageHealthCondition): string {
  switch (condition.type) {
    case 'corruption':
      return `Corrupted ${getKeyDisplayName(condition.key)}`;
    case 'blocked_write':
      return 'Saving blocked';
    case 'unresolved_journal':
      return 'Unresolved save operation';
    case 'orphan_repair_failed':
      return 'Topic repair not saved';
    case 'seed_persist_failed':
      return 'Initial setup not saved';
    case 'write_failed':
      return 'Save failed';
    case 'preference_persist_failed':
      return 'Preference not saved';
  }
}

/** Returns the main message for the condition. */
function getConditionMessage(condition: StorageHealthCondition): string {
  switch (condition.type) {
    case 'corruption': {
      const keyName = getKeyDisplayName(condition.key);
      const desc = getCorruptionDescription(condition.status, condition.rejectedCount);
      const backupDesc = getBackupDescription(condition.backupStatus, condition.backupError);
      return `${desc} ${backupDesc} Your current ${keyName} may be incomplete.`;
    }
    case 'blocked_write': {
      const keyNames = condition.keys.map(getKeyDisplayName).join(', ');
      return `Cannot save changes to ${keyNames} because the original corrupted data could not be backed up. New changes will not be persisted until this is resolved.`;
    }
    case 'unresolved_journal':
      return `A previous save operation was interrupted and could not be fully rolled back (${condition.error}). Saving may be unreliable until resolved.`;
    case 'orphan_repair_failed':
      return `${condition.topicsCreated} repaired topic relationship${condition.topicsCreated === 1 ? '' : 's'} could not be saved to storage (${condition.error}). They are available now but may be lost on restart.`;
    case 'seed_persist_failed':
      return `Initial data could not be saved to storage (${condition.error}). Your changes may not persist after a reload.`;
    case 'write_failed':
      return `Failed to save ${condition.operation}: ${condition.error}. The change was not persisted.`;
    case 'preference_persist_failed':
      return `Could not save ${condition.operation} preference (${condition.error}). The change is active for this session but may not persist after reload.`;
  }
}

/** Returns additional guidance for the condition, if any. */
function getConditionGuidance(condition: StorageHealthCondition): string | null {
  switch (condition.type) {
    case 'corruption':
      if (condition.backupStatus === 'saved') {
        return 'The backup is preserved for recovery. Free up storage space to enable saving.';
      }
      return 'Free up storage space to enable backup and recovery.';
    case 'blocked_write':
      return 'Free up storage space, then the original data can be backed up and saving will resume.';
    case 'unresolved_journal':
      return 'Try saving again. If the problem persists, the journal may need manual resolution.';
    case 'orphan_repair_failed':
      return 'Try saving any lesson to persist the repaired topics. They will be saved on the next successful write.';
    case 'seed_persist_failed':
      return 'Try saving any lesson to persist the initial data.';
    case 'write_failed':
      return 'Try the action again. If it keeps failing, check available storage space.';
    case 'preference_persist_failed':
      return 'Try the action again. If it keeps failing, check available storage space.';
  }
}

export default StorageHealthBanner;