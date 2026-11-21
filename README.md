<div align="center">

# CivicResolve

### AI-Powered Citizen Grievance Management & Resolution Platform

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_Postgres_RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4_Themes-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-95_Tests_Passing-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)](https://vitest.dev/)
[![Accessibility](https://img.shields.io/badge/Accessibility-WCAG_2.1_AA-blue?style=for-the-badge&logo=w3c&logoColor=white)](https://www.w3.org/WAI/WCAG21/quickref/)

**Report local civic hazards in seconds. Let multimodal AI classify, prioritize, and route them in the background—while citizens, department officers, and municipal leaders track every step from report to resolution.**

[Live Demo](#quick-demo-access) · [Architecture](#system-architecture) · [API Reference](#api-reference) · [Security Hardening](#security-architecture) · [Getting Started](#getting-started)

</div>

---

## Overview & Problem Statement

Traditional municipal grievance portals suffer from slow forms, opaque routing, misassigned tickets, and dated interfaces. Citizens frequently abandon reports when faced with mandatory account verification delays, multi-step dropdowns, or brittle map widgets that fail without proprietary billing keys. Once submitted, complaints languish in administrative bottlenecks with zero visibility into triage status or inter-department handoffs.

**CivicResolve** reimagines civic issue reporting as a fast, transparent, and security-hardened full-stack platform:
- **Instant Persistence:** When a citizen submits an issue—complete with a photo and GPS or map-pinned location—CivicResolve saves the report **instantly** (201 Created) so the user never waits on an AI loading screen.
- **Background Multimodal AI Triage:** Next.js 16's `after()` hook schedules a **Google Gemini** multimodal pipeline that validates image evidence, classifies issue categories, evaluates urgency, generates executive summaries, and assigns tickets directly to the responsible municipal department.
- **Keyless Geospatial Infrastructure:** Interactive OpenStreetMap/Leaflet integration and reverse geocoding with zero proprietary billing keys or external quotas.
- **Role-Based Workspaces:** Scoped dashboards for Citizens, Department Resolvers, and Chief Administrators with fine-grained Row Level Security (RLS).

---

## Key Features

### 1. Instant Submission & Background Multimodal AI Triage
* **Zero-Wait Citizen Experience:** Complaints are persisted immediately with status `Reported` and `ai_status: 'review_pending'`, returning a `CR-XXXXXX` tracking code in milliseconds. Citizens can watch live polling updates or close their browser safely while AI triage completes asynchronously via `next/server` `after()`.
* **Multi-Model Gemini Fallback Chain:** Cycles automatically through configured Gemini models (`GEMINI_MODEL_CHAIN`, e.g., `gemini-2.5-flash`, `gemini-2.5-flash-lite`, `gemini-2.0-flash`) with dynamic model discovery fallback.
* **Smart Media Resilience:** Inspects raw file headers via binary magic bytes on the server (verifying genuine JPEG, PNG, WebP, and HEIC signatures), auto-converts incompatible browser formats on the client, and gracefully degrades to text-only triage if an unsupported media type is encountered.

### 2. Keyless 3-Mode Location Picker & Pincode Detection
* **Manual Entry:** Direct street/landmark address input paired with strict 6-digit postal pincode validation.
* **Current Location (GPS):** One-click browser geolocation with server-side reverse geocoding.
* **Interactive Map Pin:** Powered by **Leaflet + OpenStreetMap** (zero API keys or credit card requirements) with drag-and-drop pin placement and automatic street address + 6-digit pincode extraction via `/api/geocode/reverse` (Nominatim with BigDataCloud fallback).

### 3. Role-Based Municipal Portals

| Role | Route | Core Capabilities |
| :--- | :--- | :--- |
| **Citizen** | `/citizen` | Two-tab workspace featuring an animated **4-step reporting wizard** with a live 3D ticket preview card and a **My Requests** tracker with Active/Completed filtering, real-time AI routing updates, and official resolution notes. |
| **Department Resolver** | `/resolver` | Strictly scoped to a single municipal department. Features an interactive **3-step visual status stepper** (`Reported` -> `In Progress` -> `Resolved`), search by ticket code/address/pincode, full-resolution photo lightbox, resolution note updates, and a **Request Reassignment** modal. |
| **Chief Admin (`Head`)** | `/admin` | Protected, undeletable root administrator (`is_protected = true`). Features interactive department workload filters, single & batch **Retry AI Triage**, manual triage overrides, atomic in-place reassignment approvals/rejections, and a **Staff Directory** to provision or remove department resolvers. |

**Supported Municipal Departments:**
1. `Roads & Infrastructure`
2. `Sanitation & Waste`
3. `Water & Drainage`
4. `Electrical & Streetlights`
5. `Parks & Public Safety`

### 4. Interactive UI & 4 Curated Themes
* **4 Contrast-Verified Themes:** Switch seamlessly anytime with persistent storage and zero flash-of-unstyled-theme (FOUT):
  * **Civic Paper (`alabaster`)** — Warm architectural light palette with deep forest accents.
  * **Swiss Cobalt (`blueprint`)** — Precision slate-mist light palette with international cobalt accents.
  * **Linear Carbon (`obsidian`)** — Ultra-crisp deep carbon dark ops interface with sky-cyan telemetry.
  * **Nocturne Emerald (`pine`)** — Rich deep pine-charcoal dark interface with jade-emerald highlights.
* **Modern Typography & Micro-Interactions:** Paired **Space Grotesk** display headings, **DM Sans** UI copy, and **JetBrains Mono** telemetry codes, enhanced with cursor-tracking `SpotlightCard`s, theme-matched `ShineBorder` input containers, `RippleButton` feedback, rolling `NumberTicker` counters, and live typing pulse indicators.

---

## System Architecture

```text
+-------------------------------------------------------------------------+
|                        Browser / Next.js 16 Client                      |
|   /login (3D Visual + Demo) | /citizen | /resolver | /admin (4 Themes)  |
+-------------------+---------------------------------+-------------------+
                    |                                 |
          Auth & FormData                     Reverse Geocoding
                    v                                 v
+---------------------------------------+   +-----------------------------+
|     Next.js 16 App Router APIs        |   |   /api/geocode/reverse      |
|  - POST /api/complaints (Instant 201) |   |   (Auth + Rate-Limited)     |
|  - PATCH /api/resolver/complaints/:id |   |   Nominatim -> BigDataCloud |
|  - PATCH /api/admin/complaints/:id    |   +-----------------------------+
|  - POST /api/admin/retry-ai           |
|  - CRUD /api/admin/resolvers          |
|  - GET /api/health                    |
+---------+--------------------+--------+
          |                    |
  Immediate Insert       next/server after()
  (service_role)         (Background Worker)
          v                    v
+-------------------+   +-------------------------------------------------+
|  Supabase Cloud   |   |        Google Gemini Multimodal Triage          |
|  - Auth (getUser) |   |  - System Instruction + XML Prompt Isolation    |
|  - Postgres + RLS |<--+  - Structured JSON Schema Output                |
|  - Storage Bucket |   |  - Multi-Model Fallback -> review_pending Safe  |
+-------------------+   +-------------------------------------------------+
```

---

## Security Architecture

CivicResolve is audited and hardened across database, API, AI, and HTTP layers:

* **Zero Client Privilege Escalation:** The `handle_new_auth_user()` Postgres trigger hardcodes all public signups to `role = 'citizen'` and `is_protected = false`, ignoring client-supplied signup metadata.
* **Database RLS Policies:** Row Level Security (RLS) is strictly enforced on `public.profiles` and `public.complaints`. Resolvers are cryptographically locked to view and update only tickets assigned to their verified department.
* **Database Performance Indexes:** 6 compound and partial indexes optimize frequent queries:
  * `idx_complaints_citizen_created` on `(citizen_id, created_at DESC)`
  * `idx_complaints_dept_status_created` on `(department, status, created_at DESC)`
  * `idx_complaints_ai_status_created` on `(ai_status, created_at DESC)`
  * `idx_complaints_reassignment_pending` on `(reassignment_requested) WHERE reassignment_requested = true`
  * `idx_complaints_pincode` on `(pincode)`
  * `idx_profiles_role_dept` on `(role, department)`
* **Explicit Query Projections:** All database queries across server and client routes use explicit projections (`PROFILE_COLUMNS`, `COMPLAINT_COLUMNS`), eliminating over-fetching and payload bloat.
* **Server-Enforced Ingestion:** Direct browser `INSERT` policies on `public.complaints` are disabled; every ticket passes through server-side validation and `supabase.auth.getUser()` verification.
* **Binary Magic-Byte File Validation:** Uploaded images are inspected by raw buffer signatures (JPEG, PNG, WebP, HEIC) with a strict `5 MB` ceiling and UUID-generated storage keys—preventing spoofed extensions or stored XSS.
* **Prompt-Injection Containment:** Untrusted citizen fields are wrapped inside `<untrusted_citizen_complaint>` XML delimiters and isolated from Gemini's native `systemInstruction`.
* **Sliding-Window Rate Limiting:** In-memory sliding-window limiter guards `/api/geocode/reverse` (20 req/min) and `/api/auth/demo-setup` (15 req/min) against resource exhaustion.
* **HTTP Security Headers:** Configured in `next.config.ts`:
  * `X-Frame-Options: DENY`
  * `X-Content-Type-Options: nosniff`
  * `Referrer-Policy: strict-origin-when-cross-origin`
  * `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
  * `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
  * `Cross-Origin-Opener-Policy: same-origin`
  * `X-DNS-Prefetch-Control: off`

---

## Accessibility & Performance (WCAG 2.1 AA)

* **Skip Navigation:** High-priority skip link (`#main-content`) enables keyboard and screen-reader users to bypass repetitive navigation bars directly.
* **Landmark Structure:** Every dashboard and core application page utilizes semantic `<main id="main-content">`, `<header>`, and `<nav aria-label="...">` landmarks.
* **Keyboard & Screen Reader Support:**
  * Modals (e.g., `ReassignModal`, Lightbox) feature `role="dialog"`, `aria-modal="true"`, focus trapping, and `Escape` key dismissal.
  * Segmented controls and tab switchers implement `role="tablist"` and `role="tab"` with dynamic `aria-selected` bindings.
  * Loading indicators incorporate `role="status"` and `aria-live="polite"` with visually hidden descriptions.
* **Focus & Motion Preferences:**
  * `:focus-visible` ring provides high-contrast `2px solid var(--accent)` outlines across all interactive controls.
  * `@media (prefers-reduced-motion: reduce)` disables non-essential animations, spins, and transitions for motion-sensitive users.
* **Image Optimization:** Evidence images and thumbnails feature `loading="lazy"` and `decoding="async"` attributes to preserve fast Largest Contentful Paint (LCP).
* **Hydration-Safe Dates:** All timestamp rendering is centralized through `formatDate(...)`, utilizing deterministic UTC formatting to guarantee zero React hydration mismatches across client timezones.

---

## API Reference

All API routes return private cache headers (`Cache-Control: no-store, no-cache, must-revalidate`).

| Endpoint | Method | Auth Required | Rate Limit | Description |
| :--- | :--- | :--- | :--- | :--- |
| `/api/complaints` | `POST` | Citizen | N/A | Submits a complaint (`multipart/form-data`), saves immediately, and schedules background AI triage. |
| `/api/resolver/complaints/[id]` | `PATCH` | Resolver | N/A | Updates status/notes or requests reassignment for tickets within the resolver's department. |
| `/api/admin/complaints/[id]` | `PATCH` | Chief Admin | N/A | Manual triage override or approves/rejects reassignment requests in-place. |
| `/api/admin/complaints` | `GET` | Chief Admin | N/A | Retrieves all complaints across departments with explicit column projections. |
| `/api/admin/resolvers` | `GET`, `POST`, `DELETE` | Chief Admin | N/A | Lists, creates, or deprovisions department resolver staff accounts. |
| `/api/admin/retry-ai` | `POST` | Chief Admin | N/A | Re-triggers AI triage for single tickets or batch retries all `review_pending` complaints (capped at 25). |
| `/api/geocode/reverse` | `GET` | Authenticated | 20 req / min | Reverse-geocodes `lat`/`lon` coordinates to street address and 6-digit pincode. |
| `/api/auth/demo-setup` | `POST` | Public | 15 req / min | Idempotently provisions demo accounts for testing (`citizen`, `resolver`, `head`). |
| `/api/health` | `GET` | Public | N/A | Lightweight system health and monitoring probe returning 200 OK. |

---

## Automated Test Suite

CivicResolve includes an exhaustive automated test suite (95 tests across 9 test files) powered by **Vitest**:

```bash
npm test
```

| Test Suite | File | Focus Area |
| :--- | :--- | :--- |
| **Input Validation & Sanitization** | `tests/validation.test.ts` | Pincode format (`^\d{6}$`), string length caps, control character stripping, payload validator, hydration-safe dates. |
| **Binary Magic-Byte Image Check** | `tests/imageValidation.test.ts` | Genuine JPEG, PNG, WebP, HEIC detection, extension spoofing prevention, zero-byte & truncated buffer rejection. |
| **Security Audit & Secrets Protection**| `tests/securityAudit.test.ts` | Zero secret exposure in client code, HTTP security headers, server-side `getUser()` checks, SSRF guards, rate limiting. |
| **Supabase Schema & RLS Contract** | `tests/supabaseRlsContract.test.ts` | Table definitions, RLS policies, protected profile deletion prevention, security definer functions, updated_at triggers. |
| **Gemini AI Triage & Fallback Chain** | `tests/triageHandler.test.ts` | Structured schema parsing, multi-model failover, unsupported MIME degradation, `review_pending` safe fallback. |
| **RBAC & API Route Contracts** | `tests/rbacAndApiRoutes.test.ts` | Authentication checks, 403 jurisdiction boundaries, resolver update logic, admin reassignment approvals/rejections. |
| **Sliding-Window Rate Limiter** | `tests/rateLimit.test.ts` | Window quota allowance, 429 rate limit enforcement, client isolation, timer expiration, store resets. |
| **Accessibility & Config Contracts** | `tests/accessibilityAndConfigContract.test.ts` | Skip link targeting `#main-content`, page landmark structure, prefers-reduced-motion, modal ARIA semantics, health probe. |
| **Static Architecture & Typecheck** | `tests/contracts.test.ts` | Absence of legacy ward properties, dynamic exports, metadata titles, and full TypeScript `tsc --noEmit` pass. |

---

## CI/CD Pipeline

The repository includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that validates every push and pull request:
1. **Dependency Installation:** `npm ci` on Node.js 20.
2. **TypeScript Compilation:** `npm run typecheck` (`tsc --noEmit`).
3. **Static Analysis & Linting:** `npm run lint` (`eslint`).
4. **Automated Testing:** `npm test` (`vitest run`).
5. **Production Build:** `npm run build` (Next.js Turbopack build).

---

## Getting Started

### Prerequisites
* **Node.js 20+** and `npm`
* A free **Supabase** project
* A **Google Gemini API key** from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/<your-username>/civicresolve.git
cd civicresolve
npm install
```

### 2. Configure Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key
# Optional comma-separated model priority chain (leave blank to auto-detect enabled models)
GEMINI_MODEL_CHAIN=gemini-2.5-flash,gemini-2.5-flash-lite,gemini-2.0-flash

# Chief Admin Bootstrap Credentials
HEAD_ADMIN_EMAIL=head@civicresolve.gov
HEAD_ADMIN_PASSWORD=ChooseAStrongPassword!2026
```

### 3. Initialize Supabase Database & Storage

1. Open your **Supabase SQL Editor** and execute `supabase/schema.sql` followed by `supabase/auth_trigger.sql`.
2. Ensure the `complaint-images` storage bucket exists under **Supabase -> Storage** (configured as public for citizen evidence previews).
3. In **Supabase -> Authentication -> URL Configuration**, set your **Site URL** and **Redirect URLs** to `http://localhost:3000` (and your Vercel production URL after deploying).

### 4. Run Locally

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Quick Demo Access

For reviewers and live demonstrations, the `/login` portal includes a **Quick Demo Access** bar providing 1-click sign-in into all three roles without manual account setup:

1. **Demo Citizen** — Experience the 4-step animated issue wizard, GPS/Map pincode picker, instant background AI submission, and live request tracker.
2. **Demo Resolver** — Manage department-locked tickets (`Roads & Infrastructure`), step issues through resolution stages, post official notes, or request cross-department transfers.
3. **Demo Head (Chief Admin)** — Inspect citywide department workloads, approve or reject reassignment requests in-place, batch-retry pending AI classifications, and manage department staff.

---

## Verification Commands

Run each verification check locally:

```bash
# 1. TypeScript Strict Typecheck
npm run typecheck

# 2. ESLint Static Analysis
npm run lint

# 3. Automated Vitest Suite (95 tests)
npm test

# 4. Production Turbopack Build
npm run build
```

---

## Deploying to Vercel

1. Push the repository to GitHub and import it into **Vercel**.
2. Add all variables from `.env.local` under **Vercel -> Project Settings -> Environment Variables**.
3. Deploy and copy your live `https://<your-app>.vercel.app` URL into **Supabase -> Authentication -> URL Configuration** (`Site URL` and `Redirect URLs`).

---

## License

Built for modern civic infrastructure transparency. Distributed under the MIT License.
