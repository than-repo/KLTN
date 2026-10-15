# Production Learning Page Design Spec

> Scope: learner-facing course learning page for an e-learning platform similar to Coursera / Udemy.
>
> Current backend shape assumed:
>
> `Course -> CourseSection[] -> Lesson[] -> FileMedia[]`
>
> The page supports sections, lessons, video/document/image/audio files, and learning resources.

---

## 1. Product Goal

The learning page should let an enrolled learner:

1. Continue learning from the last unfinished lesson.
2. Watch or consume lesson content.
3. Navigate sections and lessons quickly.
4. Access downloadable/supporting files.
5. Track lesson/course progress.
6. Mark lessons complete.
7. Use learning aids such as transcript, notes, resources, and playback controls.
8. Continue smoothly across desktop, tablet, and mobile.
9. Style UI: flat hand-drawn doodle UI illustration

This page is not a course marketing page.  
It is a focused learning workspace.

---

## 2. Primary User Stories

### Learner

- As a learner, I want to open a course and continue from my last lesson.
- As a learner, I want to see all sections and lessons in the course.
- As a learner, I want to know which lessons are completed, active, locked, or unavailable.
- As a learner, I want to watch videos with playback controls.
- As a learner, I want to open documents/images/audio files attached to a lesson.
- As a learner, I want to download lesson resources if allowed.
- As a learner, I want to mark a lesson as complete.
- As a learner, I want to see my course progress percentage.
- As a learner, I want the page to work well on mobile.

### System

- As the system, I must only show learning content to enrolled learners.
- As the system, I must not expose deleted/inactive sections, lessons, or files.
- As the system, I should save progress frequently.
- As the system, I should resume video playback position if possible.

---

## 3. Page Route

Recommended route:

```txt
/learning/courses/:courseSlug
/learning/courses/:courseSlug/lessons/:lessonId
```

Alternative if using only IDs:

```txt
/learning/courses/:courseId
/learning/courses/:courseId/lessons/:lessonId
```

Recommended behavior:

- If no `lessonId` is provided:
  - Open last unfinished lesson.
  - If no progress exists, open first active lesson.
- If `lessonId` is invalid:
  - Show `Lesson not found`.
- If learner is not enrolled:
  - Redirect to course detail page or show `Access denied`.

---

## 4. High-Level Layout

### Desktop Layout

```txt
┌─────────────────────────────────────────────────────────────┐
│ Top Bar                                                     │
│ Course title / Back to course / Progress / Settings          │
├───────────────────────────────────────────────┬─────────────┤
│ Main Learning Area                            │ Course      │
│                                               │ Curriculum  │
│ ┌───────────────────────────────────────────┐ │             │
│ │ Video / Document / Image / Audio Player   │ │ Sections    │
│ └───────────────────────────────────────────┘ │ Lessons     │
│                                               │ Progress    │
│ Lesson Title                                  │             │
│ Lesson Description                            │             │
│                                               │             │
│ Tabs: Overview | Resources | Transcript | Notes             │
│                                               │             │
└───────────────────────────────────────────────┴─────────────┘
```

### Mobile Layout

```txt
┌───────────────────────────────┐
│ Top Bar                       │
├───────────────────────────────┤
│ Video / File Viewer           │
├───────────────────────────────┤
│ Lesson Title                  │
│ Lesson Actions                │
├───────────────────────────────┤
│ Tabs                          │
│ Overview / Resources / Notes  │
├───────────────────────────────┤
│ Curriculum Drawer Button      │
└───────────────────────────────┘
```

Mobile curriculum should be inside a bottom sheet or full-screen drawer.

---

## 5. Main Regions

## 5.1 Top Bar

### Contains

- Back button
- Course title
- Current progress
- Optional:
  - Search lesson
  - Dark mode toggle
  - Settings menu
  - Report issue

### Example

```txt
← My Courses    Advanced NestJS Architecture       42% complete
```

### Rules

- Keep sticky on desktop and mobile.
- On mobile, truncate title.
- Progress should update after lesson completion.

---

## 5.2 Course Curriculum Sidebar

### Purpose

Let learner navigate the course structure.

### Data Source

```ts
course.sections[].lessons[]
```

### UI

Each section should be collapsible.

```txt
Section 1: Introduction
  ✓ 1. Welcome
  ▶ 2. Course setup
  ○ 3. Project overview

Section 2: Backend Architecture
  🔒 1. Repository pattern
  ○ 2. Service layer
```

### Lesson States

| State | Meaning | UI |
|---|---|---|
| `active` | current opened lesson | highlighted |
| `completed` | learner finished lesson | check icon |
| `available` | learner can open | normal |
| `locked` | unavailable due to rules | lock icon |
| `loading` | progress update pending | spinner |
| `error` | failed to load | warning icon |

### Section Metadata

Each section may show:

- Section title
- Number of completed lessons
- Total lesson count
- Estimated duration, if available

Example:

```txt
Section 2: Backend Architecture
3 / 8 lessons
```

### Production Notes

- Do not render inactive/deleted sections.
- Sort sections by `sectionIndex`.
- Sort lessons by `lessonIndex`.
- Sidebar should preserve collapsed/expanded state in local storage.

---

## 5.3 Main Content Viewer

The viewer depends on the active lesson file type.

Current backend file model:

```ts
FileMedia {
  id: string;
  url: string;
  type: 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO' | 'OTHER';
  filename: string | null;
  mimeType: string | null;
  sizeInBytes: number | null;
}
```

### File Type Handling

| File Type | UI |
|---|---|
| `VIDEO` | video player |
| `DOCUMENT` | PDF/document viewer or download card |
| `IMAGE` | image preview |
| `AUDIO` | audio player |
| `OTHER` | download/open resource card |

### Empty File Behavior

If lesson has no files:

```txt
This lesson does not have learning content yet.
```

For production, this should rarely happen for published courses.

---

## 5.4 Video Player

### Required Controls

- Play / pause
- Timeline
- Current time / duration
- Volume
- Full screen
- Playback speed
- Captions/subtitles if available
- Keyboard shortcuts
- Resume from last watched position

### Recommended Playback Speeds

```txt
0.5x, 0.75x, 1x, 1.25x, 1.5x, 1.75x, 2x
```

### Progress Tracking

Save progress when:

- Video starts
- Every 10-30 seconds while playing
- Video pauses
- Video reaches 90-95%
- User manually marks complete

Recommended progress payload:

```ts
interface UpdateLessonProgressRequest {
  lessonId: string;
  watchedSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
}
```

### Auto Completion Rule

A video lesson can be auto-completed when:

```txt
watchedSeconds / durationSeconds >= 0.9
```

or when learner clicks `Mark as complete`.

---

## 5.5 Lesson Header

### Contains

- Lesson title
- Lesson description
- Previous lesson button
- Next lesson button
- Mark complete button

Example:

```txt
Repository Pattern in Production

Learn how repository interfaces isolate service logic from Prisma.

[Previous] [Mark as complete] [Next]
```

### Button Rules

- `Previous` disabled on first lesson.
- `Next` disabled on last lesson.
- `Mark as complete` hidden or disabled if already completed.
- If progress update fails, show retry message.

---

## 5.6 Lesson Tabs

Recommended tabs:

```txt
Overview | Resources | Transcript | Notes | Q&A
```

For your current MVP, use:

```txt
Overview | Resources
```

Then add:

```txt
Transcript | Notes
```

later.

---

## 6. Tab Details

## 6.1 Overview Tab

Show:

- Lesson description
- Key learning objectives
- Estimated duration
- Current file list
- Completion status

Example:

```txt
In this lesson, you will learn:
- Why repository interfaces should not expose Prisma types
- How service and repository layers communicate
- How to map Prisma result to app model
```

---

## 6.2 Resources Tab

### Purpose

Show downloadable or viewable resources for the lesson.

### Resource Card

```txt
📄 repository-pattern-cheatsheet.pdf
PDF · 240 KB
[Preview] [Download]
```

### File Rules

- If `mimeType` is PDF, allow preview.
- If file is video/audio/image, allow preview in main viewer.
- If file is document/other, show as resource card.
- Respect `downloadAllowed` if later added.

### Future Data Model Suggestion

Right now, your schema uses `FileMedia` for all lesson files.  
For production, consider separating primary content from resources:

```ts
Lesson {
  primaryFileId?: string;
  files: FileMedia[];
}
```

or:

```ts
LessonContent {
  id: string;
  lessonId: string;
  fileId: string;
  role: 'PRIMARY' | 'RESOURCE' | 'TRANSCRIPT' | 'SUBTITLE';
}
```

This helps distinguish the video to play from supporting downloads.

---

## 6.3 Transcript Tab

### Purpose

Let learners read, search, and jump through the video.

### UI

```txt
[Search transcript...]

00:00 Introduction
00:35 Why repository interfaces matter
02:10 Mapping Prisma result to app model
```

### Behavior

- Clicking transcript line seeks video to timestamp.
- Highlight current transcript segment during playback.
- Transcript should be searchable.
- Transcript should be accessible by keyboard.

### Future API Shape

```ts
interface TranscriptSegmentModel {
  id: string;
  lessonId: string;
  startSecond: number;
  endSecond: number;
  text: string;
}
```

---

## 6.4 Notes Tab

### Purpose

Let learners create personal notes for a lesson or video timestamp.

### UI

```txt
[Write a note...]

Notes:
- 02:14 Repository should map Prisma to model
- 05:22 Service owns business logic
```

### Behavior

- Notes can be attached to:
  - lesson
  - timestamp
  - selected text
- Clicking timestamp note seeks video.
- Notes are private by default.

### Future API Shape

```ts
interface LessonNoteModel {
  id: string;
  userId: string;
  courseId: string;
  lessonId: string;
  timestampSecond?: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 6.5 Q&A Tab

Useful for Udemy-like platforms.

### MVP Option

Skip for now.

### Production Option

Add:

- Ask question
- View instructor answers
- Search questions
- Filter by current lesson
- Upvote helpful answers

Future models:

```ts
Question
Answer
QuestionVote
```

---

## 7. Frontend Component Structure

Recommended React/NestJS frontend structure:

```txt
src/features/learning/
  pages/
    LearningCoursePage.tsx

  components/
    LearningTopBar.tsx
    CourseCurriculumSidebar.tsx
    CourseSectionAccordion.tsx
    LessonListItem.tsx
    LessonContentViewer.tsx
    VideoLessonPlayer.tsx
    DocumentLessonViewer.tsx
    ImageLessonViewer.tsx
    AudioLessonPlayer.tsx
    LessonHeader.tsx
    LessonTabs.tsx
    LessonOverviewTab.tsx
    LessonResourcesTab.tsx
    LessonTranscriptTab.tsx
    LessonNotesTab.tsx
    LearningPageSkeleton.tsx
    LearningAccessDenied.tsx
    LearningErrorState.tsx

  hooks/
    useLearningCourse.ts
    useActiveLesson.ts
    useLessonProgress.ts
    useVideoResume.ts

  services/
    learning-course.api.ts

  types/
    learning-course.types.ts

  utils/
    find-first-lesson.ts
    find-next-lesson.ts
    flatten-lessons.ts
    format-duration.ts
```

---

## 8. Frontend Type Shape

Recommended frontend model:

```ts
export interface LearningCourseViewModel {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string | null;
  thumbnailUrl: string | null;
  level: CourseLevel;
  progressPercentage: number;
  currentLessonId: string | null;
  sections: LearningSectionViewModel[];
}

export interface LearningSectionViewModel {
  id: string;
  title: string;
  description: string | null;
  sectionIndex: number;
  completedLessonCount: number;
  totalLessonCount: number;
  lessons: LearningLessonViewModel[];
}

export interface LearningLessonViewModel {
  id: string;
  title: string;
  description: string | null;
  lessonIndex: number;
  status: 'AVAILABLE' | 'ACTIVE' | 'COMPLETED' | 'LOCKED';
  progressPercentage: number;
  files: LearningFileViewModel[];
}

export interface LearningFileViewModel {
  id: string;
  url: string;
  type: 'VIDEO' | 'DOCUMENT' | 'IMAGE' | 'AUDIO' | 'OTHER';
  filename: string | null;
  mimeType: string | null;
  sizeInBytes: number | null;
}
```

---

## 9. Backend API Design

## 9.1 Get Learning Course

```http
GET /learning/courses/:courseId
```

or:

```http
GET /learning/courses/:courseSlug
```

### Response

```ts
interface GetLearningCourseResponse {
  course: LearningCourseViewModel;
}
```

### Backend Rules

- User must be authenticated.
- User must have active enrollment.
- Course must be published.
- Course must be active.
- Course must not be deleted.
- Sections/lessons/files must be active and not deleted.
- Sort by `sectionIndex`, `lessonIndex`.

---

## 9.2 Update Lesson Progress

```http
PATCH /learning/courses/:courseId/lessons/:lessonId/progress
```

### Request

```ts
interface UpdateLessonProgressRequest {
  watchedSeconds?: number;
  durationSeconds?: number;
  completed?: boolean;
}
```

### Response

```ts
interface UpdateLessonProgressResponse {
  lessonId: string;
  lessonProgressPercentage: number;
  completed: boolean;
  courseProgressPercentage: number;
}
```

### Backend Rules

- User must be enrolled.
- Lesson must belong to course.
- Do not decrease completed status once completed.
- Recalculate course progress after update.

---

## 9.3 Mark Lesson Complete

```http
POST /learning/courses/:courseId/lessons/:lessonId/complete
```

### Response

```ts
interface MarkLessonCompleteResponse {
  lessonId: string;
  completed: true;
  courseProgressPercentage: number;
}
```

---

## 10. Backend Model Gaps To Consider

Your current schema supports:

```txt
Course
CourseSection
Lesson
FileMedia
Enrollment
```

But production learning pages usually need additional models.

## 10.1 Lesson Progress

```prisma
model LessonProgress {
  id              String   @id @default(uuid())
  userId          String
  courseId        String
  lessonId        String
  progressPercent Float    @default(0)
  watchedSeconds  Int?
  durationSeconds Int?
  completedAt     DateTime?
  lastAccessedAt  DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([userId, lessonId])
  @@index([userId, courseId])
}
```

## 10.2 Lesson Notes

```prisma
model LessonNote {
  id              String   @id @default(uuid())
  userId          String
  courseId        String
  lessonId        String
  timestampSecond Int?
  content         String   @db.LongText
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([userId, courseId])
  @@index([lessonId])
}
```

## 10.3 Transcript

```prisma
model LessonTranscriptSegment {
  id          String @id @default(uuid())
  lessonId    String
  startSecond Int
  endSecond   Int?
  text        String @db.LongText
  language    String @default("en")

  @@index([lessonId, language])
}
```

## 10.4 Lesson Content Role

If a lesson has multiple files, add a role:

```prisma
enum LessonFileRole {
  PRIMARY
  RESOURCE
  TRANSCRIPT
  SUBTITLE
}

model LessonFile {
  lessonId String
  fileId   String
  role     LessonFileRole
  order    Int @default(0)

  @@id([lessonId, fileId])
}
```

This is better than guessing which file is the main video.

---

## 11. State Management

Recommended client state:

```ts
interface LearningPageState {
  course: LearningCourseViewModel | null;
  activeLessonId: string | null;
  activeFileId: string | null;
  sidebarOpen: boolean;
  expandedSectionIds: string[];
  loading: boolean;
  error: string | null;
}
```

Derived state:

```ts
const activeLesson = findLessonById(course, activeLessonId);
const nextLesson = findNextLesson(course, activeLessonId);
const previousLesson = findPreviousLesson(course, activeLessonId);
```

---

## 12. UX Rules

## 12.1 Continue Learning

When learner opens course:

1. If `currentLessonId` exists, open it.
2. Else open first incomplete lesson.
3. Else open first lesson.

## 12.2 Next Lesson

After completing a lesson:

- Show success toast.
- Enable next lesson.
- Optionally auto-navigate to next lesson after 2 seconds.
- Do not auto-navigate while video is still playing unless learner chose autoplay.

## 12.3 Locked Content

If you support sequential learning:

- Lock lessons after the next incomplete lesson.
- Show message:

```txt
Complete the previous lesson to unlock this lesson.
```

If not supporting sequential learning:

- All lessons are available after enrollment.

## 12.4 Unsaved Notes

If user has unsaved notes and tries to leave:

```txt
You have unsaved notes. Leave anyway?
```

---

## 13. Loading, Empty, and Error States

## 13.1 Loading

Use skeletons:

- Video/content viewer skeleton
- Sidebar lesson skeletons
- Header skeleton

## 13.2 Access Denied

```txt
You are not enrolled in this course.
[View course details]
```

## 13.3 Course Not Found

```txt
Course not found or no longer available.
```

## 13.4 Lesson Not Found

```txt
This lesson is not available.
[Go to first lesson]
```

## 13.5 File Load Failed

```txt
We could not load this file.
[Retry] [Download]
```

---

## 14. Accessibility Requirements

Learning pages must support:

- Keyboard navigation
- Visible focus states
- Captions/subtitles for video when available
- Transcript support for video/audio content
- Sufficient color contrast
- Screen-reader friendly controls
- Meaningful button labels
- Avoid keyboard traps in video player and sidebar drawer

Recommended ARIA landmarks:

```txt
<header>
<main>
<aside aria-label="Course curriculum">
<nav aria-label="Lesson navigation">
```

Video player controls must have accessible labels:

```txt
Play
Pause
Mute
Change playback speed
Enter full screen
```

---

## 15. Performance Requirements

## 15.1 Initial Load

- Fetch course learning tree in one API call.
- Lazy-load transcript/notes only when their tabs are opened.
- Do not preload all video files.
- Use CDN URLs for media.
- Cache course structure.
- Debounce progress updates.

## 15.2 Large Courses

For courses with many lessons:

- Virtualize lesson list if needed.
- Collapse all sections except active section.
- Use memoized derived lesson list.

## 15.3 Media

- Use adaptive video streaming if possible.
- Use poster image for videos.
- Avoid loading all file previews at once.

---

## 16. Security Rules

- Never trust frontend lesson IDs.
- Backend must verify:
  - user enrollment
  - course ownership/access
  - lesson belongs to course
  - file belongs to lesson
- Do not expose deleted files.
- Use signed URLs for private media if needed.
- Do not leak `cloudinaryPublicId` to frontend unless required.
- Do not expose payment/enrollment records in the learning response.

---

## 17. Recommended MVP

Build in this order:

### MVP 1: Basic Learning Page

- Course title
- Section/lesson sidebar
- Active lesson viewer
- Video/document/image/audio support
- Resources list
- Previous/Next lesson
- Mark complete
- Enrollment check

### MVP 2: Progress

- Lesson progress model
- Course progress calculation
- Resume last lesson
- Resume video timestamp

### MVP 3: Production Learning Tools

- Transcript
- Notes
- Search inside course
- Keyboard shortcuts
- Better mobile drawer

### MVP 4: Community

- Q&A
- Announcements
- Reviews/feedback after completion

---

## 18. Suggested UI Copy

### Not Enrolled

```txt
You need to enroll in this course before accessing the lessons.
```

### Lesson Completed

```txt
Lesson completed.
```

### Course Completed

```txt
Congratulations! You completed this course.
```

### No Resources

```txt
No resources have been added for this lesson.
```

### Video Resume

```txt
Resume from 12:34?
```

---

## 19. Example Page Data

```json
{
  "course": {
    "id": "course_1",
    "title": "Production NestJS Architecture",
    "slug": "production-nestjs-architecture",
    "shortDescription": "Build scalable backend architecture with NestJS.",
    "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
    "progressPercentage": 42,
    "currentLessonId": "lesson_3",
    "sections": [
      {
        "id": "section_1",
        "title": "Introduction",
        "description": "Course overview and setup.",
        "sectionIndex": 1,
        "completedLessonCount": 2,
        "totalLessonCount": 3,
        "lessons": [
          {
            "id": "lesson_1",
            "title": "Welcome",
            "description": "Welcome to the course.",
            "lessonIndex": 1,
            "status": "COMPLETED",
            "progressPercentage": 100,
            "files": [
              {
                "id": "file_1",
                "url": "https://cdn.example.com/welcome.mp4",
                "type": "VIDEO",
                "filename": "welcome.mp4",
                "mimeType": "video/mp4",
                "sizeInBytes": 12345678
              }
            ]
          }
        ]
      }
    ]
  }
}
```

---

## 20. Engineering Checklist

### Backend

- [ ] `GET /learning/courses/:courseId`
- [ ] Enrollment access check
- [ ] Published/active course filter
- [ ] Active sections/lessons/files only
- [ ] Sort sections and lessons
- [ ] DTO/model mapping
- [ ] Lesson progress table
- [ ] Mark complete endpoint
- [ ] Course progress recalculation

### Frontend

- [ ] Learning page route
- [ ] Curriculum sidebar
- [ ] Active lesson state
- [ ] File viewer by media type
- [ ] Resources tab
- [ ] Previous/Next lesson navigation
- [ ] Mark complete action
- [ ] Loading/error/access denied states
- [ ] Responsive mobile drawer
- [ ] Keyboard navigation

### Production

- [ ] Captions/transcripts
- [ ] Notes
- [ ] Resume video position
- [ ] CDN/private media strategy
- [ ] Accessibility audit
- [ ] Analytics events
- [ ] Error monitoring

---

## 21. Analytics Events

Recommended events:

```ts
learning_course_opened
learning_lesson_opened
learning_video_started
learning_video_paused
learning_video_completed
learning_lesson_completed
learning_resource_downloaded
learning_note_created
learning_transcript_clicked
```

Event example:

```ts
interface LearningAnalyticsEvent {
  userId: string;
  courseId: string;
  lessonId?: string;
  fileId?: string;
  eventName: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
```

---

## 22. Design Decision Summary

| Decision | Recommendation |
|---|---|
| Layout | Main content left, curriculum right on desktop |
| Mobile | Curriculum in drawer/bottom sheet |
| Default lesson | Last unfinished lesson |
| File handling | Render by `MediaType` |
| Progress | Save periodically and on complete |
| Resources | Treat non-primary files as resources |
| Transcript | Add as production feature |
| Notes | Add after basic progress |
| Security | Backend verifies enrollment and ownership |
| Accessibility | Follow WCAG-friendly media practices |

---

## 23. Final Recommendation

For your current build, start with:

```txt
LearningCoursePage
├── LearningTopBar
├── LessonContentViewer
├── LessonHeader
├── LessonTabs
│   ├── LessonOverviewTab
│   └── LessonResourcesTab
└── CourseCurriculumSidebar
    └── CourseSectionAccordion
        └── LessonListItem
```

Then add:

```txt
LessonProgress
Transcript
Notes
Q&A
```

Your existing schema is enough for the first version of the page.  
For a true production platform, add lesson progress and file role models before building advanced learning behavior.
