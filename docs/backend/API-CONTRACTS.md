# TeachIt — API Contracts (V1)

Status: **design only** — no implementation.
Companion document: `DATA-MODEL.md`.

Scope per `prompt.txt` Phase 10. Explicitly excluded: authentication,
student accounts, analytics, AI, school administration.

---

## 1. Conventions

| Topic | Decision |
|---|---|
| Base path | `/api/v1` |
| Format | JSON, `Content-Type: application/json; charset=utf-8` |
| Casing | `camelCase` on the wire (matches `src/types/lesson.ts`); SQL uses `snake_case` |
| Ids | opaque strings; existing seed ids remain valid |
| Timestamps | ISO-8601 UTC (`2026-10-09T14:32:00.000Z`) |
| Auth | none in V1 — single teacher, single tenant |
| Pagination | none in V1 (datasets are small); reserved for later, see §7 |
| Concurrency | last-write-wins in V1; `updatedAt` is returned so optimistic locking can be added later |

### Error envelope

```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Lesson 'lesson-jss3-dt-w1' not found"
  }
}
```

| HTTP | code | when |
|---|---|---|
| 400 | `BAD_REQUEST` | malformed JSON / missing required field |
| 404 | `NOT_FOUND` | id does not exist |
| 409 | `CONFLICT` | uniqueness violation (e.g. duplicate subject code in class) |
| 422 | `UNPROCESSABLE` | semantic rule violated (section id from another lesson, term > 3, …) |
| 500 | `INTERNAL` | unexpected server error |

Success codes: `200` (read/patch), `201` (create, with `Location` header),
`204` (no body).

### PATCH semantics

Partial update: omitted fields are unchanged. Unknown fields ⇒ `400`.
Arrays (`sections`, `resources`, `evaluation`, `completedSectionIds`) are
replaced wholesale, never merged — this matches how the editor and
`toggleSectionCompleted` already behave.

---

## 2. Endpoints

### 2.1 Reads

#### `GET /classes`

→ `ClassItem[]`

```json
[
  { "id": "class-jss3", "name": "JSS 3", "arm": "Gold", "level": "Junior Secondary 3" }
]
```

#### `GET /classes/:classId/subjects`

→ `SubjectItem[]`

```json
[
  { "id": "sub-jss3-dt", "classId": "class-jss3", "name": "Digital Technology", "code": "DT-301" }
]
```

#### `GET /subjects/:subjectId/sessions`

→ `AcademicSession[]`

> Deviation from the sketch in `prompt.txt`: the sketch shows
> `GET /subjects/:id/weeks`, but the Phase 1 domain inserts AcademicSession
> between Subject and Week, so the path is split into two hops.

```json
[
  {
    "id": "sess-sub-jss3-dt-t1",
    "subjectId": "sub-jss3-dt",
    "term": 1,
    "year": 2026,
    "label": "First Term",
    "totalWeeks": 13,
    "currentWeek": 4
  }
]
```

#### `GET /sessions/:sessionId/weeks`

→ `Week[]`

```json
[
  { "id": "wk-sess-sub-jss3-dt-t1-01", "sessionId": "sess-sub-jss3-dt-t1", "number": 1 }
]
```

#### `GET /weeks/:weekId/topics`

→ `Topic[]` — raw topics only; `status` is derived client-side
(`topicStatus()` in `src/utils/curriculum.ts`) from the lessons of the same
week, so no behavior changes during the migration.

```json
[
  { "id": "topic-sub-jss3-dt-w1-01", "weekId": "wk-sess-sub-jss3-dt-t1-01", "title": "Algorithms", "order": 1 }
]
```

#### `GET /topics/:topicId`

→ `Topic & { lessons: LessonResponse[] }`

```json
{
  "id": "topic-sub-jss3-dt-w1-01",
  "weekId": "wk-sess-sub-jss3-dt-t1-01",
  "title": "Algorithms",
  "order": 1,
  "lessons": [ { "id": "lesson-jss3-dt-w1", "title": "…", "progress": { "…": "…" } } ]
}
```

#### `GET /lessons`

List/read-model endpoint used by Plan, Today, the Lesson Library and the
revision panel. Query params (all optional, AND-combined):

| param | filters |
|---|---|
| `topicId` | lessons of one topic |
| `weekId` | lessons of one week |
| `classId` | lessons whose scope resolves to the class |
| `subjectId` | lessons whose scope resolves to the subject |
| `status` | `planned` \| `in_progress` \| `taught` |
| `taughtOnly=true` | shorthand for `status=taught` (revision context) |

→ `LessonResponse[]`

```json
[
  {
    "id": "lesson-jss3-dt-w1",
    "topicId": "topic-sub-jss3-dt-w1-01",
    "title": "Writing a Simple Algorithm",
    "durationMinutes": 45,
    "learningObjectives": ["Define an algorithm", "Write steps for a daily task"],
    "materials": ["Whiteboard", "Marker"],
    "priorKnowledge": "Basic computer parts",
    "teacherNotes": "…",
    "studentNotes": "# Lesson note …",
    "sections": [ { "id": "sec-1", "title": "Introduction", "durationMinutes": 10, "content": "…", "teacherGuidance": "…", "activity": null } ],
    "resources": [ { "id": "res-hook-sandwich", "type": "image", "title": "…", "url": "https://…" } ],
    "evaluation": [ { "id": "ev-1", "questionNumber": 1, "question": "…", "expectedAnswer": "…", "type": "oral" } ],
    "progress": {
      "lessonId": "lesson-jss3-dt-w1",
      "status": "in_progress",
      "currentSectionId": "sec-2",
      "completedSectionIds": ["sec-1"],
      "lastVisitedAt": "2026-10-09T14:32:00.000Z"
    },
    "updatedAt": "2026-10-09T14:32:00.000Z"
  }
]
```

`LessonResponse` = full `Lesson` (sections + resources + evaluation) **plus a
nested `progress` object**. The nested shape reflects the data model
(progress is a separate table); the frontend adapter flattens it into the
existing transitional `LessonWithProgress` type, so views do not change.

#### `GET /lessons/:lessonId`

→ `LessonResponse` (same shape as a list item). `404` if unknown.

#### `GET /subjects/:subjectId/taught-lessons`

Revision context panel ("Previously Taught Material").
→ `LessonResponse[]` where `progress.status === 'taught'`, newest
`lastVisitedAt` first.

### 2.2 Writes

#### `POST /lessons`

Creates a lesson (Lesson Editor, "New lesson"). `201` + `Location: /api/v1/lessons/:id`.

```jsonc
// request
{
  "lesson": {
    "id": "lesson-jss3-dt-w7",        // client-generated id (opaque string)
    "topicId": "topic-sub-jss3-dt-w7-01",
    "title": "…",
    "durationMinutes": 45,
    "learningObjectives": [],
    "materials": [],
    "sections": [ /* LessonSection[] */ ],
    "evaluation": [ /* EvaluationQuestion[] */ ]
  },
  "weekId": "wk-sess-sub-jss3-dt-t1-07" // present when topicId refers to a topic that does not exist yet
}
```

When `weekId` is supplied and `lesson.topicId` does not exist, the server
creates the topic (`title = lesson.title`, `order = topics count + 1`) in the
same transaction — mirroring `CurriculumRepository.ensureTopicForLesson`.
A `progress` row is initialized for the new lesson
(`status: 'planned'`, `currentSectionId` = first section).

Validation ⇒ `422`: unknown `topicId` without `weekId`, `weekId` that does not
exist, empty `sections`, `durationMinutes ≤ 0`.

#### `PATCH /lessons/:lessonId`

Replaces lesson content (Lesson Editor, "Save"). Partial: omitted top-level
fields unchanged; `sections`/`resources`/`evaluation` replaced wholesale.
Returns `200 LessonResponse`.
Changing `topicId` is allowed (re-parent the lesson into another topic).
`404` unknown lesson; `422` invalid payload.

#### `PATCH /lessons/:lessonId/progress`

The only endpoint that mutates teaching state. Used by section navigation,
"mark section done" and "Mark Lesson as Taught".

```jsonc
// request — all fields optional (PATCH)
{
  "status": "taught",                    // planned | in_progress | taught
  "currentSectionId": "sec-2",           // must belong to this lesson
  "completedSectionIds": ["sec-1", "sec-2"] // every id must belong to this lesson
}
```

→ `200 TeachingProgress`

Server rules:

1. `currentSectionId` / `completedSectionIds` entries must be sections of this
   lesson ⇒ otherwise `422`.
2. `lastVisitedAt` is **stamped by the server** whenever `currentSectionId`
   appears in the patch (the client no longer sends a clock value).
3. **Auto-complete invariant:** if `completedSectionIds` covers all sections
   of the lesson and `status` is not explicitly set to something else, the
   server sets `status = 'taught'`. This relocates the rule currently in
   `CurriculumRepository.toggleSectionCompleted` so exactly one owner remains.
4. Missing `progress` row is created on first patch (upsert).

---

## 3. Mapping: repository → endpoint

Every method in `src/services/curriculumRepository.ts` has a home, which makes
the eventual swap mechanical:

| Repository method | Endpoint |
|---|---|
| `getClasses()` | `GET /classes` |
| `getSubjects(classId)` | `GET /classes/:classId/subjects` |
| `getSessions(subjectId)` | `GET /subjects/:subjectId/sessions` |
| `getWeeks(sessionId)` | `GET /sessions/:sessionId/weeks` |
| `getTopics(weekId)` | `GET /weeks/:weekId/topics` |
| `getTopic(id)` | `GET /topics/:topicId` |
| `getLessons(filters)` | `GET /lessons?topicId=&weekId=&classId=&subjectId=&status=` |
| `getLesson(id)` / `getLessonWithProgress(id)` | `GET /lessons/:lessonId` |
| `getAllLessonsWithProgress()` | `GET /lessons` |
| `getProgress(lessonId)` | `GET /lessons/:lessonId` → `.progress` |
| `getTaughtLessonsForSubject(subjectId)` | `GET /subjects/:subjectId/taught-lessons` |
| `saveLesson(lesson)` — new | `POST /lessons` |
| `saveLesson(lesson)` — existing | `PATCH /lessons/:lessonId` |
| `updateProgress` / `updateLessonStatus` / `setCurrentSection` / `toggleSectionCompleted` | `PATCH /lessons/:lessonId/progress` |
| `getTopicStatus` / `getLessonScope` / `lessonsOfTopic` / `topicStatus` | no endpoint — derived client-side |
| `resetAll()` | re-run DB seed (no V1 endpoint) |
| preferences read/write | no endpoint — stays in localStorage |

---

## 4. Intended migration path (design, not implementation)

1. Extract the current `CurriculumRepository` public surface into a
   `CurriculumDataSource` interface — it already reads like the API above.
2. Keep the localStorage implementation as `LocalCurriculumDataSource`.
3. Add `HttpCurriculumDataSource` implementing the same interface against the
   endpoints in §2.
4. `LessonContext` / `UIContext` keep calling the same methods; only the
   injected data source changes (env flag or build-time constant).
5. Seed the database from `initialCurriculum.ts` ids so existing saved
   progress still resolves.

No code changes are made in Phase 10 — this is the contract the backend will
be built against.

---

## 5. Explicitly out of scope (frozen)

Authentication, student/parent accounts, attendance, grades, school
administration, messaging, collaboration, analytics, notifications,
gamification, permissions, AI endpoints.

---

## 6. Non-goals for V1

- No GraphQL — REST matches the repository's list/get/update shape.
- No bulk/import endpoints — one seed script covers bootstrap.
- No soft delete / archive endpoints (no delete UI in V1).
- No file upload — resources store external URLs only.

---

## 7. Reserved for later

- Pagination: `?page=&pageSize=` (or cursor) with
  `{ items, total, page }` envelope — current list endpoints return bare
  arrays; adding pagination later is a versioned change (`/api/v2` or a
  `meta` wrapper accepted alongside).
- Optimistic concurrency: `If-Match` against `updatedAt`.
- `teacher_id` scoping on every query once auth lands (see DATA-MODEL §7).
