# Manager Chat Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive, collapsible manager chat interface on the 3D HUD overlay with image attachment, clipboard paste, drag-and-drop, draft preview, message history, and lightbox modal.

**Architecture:** An event-driven `ChatStore` manages message history and dispatch. `ChatPanel` mounts onto `UIOverlay`, rendering message history, draft preview thumbnail, input controls with image picker (replacing mic), drag-and-drop and paste handlers, and a lightbox modal. Styling integrates with the existing dark HUD theme with non-blocking canvas pointer events.

**Tech Stack:** TypeScript, Three.js, Node test runner (`node:test`, `node:assert/strict`), Vite, Playwright.

**Spec:** Issue #7: Manager chat interface with image attachment & preview.

## Global Constraints

- Accept image types: PNG (`image/png`), JPG/JPEG (`image/jpeg`), WebP (`image/webp`), SVG (`image/svg+xml`).
- Support sending messages with text, image, or both. Reject messages with neither.
- Attached image must show preview thumbnail with remove button before sending.
- Sent images must render as thumbnails in chat history and open in full resolution in a lightbox modal on click.
- HUD must remain non-blocking for Three.js OrbitControls (`pointer-events: none` on overlay container, `pointer-events: auto` on interactive panel).
- TypeScript must compile with zero errors (`npm run typecheck`).
- Unit tests must run with `npm test`.

## Review Focus

1. Paste non-image data (plain text, HTML) into chat input: text pastes into input without error or attachment creation.
2. Drag and drop file of unsupported type (e.g. `.pdf`, `.exe`): ignored or rejected cleanly without throwing error or breaking draft state.
3. Rapid Enter press or multiple sends: message is dispatched once, draft attachment is cleared, input is cleared.
4. Canvas drag/rotation near chat panel: dragging outside chat panel rotates 3D scene; dragging inside chat panel interacts with chat, does not rotate 3D camera.
5. Large image data URL preview and lightbox: lightbox displays full resolution and can be dismissed via click or close button without stuck overlay.

---

### Task 1: Chat Types and Event-Driven ChatStore

**Files:**
- Modify: `src/types/index.ts`
- Create: `src/chat/store.ts`
- Create: `src/chat.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: none
- Produces:
  - `ChatAttachment`: `{ id: string; name: string; type: string; dataUrl: string; size?: number }`
  - `ChatMessage`: `{ id: string; sender: 'manager' | 'worker' | 'system'; senderName: string; text: string; attachment?: ChatAttachment; timestamp: number }`
  - `ChatStore`:
    - `getMessages(): ChatMessage[]`
    - `sendMessage(params: { text?: string; attachment?: ChatAttachment; sender?: 'manager' | 'worker' | 'system'; senderName?: string }): ChatMessage`
    - `subscribe(listener: (messages: ChatMessage[], newMsg?: ChatMessage) => void): () => void`
    - `isValidImageType(type: string): boolean`
    - `fileToAttachment(file: { name: string; type: string; size?: number }, readDataUrl: () => Promise<string>): Promise<ChatAttachment>`

- [ ] **Step 1: Write the failing tests in `src/chat.test.ts`**
- [ ] **Step 2: Run `npm test` to verify failure**
- [ ] **Step 3: Implement `src/types/index.ts` and `src/chat/store.ts`**
- [ ] **Step 4: Update `package.json` test script to run all tests (`node --test src/*.test.ts`)**
- [ ] **Step 5: Run `npm test` and `npm run typecheck` to verify pass**
- [ ] **Step 6: Commit**

---

### Task 2: Chat UI Component with Image Attachment, Preview, and Lightbox

**Files:**
- Create: `src/ui/chat.ts`
- Modify: `src/ui/overlay.ts`
- Modify: `src/style.css`

**Interfaces:**
- Consumes: `ChatStore`, `ChatMessage`, `ChatAttachment` from `src/chat/store.ts` and `src/types/index.ts`
- Produces:
  - `ChatPanel`:
    - `constructor(store: ChatStore)`
    - `mount(parent: HTMLElement): void`
    - `destroy(): void`
    - `toggleCollapse(): void`

- [ ] **Step 1: Implement `ChatPanel` DOM layout, input controls, file picker, drag-and-drop, clipboard paste, thumbnail preview, message feed, and lightbox modal**
- [ ] **Step 2: Add styles in `src/style.css` for chat panel, collapse toggle, thumbnails, draft preview, and lightbox**
- [ ] **Step 3: Mount `ChatPanel` in `UIOverlay` in `src/ui/overlay.ts`**
- [ ] **Step 4: Verify with `npm run typecheck` and `npm test`**
- [ ] **Step 5: Commit**

---

### Task 3: Interactive E2E Verification & Visual Inspection via Playwright

**Files:**
- Test via Playwright on port 5657
- Fix any UI/event propagation or responsiveness issues found

- [ ] **Step 1: Start dev server on port 5657 in background**
- [ ] **Step 2: Navigate Playwright browser to `http://localhost:5657` and take snapshot**
- [ ] **Step 3: Test chat interactions (expand/collapse, text send, image upload/preview/send, thumbnail click lightbox, dismiss lightbox)**
- [ ] **Step 4: Stop dev server**
- [ ] **Step 5: Commit any adjustments**
