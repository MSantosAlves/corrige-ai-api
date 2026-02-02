# General guidelines

- Always open `specs.md` before working.
- Always update the **Progress Tracker** after you finish your task.
- Always tick the corresponding milestone once it is complete.
  - Await confirmation from the user before considering it done.
- If the task you are working on is too big, create a build plan.
  - Create milestones for file modifications.
  - Confirm before continuing to the next step on your plan.

# Code guidelines
- Always use TypeScript.
- Naming conventions:
  - Constants and environment variables should always be uppercase (ex.: API_URL).
  - Class names and types should be in PascalCase (ex.: UserSchema, UserRepository).
  - Variable names should be in camelCase (ex.: user, data).
  - File and folder names should be in kebab-case (ex.: user-repository.ts, sign-in), except for the word `usecases`.
  - Database fields should be in snake_case (ex.: user_id, task_id).

# API architecture

src/
- config/
- controllers/
- db/
- llm/
- middlewares/
- ocr/
- repositories/
- routes/
- types/
- usecases/
  - auth/
  - classes/
  - extractions/
  - ocr/
  - tasks/