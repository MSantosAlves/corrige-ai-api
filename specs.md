# Specs

## General guidelines

- Always open `specs.md` before working.
- Always update the **Progress Tracker** after you finish your task.
- Always tick the corresponding milestone once it is complete.
  - Await confirmation from the user before considering it done.
- If the task you are working on is too big, create a build plan.
  - Create milestones for file modifications.
  - Confirm before continuing to the next step on your plan.

## Code guidelines

- Always use TypeScript.
- Naming conventions:
  - Constants and environment variables should always be uppercase (ex.: API_URL).
  - Class names and types should be in PascalCase (ex.: UserSchema, UserRepository).
  - Variable names should be in camelCase (ex.: user, data).
  - File and folder names should be in kebab-case (ex.: user-repository.ts, sign-in), except for the word `usecases`.
  - Database fields should be in snake_case (ex.: user_id, task_id).
  - Status values should be uppercase (ex.: PENDING, TEXT_EXTRACTION).

## API architecture

src
│   │   ├── application
│   │   │   └── usecases
│   │   ├── domain
│   │   │   └── entities
│   │   ├── infra
│   │   │   ├── config
│   │   │   │   └── env.ts
│   │   │   ├── db
│   │   │   │   ├── mongo.ts
│   │   │   ├── http
│   │   │   │   ├── controllers
│   │   │   │   ├── middlewares
│   │   │   │   └── routes
│   │   │   └── providers
│   │   ├── shared
│   │   └── types
│   └── tsconfig.json

## Progress Tracker

### 1. Foundation
- [ ] Google login and email verification via Better Auth. **MVP**
- [ ] User identity and profile management
- [ ] Cache and performance optimization strategy.

### 2. Extraction pipeline
- [ ] SSE endpoint auth strategy (cookies vs token in query) and middleware rules. **MVP**
- [ ] Allow user-defined custom prompts on the extraction endpoint.
- [ ] Upload-time rubric selection/creation.
- [ ] Upload-time reference material selection or task-specific prompt details. **MVP**
- [ ] Upload options: grade/series, subject, feedback depth, correction intensity, and extra instructions
- [ ] Shared OCR temp volume between API and worker containers.

### 3. Product features
- [ ] Feedback system: users can submit feedback for task extractions.
- [ ] User cost tracking: compute and store the cost of each extraction. **MVP**
- [ ] Per-user spend tracking and summaries. **MVP**
- [ ] Uploads table view with status per item and auto-redirect after upload. **MVP**
- [ ] Report split into sections (feedback, criteria analysis, spelling, AI detection, plagiarism, comments)
- [ ] Report actions: print, export PDF, rename, reprocess, copy feedback/report, delete
- [ ] Usage plan menu with upload limits. **MVP**
- [ ] Plan usage quota tracking for text extractions. **MVP**

### 4. Rubrics and standards
- [ ] Rubric-based grading: custom rubric builder/upload plus a reusable rubric library.
- [ ] Standards alignment and multi-genre support (ENEM and other formats).

### 5. Integrations and compliance
- [ ] LMS integrations: Google Classroom, Canvas, Schoology, and Moodle.
- [ ] Security and compliance readiness: LGPD plus a roadmap for SOC 2/ISO 27001.

### 6. Integrity and analytics
- [ ] Detect AI-generated content in submissions.
- [ ] Plagiarism detection for originality checks.
- [ ] Performance analytics dashboard by student/class/task.
- [ ] Analysis flags surfaced in results (AI, plagiarism).

### 7. Review workflow
- [ ] Teacher review and adjustment before finalizing grades/feedback.
- [ ] Per-paragraph feedback with actionable suggestions.
- [ ] Real-time writing analysis and AI-generated summaries.
