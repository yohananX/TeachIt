# TeachIt — Backend Data Model (V1)

Status: **design only** — no implementation. Target store: PostgreSQL.
Source of truth for field shapes: `src/types/lesson.ts`.

Scope per `prompt.txt` Phase 10: classes, subjects, academic sessions, weeks,
topics, lessons, lesson sections, resources, teaching progress.
Explicitly out of scope: authentication, student accounts, analytics, AI,
school administration.

---

## 1. Entity Relationship Diagram

```mermaid
erDiagram
    classes ||--o{ subjects : "has"
    subjects ||--o{ academic_sessions : "runs"
    academic_sessions ||--o{ weeks : "spans"
    weeks ||--o{ topics : "plans"
    topics ||--o{ lessons : "contains"
    lessons ||--o{ lesson_sections : "sequences"
    lessons ||--o{ lesson_resources : "attaches"
    lessons ||--o| teaching_progress : "tracked by"
    teaching_progress }o--|| lesson_sections : "current_section_id"

    classes {
        text id PK
        text name
        text arm
        text level
    }
    subjects {
        text id PK
        text class_id FK
        text name
        text code
    }
    academic_sessions {
        text id PK
        text subject_id FK
        smallint term
        int year
        text label
        int total_weeks
        int current_week
    }
    weeks {
        text id PK
        text session_id FK
        int number
    }
    topics {
        text id PK
        text week_id FK
        text title
        int position
    }
    lessons {
        text id PK
        text topic_id FK
        text title
        int duration_minutes
        jsonb learning_objectives
        jsonb materials
        text prior_knowledge
        text teacher_notes
        text student_notes
        jsonb evaluation
    }
    lesson_sections {
        text id PK
        text lesson_id FK
        text title
        int duration_minutes
        text content
        text teacher_guidance
        text activity
        int position
    }
    lesson_resources {
        text id PK
        text lesson_id FK
        text type
        text title
        text url
        int position
    }
    teaching_progress {
        text lesson_id PK_FK
        text status
        text current_section_id FK
        jsonb completed_section_ids
        timestamptz last_visited_at
    }
```

---

## 2. Hierarchy

Matches the Phase 1 domain hierarchy exactly:

```
Teacher          → deferred (auth frozen for V1; see §7)
  Class
    Subject
      AcademicSession
        Week
          Topic
            Lesson
              LessonSection
TeachingProgress → 1:1 with Lesson, kept separate from lesson content
```

A **Topic may have 0..n Lessons**. Zero lessons ⇒ topic status `not_prepared`
(derived, never stored — see §5).

---

## 3. Table Specifications

All tables carry `created_at timestamptz NOT NULL DEFAULT now()` and
`updated_at timestamptz NOT NULL DEFAULT now()`.
All PKs are `text` (opaque string ids — see §6).
All foreign keys use `ON DELETE CASCADE` unless noted.

### 3.1 `classes`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| name | text | NOT NULL |
| arm | text | NULL (e.g. "Gold") |
| level | text | NOT NULL (e.g. "Junior Secondary 3") |

### 3.2 `subjects`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| class_id | text | NOT NULL, FK → classes(id) |
| name | text | NOT NULL |
| code | text | NOT NULL |

Index: `(class_id)`.
Constraint: `UNIQUE (class_id, code)`.

### 3.3 `academic_sessions`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| subject_id | text | NOT NULL, FK → subjects(id) |
| term | smallint | NOT NULL, CHECK 1..3 |
| year | int | NULL (optional in the TS model) |
| label | text | NOT NULL ("First Term") |
| total_weeks | int | NOT NULL, CHECK > 0 |
| current_week | int | NOT NULL, CHECK 1..total_weeks |

Index: `(subject_id)`.
Constraint: `UNIQUE (subject_id, term, year)` — note Postgres treats NULL years
as distinct; acceptable for V1 (one session per term is the normal case).

`current_week` is **mutable state** on a mostly-static row: the API updates it
when the teacher advances the planner. It is the only "clock" field in the
model.

### 3.4 `weeks`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| session_id | text | NOT NULL, FK → academic_sessions(id) |
| number | int | NOT NULL, CHECK ≥ 1 |

Index: `(session_id)`.
Constraint: `UNIQUE (session_id, number)`.

### 3.5 `topics`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| week_id | text | NOT NULL, FK → weeks(id) |
| title | text | NOT NULL |
| position | int | NOT NULL, CHECK ≥ 1 (maps TS field `order`) |

Index: `(week_id, position)`.
No uniqueness on `(week_id, position)`: reordering would create transient
conflicts under a non-deferred constraint; ordering is owned by the app.

### 3.6 `lessons`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| topic_id | text | NOT NULL, FK → topics(id) |
| title | text | NOT NULL (distinct from topic title) |
| duration_minutes | int | NOT NULL, CHECK > 0 |
| learning_objectives | jsonb | NOT NULL, CHECK `jsonb_typeof = 'array'`, default `'[]'` |
| materials | jsonb | NOT NULL, CHECK array, default `'[]'` |
| prior_knowledge | text | NULL |
| teacher_notes | text | NULL |
| student_notes | text | NULL — markdown/plain text (Phase 1 simplification) |
| evaluation | jsonb | NOT NULL, CHECK array, default `'[]'` |

Index: `(topic_id)`.

**Why `evaluation` is JSONB and not a table:** evaluation questions are never
referenced by any other row and are only ever read or written together with the
whole lesson. Shape: `EvaluationQuestion[]`
(`id`, `questionNumber`, `question`, `expectedAnswer`, `type`).

`learningObjectives` / `materials` are `string[]` — arrays have no identity, so
JSONB is the honest representation.

### 3.7 `lesson_sections`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| lesson_id | text | NOT NULL, FK → lessons(id) |
| title | text | NOT NULL |
| duration_minutes | int | NOT NULL, CHECK > 0 |
| content | text | NOT NULL, default `''` |
| teacher_guidance | text | NOT NULL, default `''` |
| activity | text | NULL |
| position | int | NOT NULL, CHECK ≥ 1 |

Index: `(lesson_id, position)`.
Constraint: `UNIQUE (id, lesson_id)` — supports the composite FK from
`teaching_progress` (§3.9).

**Why a table, not JSONB:** `teaching_progress.current_section_id` must
reference a real section row; FK integrity is the entire point of separating
progress from content. The TS model has no `position` field — array order is
the position today; the DB needs an explicit column.

### 3.8 `lesson_resources`

| column | type | constraints |
|---|---|---|
| id | text | PK |
| lesson_id | text | NOT NULL, FK → lessons(id) |
| type | text | NOT NULL, CHECK IN ('image','video','link') |
| title | text | NOT NULL |
| description | text | NULL |
| url | text | NOT NULL |
| caption | text | NULL |
| video_duration | text | NULL |
| link_domain | text | NULL |
| position | int | NOT NULL, CHECK ≥ 1 |

Index: `(lesson_id)`.

V1 stores **URLs only** — no file/blob upload (resources point at existing
images, videos and links).

### 3.9 `teaching_progress`

| column | type | constraints |
|---|---|---|
| lesson_id | text | PK, FK → lessons(id) |
| status | text | NOT NULL, default 'planned', CHECK IN ('planned','in_progress','taught') |
| current_section_id | text | NULL, FK → lesson_sections(id) ON DELETE SET NULL |
| completed_section_ids | jsonb | NOT NULL, CHECK array, default `'[]'` |
| last_visited_at | timestamptz | NULL |

Composite FK: `(current_section_id, lesson_id) → lesson_sections(id, lesson_id)`
guarantees the current section belongs to *this* lesson.

`completed_section_ids` stays a JSONB array (client sends the full array on
each toggle, matching `PATCH /lessons/:id/progress`). Server validates every id
belongs to the lesson (422 otherwise). Normalizing into a join table is a
documented future option, not V1 work.

**Stored invariant (application layer, in the API):**
when `completed_section_ids` covers every section of the lesson and `status`
is not already `taught`, set `status = 'taught'`. This mirrors
`CurriculumRepository.toggleSectionCompleted` so the rule lives in exactly one
place after migration.

---

## 4. Derived vs Stored

| Concept | Storage | Notes |
|---|---|---|
| `TopicStatus` (`not_prepared`/`planned`/`in_progress`/`taught`) | **derived** | computed from lessons of a topic (`src/utils/curriculum.ts`); never stored |
| `LessonScope` (lesson → topic → week → session → subject → class) | **derived** | joins only |
| `LessonWithProgress` | **read-model/DTO** | lesson + progress flattened for the UI (transitional type) |
| `TeachingProgress` | stored | 1:1 with lesson |
| `currentWeek` | stored | mutable planner state on `academic_sessions` |

---

## 5. JSON Field Shapes

```ts
// lessons.evaluation
EvaluationQuestion[] = {
  id: string; questionNumber: number; question: string;
  expectedAnswer: string; type: 'oral' | 'written' | 'activity';
}[]

// lessons.learning_objectives, lessons.materials
string[]

// lessons.student_notes
string  // markdown / plain text (single column, not JSONB)

// teaching_progress.completed_section_ids
string[]  // lesson_sections.id values belonging to the same lesson
```

---

## 6. ID Strategy

- API ids are **opaque strings**. Existing seed ids
  (`class-jss3`, `sub-jss3-dt`, `lesson-jss3-dt-w1`, `sec-1`, …) work as
  primary keys unchanged — no id rewrite during migration.
- Rows created at runtime use UUIDv7 (time-ordered, index-friendly) or nanoid;
  either is acceptable, pick one at implementation time.
- JSON wire format is `camelCase` (matches TS types); SQL columns are
  `snake_case`. The API layer owns the mapping.

---

## 7. Deferred (explicitly not V1)

| Item | Why deferred | Where it would slot in |
|---|---|---|
| `Teacher` entity / auth | frozen by `prompt.txt` | `teacher_id` column on `classes` (+ cascade scope); `teachers` table |
| Student/parent accounts, attendance, grades, messaging, analytics, AI | frozen | n/a |
| Soft deletes | no delete UI in V1 | `deleted_at` column |
| File/blob uploads for resources | URLs only in V1 | `resources.storage_key` + object storage |
| Pagination on list endpoints | class sizes are small | `?page=`/cursor params (reserved, see API-CONTRACTS §2) |
| Normalized `section_completions` join table | JSONB array suffices | replaces `completed_section_ids` |

---

## 8. Seed Data

`src/data/initialCurriculum.ts` becomes a SQL seed script
(`db/seed.sql`) that inserts the same rows with the **same ids**, so a user's
saved localStorage progress (keyed by lesson id) remains valid after the
backend swap. The `Reset to sample data` action maps to re-running the seed.

Client-only preferences (`fontSize`, `paperMode`, `showTimingGuidance`) are
**not** part of this model — they stay in localStorage for V1.
