# Security Audit Report - Application Routes

Date: 2026-02-09  
Scope: Static review of HTTP routes, controllers, usecases, and repositories related to access control and common exploit vectors.

## Summary

- No explicit `GET /users` or equivalent "list all users" route was found.
- Multiple routes are vulnerable to Broken Object Level Authorization (BOLA/IDOR): authenticated users can access or mutate resources they do not own by supplying foreign IDs.
- File upload endpoints are vulnerable to memory exhaustion due to unbounded in-memory upload handling.
- Plan quota accounting has a race condition that enables usage-limit bypass under concurrent requests.

## Findings

### 1) Critical - User impersonation via client-controlled `user_id` in class routes

Affected code:
- `src/infra/http/controllers/class-controller.ts:7`
- `src/infra/http/controllers/class-controller.ts:32`

Details:
- `POST /classes` trusts `user_id` from body/query instead of `req.user.id`.
- `GET /classes` also trusts `user_id` from query/body.
- Any authenticated user can create/list classes for another user if they know a valid user ID.

Impact:
- Cross-tenant data exposure and unauthorized resource creation.

Recommended fix:
- Ignore client-provided `user_id` for protected routes.
- Always derive owner from session (`req.user.id`).
- Enforce owner checks in usecases/repositories (defense in depth).

### 2) High - IDOR on task creation/listing by arbitrary `class_id`

Affected code:
- `src/infra/http/controllers/task-controller.ts:6`
- `src/infra/http/controllers/task-controller.ts:42`
- `src/infra/db/repositories/task-repository.ts:60`

Details:
- `POST /tasks` and `GET /tasks` accept any `class_id`.
- There is no check that the class belongs to `req.user.id` before creating or listing tasks.

Impact:
- Unauthorized read/write across other users' classes/tasks.

Recommended fix:
- Resolve class ownership before allowing create/list.
- Implement repository methods scoped by owner (`listByClassIdAndUserId`, etc.).

### 3) Critical - IDOR across extraction endpoints (`task_id`, `batchId`, `id`)

Affected code:
- `src/infra/http/controllers/extraction-controller.ts:85`
- `src/infra/http/controllers/extraction-controller.ts:117`
- `src/infra/http/controllers/extraction-controller.ts:197`
- `src/infra/http/controllers/extraction-controller.ts:238`
- `src/infra/http/controllers/extraction-controller.ts:269`
- `src/application/usecases/extractions/get-bulk-task-extractions.ts:21`
- `src/application/usecases/extractions/list-task-extractions.ts:11`

Details:
- `GET /extractions/bulk/:batchId`, `GET /extractions/bulk/:batchId/events`, `GET /extractions?task_id=...`, and `GET /extractions/:id` return data by raw identifiers without owner validation.
- `POST /extractions` allows insertion using arbitrary `task_id`.

Impact:
- Leakage of OCR content and analysis data between tenants.
- Potential data poisoning of another user's task extraction history.

Recommended fix:
- For every extraction read/write, verify `task_id -> class_id -> user_id == req.user.id`.
- Reject access when ownership chain does not match.
- Remove direct repository access in controllers for sensitive reads; use authorization-aware usecases.

### 4) High - Unauthorized task mutation in criteria attachment

Affected code:
- `src/application/usecases/criteria/attach-grade-criteria-to-task.ts:27`
- `src/infra/http/controllers/grade-criteria-controller.ts:90`

Details:
- `POST /tasks/:id/criteria` validates whether criteria is public/owned, but does not validate that the target task belongs to the current user.
- An attacker can update another user's task classification/criteria if they know the task ID.

Impact:
- Unauthorized modification of grading configuration and downstream analysis behavior.

Recommended fix:
- Before `TaskRepository.update`, load task and validate ownership through class owner.
- Add owner-scoped update method to prevent accidental bypass.

### 5) High - Cross-tenant write/read via OCR endpoints using foreign `task_id`

Affected code:
- `src/application/usecases/ocr/extract-text.ts:68`
- `src/application/usecases/ocr/extract-text.ts:90`
- `src/application/usecases/extractions/create-bulk-task-extractions.ts:107`
- `src/application/usecases/extractions/create-bulk-task-extractions.ts:120`

Details:
- `POST /extract-text` and `POST /extractions/bulk` accept `task_id` and write results to that task without ownership verification.
- A user can spend own quota while writing OCR/analysis records into another user's task.

Impact:
- Data integrity compromise and unauthorized cross-tenant writes.

Recommended fix:
- Enforce task ownership before using any provided `task_id`.
- Reject requests where task owner differs from `req.user.id`.

### 6) High - Unbounded in-memory uploads (DoS risk)

Affected code:
- `src/infra/http/routes/index.ts:29`
- `src/infra/http/routes/index.ts:42`
- `src/infra/http/routes/index.ts:54`

Details:
- Multer uses `memoryStorage()` with no configured `limits` (file size/count/parts).
- Attackers can send very large files or many files, causing process memory exhaustion.

Impact:
- Denial of service, pod/container restarts, degraded availability.

Recommended fix:
- Set strict multer limits (`fileSize`, `files`, `parts`).
- Enforce MIME/extension allowlist.
- Consider streaming uploads to object storage instead of memory buffers.

### 7) Medium - Plan quota race condition (concurrent bypass)

Affected code:
- `src/application/usecases/extractions/create-bulk-task-extractions.ts:84`
- `src/infra/db/repositories/user-repository.ts:97`
- `src/infra/db/repositories/user-repository.ts:113`

Details:
- Usage quota check and increment are not atomic.
- Concurrent requests can pass checks simultaneously and consume more operations than intended while persisted usage undercounts.

Impact:
- Billing/quota abuse and inconsistent usage accounting.

Recommended fix:
- Use atomic conditional update (`$inc` with quota guard in query).
- Fail request when conditional update does not match.

## Priority Fix Order

1. Fix all BOLA/IDOR issues (Findings 1-5).
2. Add upload hard limits (Finding 6).
3. Make quota updates atomic (Finding 7).

## Suggested Validation After Fixes

- Negative authorization tests for every route:
  - user A cannot read/create/update resources of user B.
- Integration tests for extraction endpoints with foreign `task_id`, `batchId`, `id`.
- Stress tests for upload limits.
- Concurrent tests for quota updates.
