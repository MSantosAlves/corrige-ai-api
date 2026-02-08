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

## Auth + Payments milestone

Goal: ESM migration, Better Auth with Google + email verification, and Stripe subscription plumbing with an admin surface in the Next.js app.

- [x] ESM migration (package.json `type: module`, tsconfig `ESNext` + `Bundler`, import path fixes, `__dirname` replacement, build validation)
- [ ] Better Auth server setup (instance, Mongo adapter, mount `/api/auth/*` before `express.json()`)
- [ ] Session/cookie config for `.revisafacil.com` and CORS credentials for `app.revisafacil.com`
- [ ] Google OAuth provider (client id/secret, callback URL, consent screen)
- [ ] Email verification (send, verify, resend) using Resend
- [ ] Frontend Next.js integration (sign-in, callback, verify-email, protected routes)
- [ ] Stripe core setup (SDK, checkout session, customer portal)
- [ ] Stripe webhooks (signature verification, subscription lifecycle updates)
- [ ] Data model updates (user Stripe fields, plans collection, audit logs)
- [ ] Admin panel (Next.js `/admin`, role checks, admin APIs, audit logging)

### Plan Details

**Summary**
- Convert API to ESM (Better Auth requires ESM).
- Integrate Better Auth in API with Mongo adapter and cookie sessions across subdomains.
- Add Google OAuth + email verification via Resend.
- Add Stripe subscription flows and webhooks.
- Add admin panel in the same Next.js app with role-based access and audit logs.

**Current state**
- API: Express + TypeScript + Mongoose.
- Build: CommonJS via `tsc` + `tsc-alias`.
- No auth provider in codebase.
- Env config in `src/infra/config/env.ts`.
- CORS allowlist in `src/shared/index.ts`.

**Target architecture**

1) **ESM migration (API)**
- `package.json` add `type: module`.
- `tsconfig.json` use `module: ESNext` and `moduleResolution: Bundler`.
- Ensure runtime imports include explicit `.js` extensions after build.
- Replace `__dirname`/`__filename` usage with `import.meta.url` helpers.
- Validate `node dist/shared/index.js` works.

2) **Better Auth integration (API)**
- Create Better Auth instance and mount `app.all("/api/auth/*", toNodeHandler(auth))` before `express.json()`.
- Use Mongo adapter with `mongoose.connection.getClient()`.
- Cookie sessions on `.revisafacil.com` with secure flags in production.
- Enable CORS with credentials for `app.revisafacil.com`.

3) **Google OAuth**
- Configure Google provider with `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.
- OAuth callback: `https://api-prod.revisafacil.com/api/auth/callback/google`.

4) **Email verification**
- Use Better Auth email verification hooks.
- Implement send/verify/resend using Resend.
- Verification links open Next.js route then call API verification endpoint.

5) **Frontend Next.js integration**
- Use Better Auth client or direct API calls.
- Add `/auth/callback` and `/auth/verify-email` routes.
- Protect authenticated and admin-only routes.

6) **Stripe (subscription tiers)**
- `POST /billing/checkout` for Checkout session.
- `POST /billing/portal` for Customer Portal session.
- `POST /webhooks/stripe` for subscription lifecycle changes.

7) **Data model**
- `users` fields: `stripe_customer_id`, `subscription_status`, `plan_id`, `current_period_end`.
- `plans` collection: `plan_id`, `stripe_price_id`, `monthly_quota`, `features`.
- `audit_logs` collection: `actor_user_id`, `action`, `target_id`, `metadata`, `created_at`.
- Optional `usage` collection for future hybrid billing.

8) **Admin panel**
- `/admin` in Next.js app.
- Role-based access: `ADMIN`, `SUPPORT`, `TEACHER`.
- Admin-only API endpoints and audit logging for changes.

**External configuration (env)**
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_*` (plan pricing identifiers)

**Tests and validation**
- Google OAuth sign-in sets cookies correctly.
- Email verification updates user status.
- Stripe webhooks verify signature and update subscription status.
- Admin routes blocked for non-admin roles.

**Assumptions**
- Billing model: subscription tiers.
- Session strategy: cookie sessions across subdomains.
- Email provider: Resend.
- Frontend on `app.revisafacil.com`, API on `api-prod.revisafacil.com`.
