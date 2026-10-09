import React, { useState } from 'react';
import { useLesson } from '../context/LessonContext';
import { Lesson } from '../types/lesson';
import { X, Save } from 'lucide-react';

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
  const { classes, subjects, sessions, weeks, topics, saveLesson } = useLesson();

  const [classId, setClassId] = useState('class-jss3');
  const [subjectId, setSubjectId] = useState('sub-jss3-dt');
  const [weekNumber, setWeekNumber] = useState(5);
  const [topicTitle, setTopicTitle] = useState('');
  const [title, setTitle] = useState(existingLesson?.title || '');
  const [duration, setDuration] = useState(existingLesson?.durationMinutes ?? 45);
  const [objectivesText, setObjectivesText] = useState(
    existingLesson?.learningObjectives.join('\n') ||
      'Explain the core concept.\nDemonstrate working example.\nPerform student check.',
  );
  const [materialsText, setMaterialsText] = useState(
    existingLesson?.materials.join('\n') || 'Whiteboard, Markers, Demonstration Kit',
  );
  const [priorKnowledge, setPriorKnowledge] = useState(existingLesson?.priorKnowledge || '');
  const [teacherNotes, setTeacherNotes] = useState(existingLesson?.teacherNotes || '');
  const [studentNotes, setStudentNotes] = useState(existingLesson?.studentNotes || '');
  const [hookContent, setHookContent] = useState(
    existingLesson?.sections[0]?.content ||
      'Start with a quick riddle or real-world problem to hook student attention.',
  );
  const [coreContent, setCoreContent] = useState(
    existingLesson?.sections[1]?.content ||
      'Explain key definitions clearly and write structured points on the board.',
  );

  if (!isOpen) return null;

  const currentClass = classes.find((c) => c.id === classId) || classes[0];
  const classSubjects = subjects.filter((s) => s.classId === classId);
  const currentSubject = classSubjects.find((s) => s.id === subjectId) || classSubjects[0];
  void currentClass;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Please provide a lesson title.');
      return;
    }
    if (!currentSubject) {
      alert('Please select a subject.');
      return;
    }

    const session = sessions.find((s) => s.subjectId === currentSubject.id);
    const week = session
      ? weeks.find((w) => w.sessionId === session.id && w.number === Number(weekNumber))
      : undefined;
    if (!week) {
      alert('Could not find that week for the selected subject.');
      return;
    }

    // Reuse an existing topic with the same title in this week, else create one.
    const topicTitleFinal = topicTitle.trim() || title.trim();
    const existingTopic = topics.find(
      (t) => t.weekId === week.id && t.title.toLowerCase() === topicTitleFinal.toLowerCase(),
    );
    const topicId =
      existingLesson?.topicId ?? existingTopic?.id ?? `topic-${Date.now().toString(36)}`;
    const topicOrder =
      existingTopic?.order ?? topics.filter((t) => t.weekId === week.id).length + 1;
    void topicOrder;

    const objectives = objectivesText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const materials = materialsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const newSections = existingLesson?.sections ?? [
      {
        id: `sec-${Date.now().toString(36)}-1`,
        title: 'Set Induction / Hook',
        durationMinutes: 6,
        content: hookContent,
        teacherGuidance: hookContent,
      },
      {
        id: `sec-${Date.now().toString(36)}-2`,
        title: 'Teaching / Core Concept',
        durationMinutes: 25,
        content: coreContent,
        teacherGuidance: coreContent,
      },
      {
        id: `sec-${Date.now().toString(36)}-3`,
        title: 'Wrap-up & Check',
        durationMinutes: 9,
        content: 'Recap key points, ask oral checks, preview next lesson.',
        teacherGuidance: 'Recap, evaluate, preview next week.',
      },
    ];

    const lessonToSave: Lesson = {
      id: existingLesson?.id || `lesson-${Date.now().toString(36)}`,
      topicId,
      title: title.trim(),
      durationMinutes: Number(duration) || 45,
      learningObjectives: objectives,
      materials,
      priorKnowledge: priorKnowledge.trim() || undefined,
      teacherNotes: teacherNotes.trim() || undefined,
      studentNotes: studentNotes.trim() || undefined,
      sections: newSections,
      evaluation: existingLesson?.evaluation ?? [],
    };

    // If this is a brand-new topic title, the context will create the topic
    // record in the target week to keep Week → Topic → Lesson reachable.
    saveLesson(lessonToSave, { weekId: week.id });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl bg-[#FAF8F3] border border-[#DDD3BF] rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
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
                value={weekNumber}
                onChange={(e) => setWeekNumber(Number(e.target.value))}
                className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
              />
            </div>
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Topic (planning label):</label>
            <input
              type="text"
              placeholder="e.g. Algorithms and Flowcharts"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Lesson Title:</label>
            <input
              type="text"
              placeholder="e.g. Introduction to Sorting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] font-medium"
              required
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Duration (minutes):</label>
            <input
              type="number"
              min="1"
              max="180"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917]"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">
              Learning Objectives (one per line):
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
              Materials (one per line):
            </label>
            <textarea
              rows={2}
              value={materialsText}
              onChange={(e) => setMaterialsText(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Prior Knowledge:</label>
            <textarea
              rows={2}
              value={priorKnowledge}
              onChange={(e) => setPriorKnowledge(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Hook / Opening:</label>
            <textarea
              rows={2}
              value={hookContent}
              onChange={(e) => setHookContent(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Core Teaching Content:</label>
            <textarea
              rows={2}
              value={coreContent}
              onChange={(e) => setCoreContent(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Teacher Notes:</label>
            <textarea
              rows={2}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

          <div>
            <label className="font-mono text-xs text-[#786F62] block mb-1">Student Notes:</label>
            <textarea
              rows={3}
              value={studentNotes}
              onChange={(e) => setStudentNotes(e.target.value)}
              className="w-full p-2 bg-[#FAF7F0] border border-[#DDD3BF] rounded text-[#1C1917] text-xs font-sans"
            />
          </div>

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
