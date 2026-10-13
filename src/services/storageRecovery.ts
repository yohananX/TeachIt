/**
 * Durable recovery storage for curriculum persistence failures.
 *
 * Two mechanisms are provided, both living in localStorage under dedicated
 * `teachit_recovery_v1_*` keys that are never part of the curriculum write set:
 *
 * 1. Corruption backups — the COMPLETE original payload of a storage key that
 *    failed to parse or failed schema validation, preserved before any code
 *    path that could replace or discard it. Each record is associated with the
 *    original storage key, the corruption type, a timestamp and a recovery id,
 *    plus the complete JSON of every individual record that was rejected during
 *    partial schema recovery. These records are the real backup; the truncated
 *    `rawPreview` kept in diagnostics is for display only and must never be
 *    treated as a backup.
 *
 * 2. A write-ahead journal for multi-key writes — before `saveAll()` touches
 *    any curriculum key it records the original AND intended value of every key
 *    involved. If a write fails midway, the journal is used to roll the written
 *    keys back to their original values. If rollback itself fails, the journal
 *    stays in place so the next startup can detect the incomplete operation and
 *    resolve it deterministically (see `resolvePendingWrite`).
 *
 * Known limitation: localStorage does not provide atomic multi-key writes. This
 * module provides journaled writes with rollback and startup recovery, which
 * bounds the window of inconsistency to a crash between individual setItem
 * calls — it is not true atomicity.
 */

export const RECOVERY_KEYS = {
  /** Index of preserved corrupted payloads. */
  CORRUPTION_BACKUPS: 'teachit_recovery_v1_corruption_backups',
  /** Write-ahead journal for multi-key writes. */
  PENDING_WRITE: 'teachit_recovery_v1_pending_write',
} as const;

/** Keep at most this many corruption backup records (newest first). */
const MAX_BACKUP_RECORDS = 10;

/**
 * After a quota failure, retry preserving with at most this many total records.
 */
const PRUNED_BACKUP_RECORDS = 7;

export type CorruptionKind = 'malformed_json' | 'schema_invalid';

/** A single record rejected during partial schema recovery, with its complete JSON. */
export interface RejectedRecord {
  /** Index of the record inside the original parsed array. */
  index: number;
  /** Complete JSON representation of the rejected record (never truncated). */
  raw: string;
}

/** Durable backup of one corrupted storage key. */
export interface CorruptionBackupRecord {
  /** Recovery identifier (unique per saved backup). */
  id: string;
  /** ISO timestamp of when the payload was preserved. */
  savedAt: string;
  /** The storage key the payload was originally read from. */
  originalKey: string;
  /** Why the payload was considered corrupt. */
  corruptionType: CorruptionKind;
  /** Human-readable reason (parse error / validation summary). */
  reason: string;
  /** The COMPLETE original raw payload — never truncated. */
  raw: string;
  /** Individual records rejected during partial schema recovery. */
  rejectedRecords: RejectedRecord[];
}

export interface PendingWriteJournalEntry {
  key: string;
  /** Value stored before the write began (null = key was absent). */
  originalValue: string | null;
  /** Value the write intended to store (null = the key was to be removed). */
  newValue: string | null;
}

export interface PendingWriteJournal {
  /** Recovery identifier for the interrupted operation. */
  id: string;
  startedAt: string;
  /** Which operation started the write (e.g. "saveAll"). */
  operation: string;
  entries: PendingWriteJournalEntry[];
}

export type StorageWriteFailureReason = 'journal_failed' | 'write_failed' | 'rollback_failed';

/** Error thrown when a journaled write cannot complete safely. */
export class StorageWriteError extends Error {
  readonly reason: StorageWriteFailureReason;
  readonly causeError?: unknown;

  constructor(message: string, reason: StorageWriteFailureReason, causeError?: unknown) {
    super(message);
    this.name = 'StorageWriteError';
    this.reason = reason;
    this.causeError = causeError;
  }
}

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Storage is resolved lazily so tests can substitute `globalThis.localStorage`. */
const storage = (): Storage => globalThis.localStorage;

let idCounter = 0;
const makeId = (prefix: string): string => {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}-${random}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Corruption backups
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read all preserved corruption backups (newest first).
 * A malformed backup index is treated as empty: the index is recovery metadata,
 * and refusing to preserve new payloads would be worse than re-reading it.
 */
export function readCorruptionBackups(): CorruptionBackupRecord[] {
  const raw = storage().getItem(RECOVERY_KEYS.CORRUPTION_BACKUPS);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      Array.isArray((parsed as { records?: unknown }).records)
    ) {
      return (parsed as { records: CorruptionBackupRecord[] }).records;
    }
    return [];
  } catch {
    return [];
  }
}

/** List preserved backups for one original storage key. */
export function listCorruptionBackupsForKey(originalKey: string): CorruptionBackupRecord[] {
  return readCorruptionBackups().filter((r) => r.originalKey === originalKey);
}

/** Get one preserved backup by its recovery id. */
export function getCorruptionBackup(id: string): CorruptionBackupRecord | undefined {
  return readCorruptionBackups().find((r) => r.id === id);
}

/** Information about records lost for a corruption incident during quota-retry pruning. */
export interface IncidentLoss {
  /** The storage key the incident originated from. */
  originalKey: string;
  /** The corruption type of the incident. */
  corruptionType: CorruptionKind;
  /** Number of backup records discarded for this incident. */
  recordsDiscarded: number;
  /** Whether the incident's last backup was discarded (incident completely dropped). */
  incidentDropped: boolean;
  /** Whether at least one backup for this incident remains after pruning. */
  backupRemains: boolean;
}

/** Result of smart pruning, including metadata about all losses. */
export interface PrunedResult {
  /** The pruned records that fit within the quota. */
  records: CorruptionBackupRecord[];
  /** Per-incident loss details for all affected incidents. */
  incidentLosses: IncidentLoss[];
  /** Whether any incident was completely dropped (no backup remains). */
  anyIncidentDropped: boolean;
  /** Total number of records discarded across all incidents. */
  totalRecordsDiscarded: number;
}

/** Result of preserving a corrupted payload, including quota-retry pruning metadata. */
export type PreserveResult =
  | { ok: true; record: CorruptionBackupRecord; deduped: boolean; pruned?: PrunedResult }
  | { ok: false; error: string };

/**
 * Durably preserve a complete corrupted payload before it can be replaced or
 * discarded. The record is associated with the original storage key, the
 * corruption type, a timestamp and a recovery id.
 *
 * Failure handling:
 * - If the write fails (typically a quota error), older backup records are
 *   pruned and the write is retried once.
 * - If it still fails, `{ ok: false }` is returned and the caller must leave
 *   the original key untouched and surface the failure.
 * - Re-preserving an identical payload for the same key reuses the existing
 *   record instead of duplicating it on every startup.
 */
export function preserveCorruptedPayload(params: {
  originalKey: string;
  corruptionType: CorruptionKind;
  reason: string;
  raw: string;
  rejectedRecords?: RejectedRecord[];
}): PreserveResult {
  const existing = readCorruptionBackups();

  const duplicate = existing.find(
    (r) =>
      r.originalKey === params.originalKey &&
      r.corruptionType === params.corruptionType &&
      r.raw === params.raw,
  );
  if (duplicate) return { ok: true, record: duplicate, deduped: true };

  const record: CorruptionBackupRecord = {
    id: makeId('backup'),
    savedAt: new Date().toISOString(),
    originalKey: params.originalKey,
    corruptionType: params.corruptionType,
    reason: params.reason,
    raw: params.raw,
    rejectedRecords: params.rejectedRecords ?? [],
  };

  const writeRecords = (records: CorruptionBackupRecord[]): void => {
    storage().setItem(RECOVERY_KEYS.CORRUPTION_BACKUPS, JSON.stringify({ records }));
  };

  try {
    writeRecords([record, ...existing].slice(0, MAX_BACKUP_RECORDS));
    return { ok: true, record, deduped: false };
  } catch {
    // Likely quota exhaustion. Retry once with smart pruning:
    // preserve at least one backup per unique (originalKey, corruptionType) incident,
    // plus the newest records up to PRUNED_BACKUP_RECORDS total.
    // This ensures we never delete the only recoverable copy of an incident.
    const pruned = smartPruneForQuota([record, ...existing]);
    try {
      writeRecords(pruned.records);
      return { ok: true, record, deduped: false, pruned };
    } catch (retryError) {
      return { ok: false, error: describeError(retryError) };
    }
  }
}

/**
 * Prune backup records for quota recovery while preserving at least one record
 * per unique corruption incident (identified by originalKey + corruptionType).
 * Keeps the oldest record per incident (first occurrence = unrecovered longest)
 * plus the newest records up to the limit. If unique incidents exceed capacity,
 * drops the oldest incidents (by their oldest record's timestamp) to fit.
 *
 * Returns detailed metadata about all records discarded, distinguishing:
 * - incidents completely dropped (no backup remains)
 * - redundant backups dropped while incident remains backed up
 * - incidents with no loss
 */
function smartPruneForQuota(records: CorruptionBackupRecord[]): PrunedResult {
  if (records.length <= PRUNED_BACKUP_RECORDS) {
    // No pruning needed - all records fit
    const incidentLosses: IncidentLoss[] = [];
    for (const record of records) {
      incidentLosses.push({
        originalKey: record.originalKey,
        corruptionType: record.corruptionType,
        recordsDiscarded: 0,
        incidentDropped: false,
        backupRemains: true,
      });
    }
    // Deduplicate incident losses (one per incident)
    const uniqueLosses = new Map<string, IncidentLoss>();
    for (const loss of incidentLosses) {
      const key = `${loss.originalKey}|${loss.corruptionType}`;
      if (!uniqueLosses.has(key)) {
        uniqueLosses.set(key, loss);
      }
    }
    return {
      records,
      incidentLosses: Array.from(uniqueLosses.values()),
      anyIncidentDropped: false,
      totalRecordsDiscarded: 0,
    };
  }

  // Group by incident (originalKey + corruptionType)
  const byIncident = new Map<string, CorruptionBackupRecord[]>();
  for (const r of records) {
    const key = `${r.originalKey}|${r.corruptionType}`;
    if (!byIncident.has(key)) byIncident.set(key, []);
    byIncident.get(key)!.push(r);
  }

  // For each incident, sort by timestamp (oldest first)
  for (const incidentRecords of byIncident.values()) {
    incidentRecords.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
  }

  // Determine which records to keep
  // Strategy: keep the oldest record of each incident, then fill remaining capacity with newest records
  const incidentOldest = new Map<string, CorruptionBackupRecord>();
  for (const [incidentKey, incidentRecords] of byIncident) {
    incidentOldest.set(incidentKey, incidentRecords[0]);
  }

  const protectedRecords = Array.from(incidentOldest.values());

  // If unique incidents exceed capacity, we must drop entire incidents
  let retainedRecords: CorruptionBackupRecord[];
  let retainedIds: Set<string>;
  let retainedIncidentKeys: Set<string>;

  if (protectedRecords.length > PRUNED_BACKUP_RECORDS) {
    // Unique incidents exceed capacity - must drop entire incidents
    // Sort incidents by their oldest record's timestamp (oldest first = drop these)
    protectedRecords.sort((a, b) => a.savedAt.localeCompare(b.savedAt));
    // Keep the newest PRUNED_BACKUP_RECORDS incidents
    const keptRecords = protectedRecords.slice(-PRUNED_BACKUP_RECORDS);
    retainedRecords = keptRecords;
    retainedIds = new Set(keptRecords.map((r) => r.id));
    retainedIncidentKeys = new Set(keptRecords.map(r => `${r.originalKey}|${r.corruptionType}`));
  } else {
    // Unique incidents fit within capacity; keep oldest per incident
    // If we still have room, add newest records (excluding already-protected)
    const protectedIds = new Set(protectedRecords.map((r) => r.id));
    const remaining = records.filter((r) => !protectedIds.has(r.id));
    const capacity = Math.max(PRUNED_BACKUP_RECORDS - protectedRecords.length, 0);
    const additional = remaining.slice(0, capacity);

    // Build the final retained set
    retainedRecords = [...protectedRecords, ...additional];
    retainedIds = new Set(retainedRecords.map((r) => r.id));
    retainedIncidentKeys = new Set<string>();
    for (const r of retainedRecords) {
      retainedIncidentKeys.add(`${r.originalKey}|${r.corruptionType}`);
    }
  }

  // Calculate losses for each incident
  const incidentLosses: IncidentLoss[] = [];
  let totalRecordsDiscarded = 0;

  for (const [incidentKey, incidentRecords] of byIncident) {
    const retainedForIncident = incidentRecords.filter((r) => retainedIds.has(r.id));
    const recordsDiscarded = incidentRecords.length - retainedForIncident.length;
    const incidentDropped = retainedForIncident.length === 0;
    const backupRemains = retainedForIncident.length > 0;

    totalRecordsDiscarded += recordsDiscarded;

    incidentLosses.push({
      originalKey: incidentRecords[0].originalKey,
      corruptionType: incidentRecords[0].corruptionType,
      recordsDiscarded,
      incidentDropped,
      backupRemains,
    });
  }

  // Sort retained records newest first, cap at PRUNED_BACKUP_RECORDS
  const prunedRecords = retainedRecords
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, PRUNED_BACKUP_RECORDS);

  return {
    records: prunedRecords,
    incidentLosses,
    anyIncidentDropped: incidentLosses.some((l) => l.incidentDropped),
    totalRecordsDiscarded,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Journaled multi-key writes
// ─────────────────────────────────────────────────────────────────────────────

export interface WriteEntry {
  key: string;
  /** Complete new value, or null to remove the key. */
  value: string | null;
}

/**
 * Read the pending write journal. Returns null if no journal exists.
 * Throws only if the journal EXISTS but is malformed (cannot be parsed).
 */
export function readPendingWrite(): PendingWriteJournal | null {
  const raw = storage().getItem(RECOVERY_KEYS.PENDING_WRITE);
  if (raw === null) return null; // No journal = normal, no pending write
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `Pending write journal is malformed (${describeError(error)}); ` +
        `cannot safely reconcile interrupted multi-key write. ` +
        `The journal at "${RECOVERY_KEYS.PENDING_WRITE}" must be resolved manually.`,
    );
  }
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray((parsed as { entries?: unknown }).entries)
  ) {
    throw new Error(
      `Pending write journal has invalid structure; ` +
        `cannot safely reconcile interrupted multi-key write. ` +
        `The journal at "${RECOVERY_KEYS.PENDING_WRITE}" must be resolved manually.`,
    );
  }
  return parsed as PendingWriteJournal;
}

/**
 * Try to read the pending write journal. Returns null if absent or malformed.
 * Use this when you want to detect but not fail on a corrupt journal.
 */
export function tryReadPendingWrite(): PendingWriteJournal | null {
  try {
    return readPendingWrite();
  } catch {
    return null;
  }
}

const applyEntry = (store: Storage, entry: WriteEntry): void => {
  if (entry.value === null) store.removeItem(entry.key);
  else store.setItem(entry.key, entry.value);
};

const rollbackEntries = (
  store: Storage,
  entries: PendingWriteJournalEntry[],
): string | null => {
  for (const entry of entries) {
    try {
      if (entry.originalValue === null) store.removeItem(entry.key);
      else store.setItem(entry.key, entry.originalValue);
    } catch (error) {
      return describeError(error);
    }
  }
  return null;
};

/**
 * Write several keys as one journaled operation.
 *
 * Strategy:
 * 1. Record original + intended value of every key in the write-ahead journal.
 *    If the journal itself cannot be written (quota), NOTHING is touched.
 * 2. Apply the writes. A setItem that throws is assumed to have left its key
 *    unchanged (per the Storage specification).
 * 3. On failure, roll every already-written key back to its original value and
 *    clear the journal. If rollback fails, the journal is preserved so the
 *    next startup can resolve the incomplete operation.
 * 4. On success, clear the journal. If clearing fails, a stale journal is
 *    resolved deterministically on next startup by comparing stored values
 *    against the journal's intended values.
 *
 * This is NOT true atomicity — localStorage cannot provide it. It bounds the
 * inconsistency window to a crash between two individual setItem calls, with
 * durable recovery information covering that window.
 */
export function commitJournaledWrite(entries: WriteEntry[], operation: string): void {
  if (entries.length === 0) return;
  const store = storage();

  const journal: PendingWriteJournal = {
    id: makeId('write'),
    startedAt: new Date().toISOString(),
    operation,
    entries: entries.map((entry) => ({
      key: entry.key,
      originalValue: store.getItem(entry.key),
      newValue: entry.value,
    })),
  };

  try {
    store.setItem(RECOVERY_KEYS.PENDING_WRITE, JSON.stringify(journal));
  } catch (error) {
    throw new StorageWriteError(
      `write journal could not be recorded, no data key was touched (${describeError(error)})`,
      'journal_failed',
      error,
    );
  }

  const written: WriteEntry[] = [];
  for (const entry of entries) {
    try {
      applyEntry(store, entry);
      written.push(entry);
    } catch (error) {
      const rollbackError = rollbackEntries(
        store,
        journal.entries.slice(0, written.length),
      );
      if (rollbackError) {
        // Journal intentionally left in place for startup recovery.
        throw new StorageWriteError(
          `write failed while persisting "${entry.key}" (${describeError(error)}) and rollback also failed (${rollbackError}); ` +
            `the write journal was preserved at "${RECOVERY_KEYS.PENDING_WRITE}" so the next startup can resolve the incomplete operation`,
          'rollback_failed',
          error,
        );
      }
      try {
        store.removeItem(RECOVERY_KEYS.PENDING_WRITE);
      } catch {
        // Best-effort; a stale journal resolves to "already rolled back" on startup.
      }
      throw new StorageWriteError(
        `write failed while persisting "${entry.key}" (${describeError(error)}); all keys were rolled back to their previous values`,
        'write_failed',
        error,
      );
    }
  }

  try {
    store.removeItem(RECOVERY_KEYS.PENDING_WRITE);
  } catch {
    // Best-effort; resolved deterministically on next startup.
  }
}

/**
 * Startup reconciliation for an interrupted multi-key write. Deterministic and
 * idempotent: either every key matches the intended value (operation actually
 * completed), or every key is restored to its original value.
 *
 * Why roll BACK rather than roll FORWARD a partial write: the journal carries
 * the intended value for every key, so completing the write is technically
 * possible — but it is deliberately rejected. Callers of saveAll() were told
 * the write failed (the error propagated and in-memory state was rolled back),
 * so silently committing the failed operation later would contradict the API
 * contract and could persist state the application already treated as
 * rejected. Rolling back to the last consistent committed state is the
 * behavior callers can reason about.
 *
 * If the journal is malformed, we cannot safely determine the state of the
 * interrupted write. The resolution reports 'malformed_journal' and the
 * repository blocks all writes to prevent corruption.
 */
export type PendingWriteResolution =
  | { status: 'none' }
  /** The interrupted write had fully completed; only journal cleanup remained. */
  | { status: 'committed'; journalId: string }
  /** All keys were restored to their pre-write values. */
  | { status: 'rolled_back'; journalId: string }
  /** Rollback was attempted again and failed; the journal stays for the next attempt. */
  | { status: 'unresolved'; journalId: string; error: string }
  /** The journal itself is malformed; cannot safely reconcile. Write operations are blocked. */
  | { status: 'malformed_journal'; error: string };

export function resolvePendingWrite(): PendingWriteResolution {
  const store = storage();
  let journal: PendingWriteJournal | null;
  try {
    journal = readPendingWrite();
  } catch (error) {
    // Journal exists but is malformed — we cannot safely reconcile.
    return { status: 'malformed_journal', error: describeError(error) };
  }

  if (!journal) return { status: 'none' };

  const clearJournal = (): void => {
    try {
      store.removeItem(RECOVERY_KEYS.PENDING_WRITE);
    } catch {
      // Best-effort; resolution is idempotent so a repeat run is harmless.
    }
  };

  let allCommitted = true;
  let allOriginal = true;
  for (const entry of journal.entries) {
    const current = store.getItem(entry.key);
    if (current !== entry.newValue) allCommitted = false;
    if (current !== entry.originalValue) allOriginal = false;
  }

  if (allOriginal) {
    clearJournal();
    return { status: 'rolled_back', journalId: journal.id };
  }
  if (allCommitted) {
    clearJournal();
    return { status: 'committed', journalId: journal.id };
  }

  // Mixed state: the write was interrupted midway. Restore the pre-write state.
  for (const entry of journal.entries) {
    const current = store.getItem(entry.key);
    if (current === entry.originalValue) continue;
    try {
      if (entry.originalValue === null) store.removeItem(entry.key);
      else store.setItem(entry.key, entry.originalValue);
    } catch (error) {
      return { status: 'unresolved', journalId: journal.id, error: describeError(error) };
    }
  }
  clearJournal();
  return { status: 'rolled_back', journalId: journal.id };
}

/**
 * Restore a preserved payload back to its original storage key (deterministic
 * recovery of a previously corrupted key). Uses the same journaled write path.
 */
export function restoreCorruptionBackup(id: string): { restored: boolean; error?: string } {
  const record = getCorruptionBackup(id);
  if (!record) return { restored: false, error: `No backup found with id "${id}"` };
  try {
    commitJournaledWrite([{ key: record.originalKey, value: record.raw }], 'restore_corruption_backup');
    return { restored: true };
  } catch (error) {
    return { restored: false, error: describeError(error) };
  }
}
