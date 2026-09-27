import React, { useState } from 'react';
import { useLesson } from '../context/LessonContext';
import { Lesson, LessonSection } from '../types/lesson';
import { X, Plus, Trash2, Save, FileText } from 'lucide-react';

interface LessonEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingLesson?: Lesson | null;
}

export const LessonEditorModal: React.FC<LessonEditorModalProps> = ({
  isOpen,
  onClose,
  existingLesson,
}) => {
  const { classes, subjects, saveLesson } = useLesson();

  const [classId, setClassId] = useState(existingLesson?.classId || 'class-jss3');
  const [subjectId, setSubjectId] = useState(existingLesson?.subjectId || 'sub-jss3-dt');
  const [week, setWeek] = useState(existingLesson?.week || 5);
  const [topic, setTopic] = useState(existingLesson?.topic || '');
  const [duration, setDuration] = useState(existingLesson?.durationMinutes || '40–45 minutes');
  const [isRevision, setIsRevision] = useState(existingLesson?.isRevision || false);
  const [objectivesText, setObjectivesText] = useState(
    existingLesson?.learningObjectives.join('\n') ||
      'Explain the core concept.\nDemonstrate working example.\nPerform student check.'
  );
  const [materialsText, setMaterialsText] = useState(
    existingLesson?.materials.join('\n') || 'Whiteboard, Markers, Demonstration Kit'
  );

  // Hook and first teaching step
  const [hookGuidance, setHookGuidance] = useState(
    existingLesson?.sections[0]?.teacherGuidance.join('\n') ||
      'Start with a quick riddle or real-world problem to hook student attention.'
  );
  const [teachingGuidance, setTeachingGuidance] = useState(
    existingLesson?.sections[2]?.teacherGuidance.join('\n') ||
      'Explain key definitions clearly and write structured points on the board.'
  );
  const [studentNoteSnippet, setStudentNoteSnippet] = useState(
    existingLesson?.studentNote?.takeawaySummary ||
      'Key definition and summary for student exercise books.'
  );

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === classId) || classes[0];
  const classSubjects = subjects.filter((s) => s.classId === classId);
  const currentSubject = classSubjects.find((s) => s.id === subjectId) || classSubjects[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      alert('Please provide a lesson topic title.');
      return;
    }

    const objectives = objectivesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const materials = materialsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newSections: LessonSection[] = existingLesson?.sections || [
      {
        id: 'sec-new-1',
        sectionNumber: '1',
        title: 'Set Induction / Hook',
        suggestedDurationMinutes: 6,
        teacherGuidance: hookGuidance.split('\n').filter(Boolean),
        teacherQuote: 'Listen closely: can you spot the hidden mistake in this process?',
      },
      {
        id: 'sec-new-2',
        sectionNumber: '2',
        title: 'Introduction of Topic',
        suggestedDurationMinutes: 2,
        teacherGuidance: [`Introduce today's lesson: ${topic}. State the learning goals.`],
      },
      {
        id: 'sec-new-3',
        sectionNumber: '3',
        title: 'Teaching / Core Concept Development',
        suggestedDurationMinutes: 20,
        teacherGuidance: teachingGuidance.split('\n').filter(Boolean),
        isKeyTeachingPoint: true,
        studentNoteSnippet: studentNoteSnippet,
      },
      {
        id: 'sec-new-4',
        sectionNumber: '4',
        title: 'Student Notes',
        suggestedDurationMinutes: 6,
        teacherGuidance: ['Direct students to record the structured notebook notes.'],
      },
      {
        id: 'sec-new-5',
        sectionNumber: '5',
        title: 'Evaluation',
        suggestedDurationMinutes: 4,
        teacherGuidance: ['Ask oral questions to evaluate student comprehension.'],
      },
      {
        id: 'sec-new-6',
        sectionNumber: '6',
        title: 'Conclusion & Assignment',
        suggestedDurationMinutes: 2,
        teacherGuidance: ['Wrap up lesson and assign take-home exercises.'],
      },
    ];

    const lessonToSave: Lesson = {
      id: existingLesson?.id || `lesson-${classId}-${Date.now()}`,
      classId: classId,
      className: currentClass.name,
      subjectId: subjectId,
      subjectName: currentSubject?.name || 'General Subject',
      week: Number(week),
      term: 1,
      topic: topic.trim(),
      durationMinutes: duration,
      status: existingLesson?.status || 'planned',
      isRevision: isRevision,
      learningObjectives: objectives,
      materials: materials,
      sections: newSections,
      currentSectionId: existingLesson?.currentSectionId || newSections[0].id,
      completedSectionIds: existingLesson?.completedSectionIds || [],
      studentNote: existingLesson?.studentNote || {
        subject: currentSubject?.name || 'General Subject',
        topic: topic.trim(),
        className: currentClass.name,
        term: 'First Term',
        week: Number(week),
        sections: [
          {
            heading: '1. Topic Overview',
            content: studentNoteSnippet,
          },
        ],
        takeawaySummary: studentNoteSnippet,
      },
      evaluationQuestions: existingLesson?.evaluationQuestions || [
        {
          id: 'eval-new-1',
          questionNumber: 1,
          question: `What is the main definition of ${topic}?`,
          expectedAnswer: 'Clear understanding of core concept covered in class.',
          type: 'oral',
        },
      ],
      assignment: existingLesson?.assignment || {
        title: `${topic} Review Assignment`,
        instructions: 'Answer questions 1 to 3 in your homework exercise book.',
      },
    };

    saveLesson(lessonToSave);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-2xl bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#F2ECDD] border-b border-[#E2D8C3]">
          <div>
            <h3 className="text-base font-serif font-medium text-[#1C1917]">
              {existingLesson ? 'Edit Lesson Plan' : 'Create New Lesson Plan'}
            </h3>
            <span className="text-xs text-[#786F62]">
              Structured curriculum authoring for classroom delivery
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#574D42] hover:text-[#1C1917] hover:bg-[#E2D8C3] rounded transition-colors"
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 text-xs sm:text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-mono text-xs text-[#786F62] block mb-1">Class:</label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  const firstSub = subjects.find((s) => s.classId === e.target.value);
                  if (firstSub) setSubjectId(firstSub.id);
                }}
                className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.arm ? `(${c.arm})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-xs text-[#786F62] block mb-1">Subject:</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
              >
                {classSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-mono text-xs text-[#786F62] block mb-1">Week Number:</label>
              <input
                type="number"
                min="1"
                max="14"
                value={week}
                onChange={(e) => setWeek(Number(e.target.value))}
                className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Lesson Topic Title:</label>
            <input
              type="text"
              placeholder="e.g. Algorithms and Flowcharts, Chemical Equations..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-mono text-xs text-[#786F62] block mb-1">Duration:</label>
              <input
                type="text"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
              />
            </div>

            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRevision}
                  onChange={(e) => setIsRevision(e.target.checked)}
                  className="w-4 h-4 rounded text-[#9A3412]"
                />
                <span className="text-xs text-[#1C1917] font-medium">Mark as Revision of Prior Work</span>
              </label>
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">
              Learning Objectives (One target per line):
            </label>
            <textarea
              rows={3}
              value={objectivesText}
              onChange={(e) => setObjectivesText(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">
              Materials & Resources (One item per line):
            </label>
            <textarea
              rows={2}
              value={materialsText}
              onChange={(e) => setMaterialsText(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">
              Set Induction / Hook Instructions:
            </label>
            <textarea
              rows={2}
              value={hookGuidance}
              onChange={(e) => setHookGuidance(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">
              Core Student Note Takeaway:
            </label>
            <textarea
              rows={2}
              value={studentNoteSnippet}
              onChange={(e) => setStudentNoteSnippet(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          {/* Buttons */}
          <div className="pt-4 border-t border-[#EAE1CD] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#574D42] hover:text-[#1C1917] hover:bg-[#EAE0CB] rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#9A3412] hover:bg-[#852C0F] text-white text-xs font-semibold rounded transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Lesson</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
