# Real-Time Activity Monitors & Office Status Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build real-time office activity monitors and office status dashboard HUD with 3D wall display, floating status badges, live activity feed ticker, and smooth camera navigation presets.

**Architecture:** A lightweight reactive `OfficeStateManager` manages worker states, KPIs, and milestone event feeds. The 3D office scene adds a large wall-mounted Command Display (`CommandWallScreen`) dynamically textured via HTML5 canvas. Screen-space floating status pills track 3D worker world positions via camera projection. The camera controls system gains smooth easing transitions across 4 preset viewpoints. A collapsible sidebar HUD component renders real-time activity streams and office KPI metrics.

**Tech Stack:** Three.js, TypeScript, Vite, CSS Grid/Flexbox, Node.js native test runner (`node --test`).

**Spec:** GitHub Issue #4 (Real-time activity monitors & office status dashboard).

## Global Constraints

- No unrequested dependencies; use Three.js and native DOM/Canvas APIs already present.
- Target fluid 60 FPS performance with zero WebGL or memory leaks.
- Camera preset transitions must interpolate smoothly (no jarring teleports).
- Floating status badges must track camera pan/zoom/rotate in real time and hide when behind the camera view frustum.
- HUD components must adapt cleanly to different viewport sizes without blocking core 3D scene interactions (`pointer-events: none` on overlays, `pointer-events: auto` on interactive cards).

## Review Focus

- Camera preset transition interrupted mid-flight: should smoothly re-target without snapping or freezing.
- Window resize during active camera animation: aspect ratio and projected badge coordinates update without drift.
- Rapid activity feed additions: maintain max backlog limit (e.g., 50 events) to prevent DOM bloat or memory leak.
- Canvas texture updates on 3D wall monitor: throttle texture upload (`needsUpdate = true`) to avoid GPU stutter.
- Off-screen or behind-frustum badge projection: correctly cull badges where `z > 1.0` or out of bounds so they don't mirror on screen.

---

### Task 1: Office State & KPI Data Model

**Files:**
- Create: `src/state/officeState.ts`
- Modify: `src/types/index.ts`
- Test: `src/state/officeState.test.ts`

**Interfaces:**
- Produces: `OfficeStateManager`, `WorkerState`, `OfficeKPIs`, `ActivityEvent`, `ActivityStatus`
- Consumes: `src/types/index.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/state/officeState.test.ts` testing state initialization, worker status updates, KPI recalculation (active vs idle workers, in-progress tasks, throughput), and activity event emissions.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/state/officeState.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `OfficeStateManager` and types**

Implement in `src/state/officeState.ts` with initial mock workers (Ada, Linus, Grace, Alan) placed at Dev Pods, milestone event generation, and listener subscriptions.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/state/officeState.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/types/index.ts src/state/officeState.ts src/state/officeState.test.ts
git commit -m "feat: add office state manager and real-time KPI models"
```

---

### Task 2: 3D Command Wall Display Screen

**Files:**
- Create: `src/scene/commandWall.ts`
- Modify: `src/scene/room.ts`
- Modify: `src/main.ts`
- Test: `src/scene/commandWall.test.ts`

**Interfaces:**
- Produces: `CommandWallScreen` class with `group: THREE.Group`, `update(kpis, events): void`
- Consumes: `OfficeKPIs`, `ActivityEvent` from `src/state/officeState.ts`

- [ ] **Step 1: Write the failing unit test**

Create `src/scene/commandWall.test.ts` testing `CommandWallScreen` mesh creation, dimensions, materials, and canvas update lifecycle.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/scene/commandWall.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement `CommandWallScreen`**

Build wall screen mesh mounted on back wall (`x = 0, y = 2.4, z = -7.92`), display bezel, glass glow border, and procedural 2D canvas texture rendering aggregated company KPIs, velocity sparkline, and recent milestone ticker.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/scene/commandWall.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/scene/commandWall.ts src/scene/commandWall.test.ts src/scene/room.ts src/main.ts
git commit -m "feat: add 3D wall-mounted command screen with real-time aggregated metrics"
```

---

### Task 3: Smooth Camera Presets Navigation

**Files:**
- Modify: `src/controls/camera.ts`
- Modify: `src/types/index.ts`
- Test: `src/controls/camera.test.ts`

**Interfaces:**
- Produces: `OfficeCameraControls.transitionTo(preset: CameraPresetName): void`, `CameraPresetName` ('overview' | 'devPod1' | 'devPod2' | 'commandWall')
- Consumes: `OrbitControls`

- [ ] **Step 1: Write the failing unit test**

Create `src/controls/camera.test.ts` verifying predefined presets exist and transition interpolator updates target and camera position smoothly over time.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test src/controls/camera.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement camera preset transitions**

Add easing interpolation (cubic smoothstep) to `OfficeCameraControls` updating `camera.position` and `controls.target` across frames in `update()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test src/controls/camera.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/controls/camera.ts src/controls/camera.test.ts
git commit -m "feat: implement smooth camera preset navigation transitions"
```

---

### Task 4: In-World Floating Status Badges & Workstation Anchors

**Files:**
- Create: `src/ui/statusBadges.ts`
- Modify: `src/style.css`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: `StatusBadgeOverlay` tracking worker world positions and rendering floating badges
- Consumes: `WorkerState[]`, `THREE.PerspectiveCamera`

- [ ] **Step 1: Implement `StatusBadgeOverlay`**

Creates DOM pills above each worker anchor with activity status colors (`Idle`, `Coding`, `Reviewing`, `Testing`). On each frame, projects 3D world coordinates to 2D viewport coordinates using `Vector3.project(camera)`. Hides badges outside viewport or behind camera (`z > 1`).

- [ ] **Step 2: Style status badges in `src/style.css`**

Add sleek pill styles with pulsing status indicator dots, worker names, and subtle backdrop blur.

- [ ] **Step 3: Integrate with render loop in `src/main.ts`**

Update badge positions every frame during `animate()`.

- [ ] **Step 4: Commit**

```bash
git add src/ui/statusBadges.ts src/style.css src/main.ts
git commit -m "feat: add in-world floating status badges tracking workers"
```

---

### Task 5: Activity Feed Ticker & Office Status Dashboard HUD

**Files:**
- Modify: `src/ui/overlay.ts`
- Modify: `src/style.css`
- Modify: `src/main.ts`

**Interfaces:**
- Produces: Real-time collapsible activity feed ticker, KPI stat bar, preset navigation toolbar
- Consumes: `OfficeStateManager`, `OfficeCameraControls`

- [ ] **Step 1: Expand `UIOverlay`**

Add KPI metric items (Active, Idle, In Progress, Throughput/hr, FPS).
Add Camera View Presets switcher buttons (`Overview`, `Dev Pod 1`, `Dev Pod 2`, `Command Wall`).
Add collapsible Activity Stream sidebar on the right edge with real-time milestone events and toggle button.

- [ ] **Step 2: Enhance CSS for HUD components**

Responsive layout, collapsible stream panel animation, glassmorphism styles, clean accessibility and non-blocking pointer events.

- [ ] **Step 3: Connect `OfficeStateManager` and simulated milestones in `src/main.ts`**

Wire event listener, update HUD metrics dynamically, and periodically trigger realistic milestone events and worker status transitions.

- [ ] **Step 4: Commit**

```bash
git add src/ui/overlay.ts src/style.css src/main.ts
git commit -m "feat: add collapsible activity feed ticker and full status dashboard HUD"
```

---

### Task 6: Verification, Playwright E2E Inspection & PR

**Files:**
- Modify: `package.json` (ensure `npm test` runs all tests)
- Verification: run dev server on port 5515, inspect via Playwright tools, take screenshots.

- [ ] **Step 1: Run all unit tests and typecheck**

Run: `npm test && npm run typecheck && npm run build`
Verify all pass cleanly.

- [ ] **Step 2: Start dev server on port 5515 and verify with Playwright**

Start vite dev server on port 5515, navigate with `mcp__playwright__browser_navigate`, snapshot and screenshot HUD, presets, wall display, and badges.

- [ ] **Step 3: Push branch and create PR**

Push to `origin/swarm/issue-4-alan` and run `gh pr create` with "Closes #4".
