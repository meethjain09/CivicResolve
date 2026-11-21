<div align="center">

# CivicResolve

### AI-Powered Citizen Grievance Management & Resolution Platform

[![Next.js](https://img.shields.io/badge/Next.js-16_App_Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_&_Postgres_RLS-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Multimodal_AI-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4_Themes-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

**Report local civic hazards in seconds. Let multimodal AI classify, prioritize, and route them in the background—while citizens, department officers, and municipal leaders track every step from report to resolution.**

[Live Demo](#quick-demo-access) · [Architecture](#system-architecture) · [Security Hardening](#security-architecture) · [Getting Started](#getting-started)

</div>

---

## Overview

Traditional municipal grievance portals suffer from slow forms, opaque routing, misassigned tickets, and dated interfaces. **CivicResolve** reimagines civic issue reporting as a fast, transparent, and security-hardened full-stack platform.

When a citizen submits an issue—complete with a photo and GPS or map-pinned location—CivicResolve saves the report **instantly** so the user never waits on an AI loading screen. In the background, Next.js 16's `after()` hook triggers a **Google Gemini** multimodal triage pipeline that verifies image evidence, evaluates urgency, generates an executive summary, and routes the ticket directly to the responsible municipal department.

---

## Key Features

### Instant Submission & Background Multimodal AI Triage
* **Zero-Wait Citizen Experience:** Complaints are persisted immediately as `review_pending` and return a `CR-XXXXXX` tracking code in milliseconds. Citizens can stay on the page to watch live polling updates or close their browser safely while AI triage completes asynchronously via `next/server` `after()`.
* **Multi-Model Gemini Fallback Chain:** Cycles automatically through configured Gemini models (`GEMINI_MODEL_CHAIN`) to handle rate limits or transient outages gracefully. If all models are exhausted, the ticket stays safely queued in the Chief Admin's `review_pending` recovery queue.
* **Smart Media Resilience:** Validates image files via binary magic bytes on the server, auto-converts incompatible browser formats on the client, and gracefully degrades to text-only triage if an unsupported media type is encountered.

### Keyless 3-Mode Location Picker & Pincode Detection
* **Manual Entry:** Direct street/landmark address input paired with a strict 6-digit pincode field.
* **Current Location (GPS):** One-click browser geolocation with reverse geocoding.
* **Interactive Map Pin:** Powered by **Leaflet + OpenStreetMap** (zero API keys or billing required) with drag-and-drop pin placement and automatic street address + 6-digit pincode extraction via `/api/geocode/reverse` (Nominatim with BigDataCloud fallback).

### Role-Based Municipal Portals

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

### Interactive UI & 4 Curated Themes
* **4 Contrast-Verified Themes:** Switch seamlessly anytime with persistent storage and zero flash-of-unstyled-theme (FOUT):
  * **Civic Paper (`alabaster`)** — Warm architectural light palette with deep forest accents.
  * **Swiss Cobalt (`blueprint`)** — Precision slate-mist light palette with international cobalt accents.
  * **Linear Carbon (`obsidian`)** — Ultra-crisp deep carbon dark ops interface with sky-cyan telemetry.
  * **Nocturne Emerald (`pine`)** — Rich deep pine-charcoal dark interface with jade-emerald highlights.
* **Modern Typography & Micro-Interactions:** Paired **Space Grotesk** display headings, **DM Sans** UI copy, and **JetBrains Mono** telemetry codes, enhanced with layered animated dot-grid backdrops, cursor-tracking `SpotlightCard`s, theme-matched `ShineBorder` input containers, `RippleButton` feedback, rolling `NumberTicker` counters, and live typing pulse indicators.

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

CivicResolve was audited and hardened across database, API, AI, and HTTP layers:

* **Zero Client Privilege Escalation:** The `handle_new_auth_user()` Postgres trigger hardcodes all public signups to `role = 'citizen'` and `is_protected = false`, ignoring client-supplied signup metadata.
* **Column-Level Profile Protection:** Authenticated users are revoked from updating `role`, `department`, or `is_protected` on `public.profiles`, reinforced by a `BEFORE UPDATE` trigger (`enforce_profile_column_security`).
* **Server-Enforced Ingestion:** Direct browser `INSERT` policies on `public.complaints` are disabled; every ticket must pass through `/api/complaints` validation and server-verified `supabase.auth.getUser()` checks.
* **Binary Magic-Byte File Validation:** Uploaded images are inspected by raw buffer signatures (JPEG, PNG, WebP, HEIC) with a strict `5 MB` ceiling and UUID-generated extensions—preventing spoofed MIME types or stored XSS uploads.
* **Prompt-Injection Containment:** Untrusted citizen fields are wrapped inside `<untrusted_citizen_complaint>` XML delimiters and isolated from Gemini's native `systemInstruction`.
* **SSRF & Proxy Abuse Prevention:** `/api/admin/retry-ai` validates `image_url` against the configured HTTPS Supabase Storage origin before fetching. `/api/geocode/reverse` and `/api/auth/demo-setup` enforce per-user/IP rate limits (`429`).
* **HTTP Security Headers:** Configured in `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Strict-Transport-Security`, and `Permissions-Policy`).

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, TypeScript) |
| **Styling & Motion** | Tailwind CSS, CSS Custom Properties (4 Themes), Custom Magic UI Primitives |
| **Backend & Database** | Supabase (Auth, PostgreSQL, Row-Level Security, Storage) |
| **AI & Triage** | Google Gemini API (`@google/genai`) |
| **Maps & Geocoding** | Leaflet, OpenStreetMap, Nominatim, BigDataCloud Fallback |
| **Testing** | Vitest (Unit, Security Audit, RLS Contract, & RBAC Route Suites) |
| **Deployment** | Vercel |

---

## Project Structure

```text
civicresolve/
├── supabase/
│   ├── schema.sql                  # Tables, enums, RLS policies & security triggers
│   └── auth_trigger.sql            # Hardened auth signup -> profile trigger
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── admin/              # Chief Admin triage, AI retry, & staff APIs
│   │   │   ├── auth/demo-setup/    # Rate-limited 1-click demo account provisioning
│   │   │   ├── complaints/         # Instant submission + after() AI triage
│   │   │   ├── geocode/reverse/    # Authenticated reverse geocoding + pincode proxy
│   │   │   └── resolver/           # Department-scoped ticket update & reassignment APIs
│   │   ├── admin/                  # Chief Admin dashboard route
│   │   ├── citizen/                # Citizen dashboard route
│   │   ├── login/                  # Split-screen 3D login & signup portal
│   │   ├── resolver/               # Department Resolver dashboard route
│   │   ├── globals.css             # 4-theme tokens, contrast locks & animations
│   │   └── layout.tsx              # Fonts, ThemeProvider, FOUT script & AmbientBackdrop
│   ├── components/
│   │   ├── admin/                  # AdminDashboardClient, AdminComplaintCenter, StaffManager
│   │   ├── auth/                   # AuthForm (Citizen/Resolver toggle + Demo Access)
│   │   ├── citizen/                # CitizenDashboardClient, 4-Step ComplaintForm, LocationPicker, TicketList
│   │   ├── layout/                 # Shared glass Navbar
│   │   ├── resolver/               # ResolverTicketCard, ReassignModal
│   │   ├── shared/                 # High-contrast StatusBadge
│   │   ├── theme/                  # ThemeProvider, ThemeSwitcher
│   │   └── ui/                     # AmbientBackdrop, Civic3DVisual, NumberTicker, RippleButton, ShineBorder, SpotlightCard, TiltCard, TypingIndicatorWrapper
│   ├── lib/
│   │   ├── gemini/triage.ts        # Multimodal Gemini analyzer & multi-model fallback chain
│   │   ├── supabase/               # Browser, Server, and Admin Supabase clients
│   │   └── utils/formatDate.ts     # Hydration-safe UTC date formatter
│   └── types/database.ts           # Shared TypeScript interfaces & department constants
├── tests/                          # Vitest automated validation, security, triage & RBAC tests
├── next.config.ts                  # HTTP security headers & Next.js configuration
└── vitest.config.ts                # Test runner configuration
```

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
GEMINI_MODEL_CHAIN=

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

## Testing & Verification

Run the automated Vitest suite covering input validation, binary image signature checks, security posture, Supabase RLS SQL contracts, Gemini triage fallbacks, and RBAC route handlers:

```bash
npm test
```

Run a full production type-check and build verification:

```bash
npx tsc --noEmit
npm run build
```

---

## Deploying to Vercel

1. Push the repository to GitHub and import it into **Vercel**.
2. Add all variables from `.env.local` under **Vercel -> Project Settings -> Environment Variables**.
3. Deploy and copy your live `https://<your-app>.vercel.app` URL into **Supabase -> Authentication -> URL Configuration** (`Site URL` and `Redirect URLs`).

---

## License

Built for modern civic infrastructure transparency. Feel free to adapt and extend under the MIT License.