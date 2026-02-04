# Specs

## Milestones

### 1. Foundation
- [x] Code refactor: add Prettier and ESLint, and verify all code guidelines from `AGENTS.md`.
- [x] Configure application logging.
- [ ] Google login and email verification via Better Auth. **MVP**
- [ ] User identity and profile management
- [ ] Cache and performance optimization strategy.

### 2. Extraction pipeline
- [x] Bulk upload files: connect to OCR service, send multiple files, and support polling for progress. **MVP**
- [x] Implement background polling with BullMQ for bulk extraction jobs. **MVP**
- [ ] SSE endpoint auth strategy (cookies vs token in query) and middleware rules. **MVP**
- [ ] Allow user-defined custom prompts on the extraction endpoint.
- [ ] Upload-time rubric selection/creation.
- [ ] Upload-time reference material selection or task-specific prompt details. **MVP**
- [ ] Upload options: grade/series, subject, feedback depth, correction intensity, and extra instructions

### 3. Product features
- [ ] Feedback system: users can submit feedback for task extractions.
- [ ] User cost tracking: compute and store the cost of each extraction. **MVP**
- [ ] Per-user spend tracking and summaries. **MVP**
- [ ] Uploads table view with status per item and auto-redirect after upload. **MVP**
- [ ] Report split into sections (feedback, criteria analysis, spelling, AI detection, plagiarism, comments)
- [ ] Report actions: print, export PDF, rename, reprocess, copy feedback/report, delete
- [ ] Usage plan menu with upload limits. **MVP**

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
