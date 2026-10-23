# AI Coding Worker Avatars & Workstations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the 3D office with developer workstations and animated AI coding worker avatars with raycast selection, status management, and agent inspection cards.

**Architecture:** Procedural Three.js workstation meshes (desks, dual monitors, chairs, towers, peripherals) placed in pod layouts. Procedural stylized AI worker avatars with hierarchical limb groups for idle/typing/reviewing animations. Raycasting interaction manager handling hover highlight, click selection, smooth camera transitions, and DOM-based agent inspection card.

**Tech Stack:** Three.js, TypeScript, Vite, node:test, HTML5 Canvas.

**Spec:** GitHub Issue #2 (AI coding worker avatars & workstations).

## Global Constraints
- Target frame rate: >50 FPS on modern displays.
- Zero external 3D asset dependencies (all procedural geometry & canvas textures).
- Strict clearance between overlapping meshes to eliminate z-fighting.
- DOM and Three.js event listeners cleaned up properly on disposal.

## Review Focus
- Raycasting performance: Raycast only against interactive bounding boxes / hit meshes, not all child geometries.
- Z-fighting on desk items and monitors: Maintain >=0.005 distance between coplanar faces.
- Camera transition damping: Smoothly frame selected worker without snapping or disorientation.
- Worker status transitions: Cleanly blend/switch between typing and idle limb oscillations.
- Event dispatch: Dispatched `worker-selected` CustomEvent must contain full agent payload.

---

### Task 1: Data Types & Worker State Model

**Files:**
- Modify: `src/types/index.ts`
- Test: `src/workers.test.ts`

**Interfaces:**
- Consumes: Existing types in `src/types/index.ts`
- Produces: `WorkerStatus`, `WorkerConfig`, `WorkerState`, `WorkstationConfig`

- [ ] **Step 1: Write the failing test in `src/workers.test.ts` for worker state model and status transitions.**
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement worker types and state model in `src/types/index.ts` and `src/scene/worker-state.ts`.**
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit.**

---

### Task 2: Workstation 3D Mesh Generator

**Files:**
- Create: `src/scene/workstation.ts`
- Test: `src/workers.test.ts`

**Interfaces:**
- Consumes: `WorkstationConfig` from `src/types/index.ts`
- Produces: `Workstation` class with `group`, desk, dual monitors, chair, tower, keyboard, mouse, and hit detection mesh.

- [ ] **Step 1: Write test in `src/workers.test.ts` for `Workstation` construction and hierarchy.**
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement `Workstation` in `src/scene/workstation.ts`.**
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit.**

---

### Task 3: AI Worker Avatar Model & Procedural Animation

**Files:**
- Create: `src/scene/worker-avatar.ts`
- Test: `src/workers.test.ts`

**Interfaces:**
- Consumes: `WorkerConfig` from `src/types/index.ts`
- Produces: `WorkerAvatar` class with seated limbs, nameplate sprite/texture, and `update(delta: number)` method driving idle/typing/reviewing animations.

- [ ] **Step 1: Write test in `src/workers.test.ts` for `WorkerAvatar` hierarchy, status changes, and animation updates.**
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement `WorkerAvatar` in `src/scene/worker-avatar.ts`.**
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit.**

---

### Task 4: Office Pod Arrangement & Worker Manager

**Files:**
- Create: `src/scene/office-workers.ts`
- Modify: `src/main.ts`
- Test: `src/workers.test.ts`

**Interfaces:**
- Consumes: `Workstation`, `WorkerAvatar`
- Produces: `OfficeWorkersManager` coordinating workstations and avatars in office pods, providing status updates and frame loops.

- [ ] **Step 1: Write test for `OfficeWorkersManager` instantiating pods and finding workers by id.**
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement `OfficeWorkersManager` in `src/scene/office-workers.ts` and wire into `src/main.ts`.**
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit.**

---

### Task 5: Raycasting Interaction, Highlight, Camera Focus & Inspection Card

**Files:**
- Create: `src/interactions/selection.ts`
- Modify: `src/controls/camera.ts`
- Modify: `src/ui/overlay.ts`
- Modify: `src/style.css`
- Modify: `src/main.ts`
- Test: `src/workers.test.ts`

**Interfaces:**
- Consumes: Three.js `Raycaster`, `OfficeWorkersManager`, `OfficeCameraControls`, `UIOverlay`
- Produces: `WorkerSelectionManager` handling hover highlight, click selection, camera focus interpolation, and inspection card UI.

- [ ] **Step 1: Write test for selection manager selection events and state.**
- [ ] **Step 2: Run test to verify it fails.**
- [ ] **Step 3: Implement interaction manager, camera target interpolation, and inspection card UI.**
- [ ] **Step 4: Run test to verify it passes.**
- [ ] **Step 5: Commit.**

---

### Task 6: Visual Verification & End-to-End Testing with Playwright

**Files:**
- Verify: Run dev server on port 5202
- Verify: Playwright browser tools navigate, hover, click, snapshot, screenshot.
- Verify: No console errors, 60 FPS, correct event dispatching.
- Stop dev server and finalize.
