export type LessonStatus = 'planned' | 'in_progress' | 'taught';

// ─────────────────────────────────────────────────────────────────────────────
// DOMAIN HIERARCHY: Teacher → Class → Subject → AcademicSession → Week → Topic → Lesson → LessonSection
// TeachingProgress is kept separate from Lesson (describes delivery, not content).
// ─────────────────────────────────────────────────────────────────────────────

export interface ClassItem {
  id: string;
  name: string;        // e.g. "JSS 3"
  arm?: string;        // e.g. "Gold", "A"
  level: string;       // e.g. "Junior Secondary 3"
}

export interface SubjectItem {
  id: string;
  classId: string;
  name: string;        // e.g. "Digital Technology"
  code: string;        // e.g. "DT-301"
}

export interface AcademicSession {
  id: string;          // 'sess-sub-jss3-dt-t1'
  subjectId: string;
  term: number;        // 1..3
  year?: number;
  label: string;       // 'First Term'
  totalWeeks: number;
  currentWeek: number;
}

export interface Week {
  id: string;          // 'wk-sess-sub-jss3-dt-t1-01'
  sessionId: string;
  number: number;      // 1..totalWeeks
}

export interface Topic {
  id: string;          // 'topic-sub-jss3-dt-w1-01'
  weekId: string;      // FK to Week
  title: string;       // planning label shown in the weekly plan
  order: number;       // position within the week
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
  title: string;
  durationMinutes: number;
  content: string;           // main instructional content for this section
  teacherGuidance: string;   // teacher-facing guidance/prompts
  activity?: string;         // optional student activity description
}

export interface EvaluationQuestion {
  id: string;
  questionNumber: number;
  question: string;
  expectedAnswer: string;
  type: 'oral' | 'written' | 'activity';
}

export interface Lesson {
  id: string;
  topicId: string;           // FK to Topic
  title: string;             // lesson title (distinct from topic title)
  durationMinutes: number;   // total lesson duration in minutes
  learningObjectives: string[];
  materials: string[];
  priorKnowledge?: string;   // what students should already know
  teacherNotes?: string;     // lesson-level teacher notes
  studentNotes?: string;     // simplified student note content (markdown/plain text)
  resources?: LessonResource[]; // lesson-wide resources
  sections: LessonSection[];
  evaluation: EvaluationQuestion[];
}

// Transitional read model for UI: Lesson joined with its TeachingProgress.
// Remove once plan/teach views read TeachingProgress directly.
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
}