# Interactive Live Terminals & Code Stream Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build interactive live terminal displays and real-time code execution simulators for 3D office workers, supporting both screen-space overlay and in-world 3D desk monitors with full session switching and stream controls.

**Architecture:** A decoupled reactive system consisting of (1) a `WorkerStateStore` managing worker identities, statuses, and selection events; (2) a `CodeStreamSimulator` generating realistic developer activity (bash, LLM thoughts, syntax diffs, build output) with bounded ring buffers to prevent memory leaks; (3) an interactive DOM `TerminalOverlay` with tabs, controls (scroll-lock, clear, min/max), and status line; and (4) an in-world `DeskMonitor` in Three.js rendering the active terminal buffer onto a procedural canvas texture with raycast click selection.

**Tech Stack:** Three.js, TypeScript, HTML5 Canvas 2D texture, CSS custom properties, Node test runner (`node --test`).

**Spec:** GitHub Issue #3 (Interactive live terminals & code stream).

## Global Constraints

- No external runtime dependencies; use Three.js and native DOM/Canvas APIs.
- Monospace typography and dark terminal styling.
- Maximum buffer line cap per worker (prevent memory leaks during continuous streaming).
- Zero console errors or unhandled exceptions.
- Smooth performance (>50 FPS) with continuous stream updates and canvas texture uploads.

## Review Focus

1. Rapid continuous log streaming causes memory exhaustion: bounded ring buffer (e.g. 300 lines max per session) drops oldest lines cleanly.
2. User manually scrolls up in terminal overlay: auto-scroll locks off automatically so view doesn't jump; resumes when scrolled to bottom or toggled.
3. Rapid worker tab switching or external worker-selected events: switches stream display immediately without dropping other workers' background streams.
4. CanvasTexture in-world monitor rendering under WebGL: throttled texture dirty flags (`needsUpdate = true`) to avoid re-uploading canvas every single millisecond.
5. Resize / maximize / minimize edge cases: terminal UI adapts cleanly without clipping or breaking 3D canvas interaction.

---

### Task 1: Worker State Store & Event System

**Files:**
- Create: `src/state/workerState.ts`
- Modify: `src/types/index.ts`
- Test: `src/state/workerState.test.ts`

**Interfaces:**
- Produces: `WorkerStateStore`, `WorkerProfile`, `WorkerStatus` ('idle' | 'coding' | 'reviewing' | 'testing').
- Consumes: Window custom events `'worker-selected'`.

- [ ] **Step 1: Write failing test for worker state store**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `WorkerStateStore` with worker registry, selection, and event dispatch**
- [ ] **Step 4: Run test to verify pass**
- [ ] **Step 5: Commit**

---

### Task 2: Real-time Code Stream Simulator with Bounded Ring Buffer

**Files:**
- Create: `src/simulator/codeStreamSimulator.ts`
- Create: `src/simulator/activityScenarios.ts`
- Test: `src/simulator/codeStreamSimulator.test.ts`

**Interfaces:**
- Consumes: `WorkerProfile` from `workerState.ts`.
- Produces: `CodeStreamSimulator`, `TerminalLine` (`text`, `type`, `timestamp`), syntax-colored diffs, LLM thoughts, commands.

- [ ] **Step 1: Write failing test for code stream simulator & bounded line buffer**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement realistic scenarios (git, npm test, diffs, thoughts) and bounded simulator engine**
- [ ] **Step 4: Run test to verify pass**
- [ ] **Step 5: Commit**

---

### Task 3: Interactive Terminal Overlay Component

**Files:**
- Create: `src/ui/terminal.ts`
- Modify: `src/style.css`
- Modify: `src/ui/overlay.ts`
- Test: `src/ui/terminal.test.ts`

**Interfaces:**
- Consumes: `WorkerStateStore`, `CodeStreamSimulator`.
- Produces: `TerminalOverlay` with tabs, minimize/maximize, auto-scroll lock toggle, clear button, and mode toggle.

- [ ] **Step 1: Write failing test for terminal DOM structure and controls**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement `TerminalOverlay` with styling, tab switching, and action controls**
- [ ] **Step 4: Run test to verify pass**
- [ ] **Step 5: Commit**

---

### Task 4: In-World 3D Desk Monitor with Live CanvasTexture

**Files:**
- Create: `src/scene/deskMonitor.ts`
- Modify: `src/scene/room.ts`
- Modify: `src/main.ts`
- Test: `src/scene/deskMonitor.test.ts`

**Interfaces:**
- Consumes: `CodeStreamSimulator`, Three.js `CanvasTexture`.
- Produces: `DeskMonitorGroup` with desk, chair, monitors, and procedural canvas texture display.

- [ ] **Step 1: Write failing test for desk monitor construction and texture updates**
- [ ] **Step 2: Run test to verify failure**
- [ ] **Step 3: Implement in-world desk monitor with 2D canvas terminal renderer & raycast selection**
- [ ] **Step 4: Run test to verify pass**
- [ ] **Step 5: Commit**

---

### Task 5: Integration, End-to-End Verification with Playwright, and Build

**Files:**
- Modify: `src/main.ts`
- Test: Browser verification on port 5657 using Playwright tools.

- [ ] **Step 1: Wire full application in `src/main.ts`**
- [ ] **Step 2: Run npm typecheck, npm test, and npm run build**
- [ ] **Step 3: Launch dev server on port 5657 and test all acceptance criteria in Playwright**
- [ ] **Step 4: Commit changes and prepare PR**
