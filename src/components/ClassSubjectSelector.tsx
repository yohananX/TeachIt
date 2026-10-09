import React from 'react';
import { useLesson } from '../context/LessonContext';
import { ClassItem, SubjectItem } from '../types/lesson';

interface ClassSubjectSelectorProps {
  /** Optional callback when selection changes. */
  onChange?: (classId: string, subjectId: string) => void;
  /** Render as compact pills (true) or full tabs (false). */
  compact?: boolean;
  /** Show class selector. */
  showClass?: boolean;
  /** Show subject selector. */
  showSubject?: boolean;
  /** Custom label for class section. */
  classLabel?: string;
  /** Custom label for subject section. */
  subjectLabel?: string;
}

export const ClassSubjectSelector: React.FC<ClassSubjectSelectorProps> = ({
  onChange,
  compact = false,
  showClass = true,
  showSubject = true,
  classLabel = 'Class',
  subjectLabel = 'Subjects',
}) => {
  const {
    classes,
    subjects,
    selectedClassId,
    setSelectedClassId,
    selectedSubjectId,
    setSelectedSubjectId,
  } = useLesson();

  const handleSelectClass = (classId: string) => {
    setSelectedClassId(classId);
    const firstSubject = subjects.find((s) => s.classId === classId);
    if (firstSubject) {
      setSelectedSubjectId(firstSubject.id);
      onChange?.(classId, firstSubject.id);
    } else {
      onChange?.(classId, '');
    }
  };

  const handleSelectSubject = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    const subject = subjects.find((s) => s.id === subjectId);
    onChange?.(subject?.classId ?? selectedClassId, subjectId);
  };

  const classSubjects = subjects.filter((s) => s.classId === selectedClassId);

  if (!showClass && !showSubject) return null;

  return (
    <div className={`mb-4 ${compact ? '' : 'space-y-4'}`}>
      {showClass && classes.length > 1 && (
        <div>
          <label className={`text-xs font-mono uppercase tracking-wider text-[#786F62] block ${compact ? 'mb-1' : 'mb-2'}`}>
            {classLabel}:
          </label>
          <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#F2ECDD] rounded-lg border border-[#DDD3BF]">
            {classes.map((c) => {
              const isSelected = c.id === selectedClassId;
              return (
                <button
                  key={c.id}
                  onClick={() => handleSelectClass(c.id)}
                  className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition-all cursor-pointer ${
                    compact
                      ? isSelected
                        ? 'bg-[#1C1917] text-white'
                        : 'bg-[#FAF8F3] text-[#574D42] hover:bg-[#F2ECDD]'
                      : isSelected
                        ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs font-semibold'
                        : 'text-[#574D42] hover:text-[#1C1917]'
                  }`}
                >
                  <span>{c.name}</span>
                  {c.arm && <span className="ml-1 text-[11px] text-[#786F62]">({c.arm})</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showSubject && classSubjects.length > 0 && (
        <div>
          <label className={`text-xs font-mono uppercase tracking-wider text-[#786F62] block ${compact ? 'mb-1' : 'mb-2'}`}>
            {subjectLabel}:
          </label>
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            {classSubjects.map((sub) => {
              const isSelected = sub.id === selectedSubjectId;
              return (
                <button
                  key={sub.id}
                  onClick={() => handleSelectSubject(sub.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#1C1917] text-white border-[#1C1917]'
                      : compact
                        ? 'bg-[#FAF8F3] text-[#574D42] border-[#DDD3BF] hover:bg-[#F2ECDD]'
                        : 'bg-[#FAF8F3] text-[#574D42] border-[#DDD3BF] hover:bg-[#F2ECDD]'
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// Convenience: Class tabs only (used in TodayView header area)
export const ClassTabs: React.FC<{ selectedClassId: string; onSelect: (id: string) => void }> = ({
  selectedClassId,
  onSelect,
}) => {
  const { classes } = useLesson();
  return (
    <div className="flex flex-wrap items-center gap-2 p-1.5 bg-[#F2ECDD] rounded-lg border border-[#DDD3BF]">
      {classes.map((c) => {
        const isSelected = c.id === selectedClassId;
        return (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded transition-all cursor-pointer ${
              isSelected
                ? 'bg-[#FAF8F3] text-[#1C1917] shadow-xs font-semibold'
                : 'text-[#574D42] hover:text-[#1C1917]'
            }`}
          >
            <span>{c.name}</span>
            {c.arm && <span className="ml-1 text-[11px] text-[#786F62]">({c.arm})</span>}
          </button>
        );
      })}
    </div>
  );
};

// Convenience: Subject pills only
export const SubjectPills: React.FC<{
  classId: string;
  selectedSubjectId: string;
  onSelect: (id: string) => void;
  label?: string;
}> = ({ classId, selectedSubjectId, onSelect, label }) => {
  const { subjects } = useLesson();
  const classSubjects = subjects.filter((s) => s.classId === classId);
  if (classSubjects.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {label && <span className="text-xs font-mono text-[#786F62] mr-1 hidden sm:inline">{label}:</span>}
      {classSubjects.map((sub) => {
        const isSelected = sub.id === selectedSubjectId;
        return (
          <button
            key={sub.id}
            onClick={() => onSelect(sub.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap cursor-pointer ${
              isSelected
                ? 'bg-[#1C1917] text-white border-[#1C1917]'
                : 'bg-[#FAF8F3] text-[#574D42] border-[#DDD3BF] hover:bg-[#F2ECDD]'
            }`}
          >
            {sub.name}
          </button>
        );
      })}
    </div>
  );
};