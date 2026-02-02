# Specs

## Milestones

### 1. Foundation
- [ ] Code refactor: add Prettier and ESLint, and verify all code guidelines from `AGENTS.md`.

### 2. Extraction pipeline
- [ ] Bulk upload files: connect to OCR service, send multiple files, and support polling for progress.
- [ ] Allow user-defined custom prompts on the extraction endpoint.
- [ ] Add task extraction statuses: pending, reviewed, error.

### 3. Product features
- [ ] Feedback system: users can submit feedback for task extractions.
- [ ] User cost tracking: compute and store the cost of each extraction.

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

### 7. Review workflow
- [ ] Teacher review and adjustment before finalizing grades/feedback.
- [ ] Per-paragraph feedback with actionable suggestions.
- [ ] Real-time writing analysis and AI-generated summaries.
