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
  term: number;
  topic: string;
  durationMinutes: string; // e.g. "40–45 minutes"
  status: LessonStatus;
  isRevision?: boolean;
  revisionReference?: string;
  learningObjectives: string[];
  materials: string[];
  sections: LessonSection[];
  studentNote: StudentNote;
  evaluationQuestions: EvaluationQuestion[];
  assignment: LessonAssignment;
  currentSectionId: string; // The saved "Where am I right now" marker!
  completedSectionIds: string[];
  lastVisitedTimestamp?: string;
}

export type FontSizeSetting = 'sm' | 'md' | 'lg' | 'xl';
export type ThemePaperMode = 'warm-paper' | 'clean-white' | 'slate-focus';

export interface TeacherPreferences {
  fontSize: FontSizeSetting;
  paperMode: ThemePaperMode;
  showTimingGuidance: boolean;
  autoSaveCurrentPosition: boolean;
  audioFeedbackOnStep: boolean;
}
