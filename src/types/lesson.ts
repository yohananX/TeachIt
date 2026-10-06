export type LessonStatus = 'planned' | 'in_progress' | 'taught';

export interface ClassItem {
  id: string;
  name: string; // e.g. "JSS 3", "JSS 2", "JSS 1", "SSS 1"
  arm?: string; // e.g. "Gold", "A"
  level: string;
  subjectCount: number;
}

export interface SubjectItem {
  id: string;
  classId: string;
  name: string; // e.g. "Digital Technology"
  code: string;
  department: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Curriculum hierarchy:
//   Class → Subject → AcademicSession → Week → Topic → Lesson → LessonSection
// TeachingProgress is kept separately from Lesson (it describes delivery, not
// content) and is keyed by lessonId.
// ─────────────────────────────────────────────────────────────────────────────

export interface AcademicSession {
  id: string; // 'sess-sub-jss3-dt-t1'
  subjectId: string;
  term: number; // 1..3
  year?: number;
  label: string; // 'First Term'
  totalWeeks: number;
  currentWeek: number;
}

export interface Week {
  id: string; // 'wk-sess-sub-jss3-dt-t1-01'
  sessionId: string;
  number: number; // 1..totalWeeks
}

export interface Topic {
  id: string; // 'topic-lesson-jss3-dt-w1'
  weekId: string;
  title: string; // planning label shown in the weekly plan
  order: number; // position within the week
  lessonIds: string[]; // a topic may span several lessons; empty = not prepared yet
}

export interface TeachingProgress {
  lessonId: string;
  status: LessonStatus;
  currentSectionId: string | null;
  completedSectionIds: string[];
  lastVisitedAt?: string;
}

export interface LessonResource {
  id: string;
  type: 'image' | 'video' | 'link';
  title: string;
  description?: string;
  url: string;
  caption?: string;
  videoDuration?: string;
  linkDomain?: string;
}

export interface LessonSection {
  id: string;
  sectionNumber: string; // "1", "2", "3A", "3B", "3C", "3D", "4", "5", "6"
  groupTitle?: string; // e.g. "Teaching / Development"
  title: string;
  suggestedDurationMinutes: number | string;
  teacherGuidance: string[];
  teacherQuote?: string; // Teacher spoken prompt or question
  keyPoints?: string[];
  studentNoteSnippet?: string;
  resources?: LessonResource[];
  isKeyTeachingPoint?: boolean;
}

export interface StudentNoteSection {
  heading: string;
  subheading?: string;
  content: string;
  bulletPoints?: string[];
  examples?: string[];
  formulaOrCode?: string;
}

export interface StudentNote {
  subject: string;
  topic: string;
  className: string;
  term: string;
  week: number;
  sections: StudentNoteSection[];
  takeawaySummary: string;
}

export interface EvaluationQuestion {
  id: string;
  questionNumber: number;
  question: string;
  expectedAnswer: string;
  type: 'oral' | 'written' | 'activity';
}

export interface LessonAssignment {
  title: string;
  instructions: string;
  submissionDeadline?: string;
  gradingCriteria?: string;
}

export interface Lesson {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  week: number;
  topic: string;
  durationMinutes: string; // e.g. "40–45 minutes"
  isRevision?: boolean;
  revisionReference?: string;
  learningObjectives: string[];
  materials: string[];
  sections: LessonSection[];
  studentNote: StudentNote;
  evaluationQuestions: EvaluationQuestion[];
  assignment: LessonAssignment;
}

/**
 * Transitional read model handed to the UI: a Lesson joined with its
 * TeachingProgress. Components still render progress fields as if they lived on
 * the lesson; they are derived here so progress keeps a single source of truth.
 * Remove once the plan/teach views read TeachingProgress directly.
 */
export type LessonWithProgress = Lesson & {
  status: LessonStatus;
  currentSectionId: string | null;
  completedSectionIds: string[];
};

export type FontSizeSetting = 'sm' | 'md' | 'lg' | 'xl';
export type ThemePaperMode = 'warm-paper' | 'clean-white' | 'slate-focus';

export interface TeacherPreferences {
  fontSize: FontSizeSetting;
  paperMode: ThemePaperMode;
  showTimingGuidance: boolean;
  autoSaveCurrentPosition: boolean;
  audioFeedbackOnStep: boolean;
}
