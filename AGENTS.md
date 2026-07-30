# Project Context

ManMath is a web application for practicing Vietnamese high school math exams.

The primary goal is to build a clean MVP first.

The project is also a learning project. The developer wants to understand important technical decisions instead of blindly accepting generated code.

---

# Tech Stack

## Frontend

* Next.js App Router
* TypeScript
* Tailwind CSS

## Backend

* Express
* TypeScript

## Database

* PostgreSQL

---

# Core Rules

* Read this file before making changes.
* Make the smallest safe change.
* Preserve the current architecture.
* Do not rewrite unrelated files.
* Do not perform large refactors automatically.
* Keep TypeScript strict.
* Prefer explicit types over implicit types.
* Explain all modified files after editing.
* Always provide manual testing steps.
* Run build checks when applicable.

---

# Learning Mode (Important)

This project is a learning project.

When the task involves:

* Routing
* Architecture
* Backend design
* Database design
* State management
* Autosave systems
* API design
* Authentication
* Performance
* System design

DO NOT start coding immediately.

First teach the developer.

Provide:

1. What is being built
2. Why it is needed
3. How it works conceptually
4. Files involved
5. Data flow
6. Risks
7. Tradeoffs
8. Alternative approaches
9. Recommended approach

After that ask:

"Do you want:
A. Guided implementation
B. Full implementation"

Default mode:

Guided implementation.

Prefer teaching over coding.

---

# Guided Coding Mode

When working in guided mode:

* Explain the next step.
* Explain which file should be edited.
* Explain why.
* Explain how the change affects the system.
* Wait before moving to the next major step.

Do not automatically implement an entire architecture feature.

The developer should understand the change before the code is written.

---

# UI Mode

For UI and styling tasks:

You may implement directly.

Examples:

* Tailwind styling
* Layout improvements
* Responsive fixes
* Loading states
* Empty states
* Error states
* Exam cards
* Result cards
* Question navigator
* Typography improvements

Requirements:

* Do not change business logic.
* Do not change API contracts.
* Do not change routing.
* Do not change state management.
* Do not add dependencies.

Focus on:

* Academic
* Focused
* Low-fatigue
* Clean
* Professional

Avoid:

* Flashy gradients
* Excessive animations
* Generic AI-dashboard aesthetics

---

# Architecture Rules

Before changing:

* Routing
* App Router structure
* Folder structure
* Data flow
* State management
* Autosave flow
* Submit flow
* Result persistence

You must:

1. Analyze current flow
2. Explain proposed flow
3. Explain affected files
4. Explain risks
5. Wait for approval

Do not implement immediately.

---

# Database Rules

Before changing PostgreSQL schema:

* Show schema changes first.
* Explain why the change is needed.
* Explain migration impact.
* Explain affected backend code.

Wait for approval before implementation.

---

# API Rules

Before changing request/response contracts:

Provide:

## Current API

Request:

Response:

## Proposed API

Request:

Response:

## Impact

* Frontend
* Backend
* Database

Wait for approval before implementation.

---

# Dependency Rules

Do not install packages automatically.

Before adding a dependency:

Explain:

* Why it is needed
* Alternatives
* Tradeoffs

Wait for approval.

---

# Refactor Rules

If a task affects more than 5 files:

Stop first.

Provide:

* Goal
* Files affected
* Risks
* Refactor plan

Wait for approval.

---

# Preferred Workflow

For every task:

1. Analyze
2. Plan
3. Implement
4. Build
5. Explain changes
6. Provide manual test steps

For UI tasks:

Analyze → Implement → Build

For architecture tasks:

Analyze → Teach → Plan → Approval → Implement → Build

---

# MVP Scope

Allowed:

* Exam list
* Exam detail
* Exam taking
* Question navigation
* Timer
* Answer selection
* Autosave
* Submit exam
* Score calculation
* Result page
* Review answers

---

# Out of Scope

Do not implement unless explicitly requested:

* Authentication
* Authorization
* Payment
* Subscription
* Ranking
* Leaderboards
* OCR
* AI explanation
* AI tutor
* Admin dashboard
* Notifications
* Social features
* Chat
* Gamification

---

# Code Style

Prefer:

* Small components
* Clear naming
* Predictable folder structure
* Readable code over clever code

Avoid:

* Premature optimization
* Unnecessary abstractions
* Overengineering
* Adding libraries for simple problems

Build the simplest solution that satisfies the current MVP.

<!-- ASTRYX:START -->
Astryx v0.1.9 · 153 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   153 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
