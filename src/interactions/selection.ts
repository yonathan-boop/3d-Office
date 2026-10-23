import * as THREE from 'three';
import { OfficeWorkersManager } from '../scene/office-workers.ts';
import { WorkerAvatar } from '../scene/worker-avatar.ts';
import { OfficeCameraControls } from '../controls/camera.ts';
import { UIOverlay } from '../ui/overlay.ts';
import type { WorkerSelectedEventDetail, WorkerStatus } from '../types/index.ts';

export interface SelectionManagerOptions {
  workersManager: OfficeWorkersManager;
  canvas?: HTMLCanvasElement;
  camera?: THREE.Camera;
  cameraControls?: OfficeCameraControls;
  uiOverlay?: UIOverlay;
  onWorkerSelected?: (detail: WorkerSelectedEventDetail) => void;
  onWorkerDeselected?: () => void;
}

export class WorkerSelectionManager {
  public options: SelectionManagerOptions;
  public selectedWorker: WorkerAvatar | null = null;
  public hoveredWorker: WorkerAvatar | null = null;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private inspectionCardElement: HTMLElement | null = null;
  private unsubscribeStatusListener: (() => void) | null = null;

  constructor(options: SelectionManagerOptions) {
    this.options = options;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    this.bindEvents();
  }

  private bindEvents(): void {
    if (!this.options.canvas) return;

    this.options.canvas.addEventListener('pointermove', this.onPointerMove);
    this.options.canvas.addEventListener('click', this.onPointerClick);
  }

  public destroy(): void {
    if (this.options.canvas) {
      this.options.canvas.removeEventListener('pointermove', this.onPointerMove);
      this.options.canvas.removeEventListener('click', this.onPointerClick);
    }
    this.deselect();
  }

  private updatePointer(event: MouseEvent): void {
    if (!this.options.canvas) return;
    const rect = this.options.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getHitTargets(): THREE.Object3D[] {
    const targets: THREE.Object3D[] = [];
    for (const worker of this.options.workersManager.workers) {
      if (worker.hitBox) targets.push(worker.hitBox);
    }
    return targets;
  }

  private onPointerMove = (event: MouseEvent): void => {
    if (!this.options.camera) return;

    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.options.camera);

    const hits = this.raycaster.intersectObjects(this.getHitTargets(), false);

    if (hits.length > 0) {
      const hitObj = hits[0].object;
      const workerId = hitObj.userData.workerId as string;
      const worker = this.options.workersManager.getWorker(workerId);

      if (worker) {
        if (this.hoveredWorker !== worker) {
          // Unhighlight previous if not selected
          if (this.hoveredWorker && this.hoveredWorker !== this.selectedWorker) {
            const prevWs = this.options.workersManager.getWorkstationForWorker(this.hoveredWorker.id);
            if (prevWs) this.options.workersManager.highlightWorkstation(prevWs.id, false);
          }

          this.hoveredWorker = worker;
          const ws = this.options.workersManager.getWorkstationForWorker(worker.id);
          if (ws) this.options.workersManager.highlightWorkstation(ws.id, true);
        }

        if (typeof document !== 'undefined') {
          document.body.style.cursor = 'pointer';
        }
        return;
      }
    }

    // No hit
    if (this.hoveredWorker) {
      if (this.hoveredWorker !== this.selectedWorker) {
        const ws = this.options.workersManager.getWorkstationForWorker(this.hoveredWorker.id);
        if (ws) this.options.workersManager.highlightWorkstation(ws.id, false);
      }
      this.hoveredWorker = null;
      if (typeof document !== 'undefined') {
        document.body.style.cursor = 'default';
      }
    }
  };

  private onPointerClick = (event: MouseEvent): void => {
    if (!this.options.camera) return;

    this.updatePointer(event);
    this.raycaster.setFromCamera(this.pointer, this.options.camera);

    const hits = this.raycaster.intersectObjects(this.getHitTargets(), false);

    if (hits.length > 0) {
      const hitObj = hits[0].object;
      const workerId = hitObj.userData.workerId as string;
      this.selectWorker(workerId);
    } else {
      // Clicked on background or floor
      if (this.selectedWorker) {
        this.deselect();
      }
    }
  };

  public selectWorker(workerId: string): void {
    const worker = this.options.workersManager.getWorker(workerId);
    if (!worker) return;

    // Deselect previous worker if different
    if (this.selectedWorker && this.selectedWorker !== worker) {
      this.selectedWorker.setSelected(false);
      const prevWs = this.options.workersManager.getWorkstationForWorker(this.selectedWorker.id);
      if (prevWs) this.options.workersManager.highlightWorkstation(prevWs.id, false);
    }

    this.selectedWorker = worker;
    worker.setSelected(true);

    const ws = this.options.workersManager.getWorkstationForWorker(worker.id);
    if (ws) {
      this.options.workersManager.highlightWorkstation(ws.id, true);
    }

    // World position of worker for camera framing
    const worldPos = new THREE.Vector3();
    worker.hitBox.getWorldPosition(worldPos);

    if (this.options.cameraControls) {
      const wsConfig = ws ? ws.group.position : new THREE.Vector3();
      const isBackRow = wsConfig.z < 0;

      const cameraOffset = new THREE.Vector3(
        worldPos.x + 1.2,
        worldPos.y + 1.1,
        worldPos.z + (isBackRow ? -2.2 : 2.2)
      );
      this.options.cameraControls.focusOn(worldPos, cameraOffset);
    }

    // Show agent inspection card in UI
    this.renderInspectionCard(worker, ws?.id ?? '');

    // Dispatch event
    const detail: WorkerSelectedEventDetail = {
      workerId: worker.id,
      name: worker.state.name,
      role: worker.state.role,
      status: worker.state.status,
      currentTask: worker.state.stats.currentTask,
      stats: { ...worker.state.stats },
      workstationId: ws?.id ?? '',
      position: [worldPos.x, worldPos.y, worldPos.z],
    };

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('worker-selected', { detail }));
    }
    this.options.onWorkerSelected?.(detail);
  }

  public deselect(): void {
    if (!this.selectedWorker) return;

    this.selectedWorker.setSelected(false);
    const ws = this.options.workersManager.getWorkstationForWorker(this.selectedWorker.id);
    if (ws) {
      this.options.workersManager.highlightWorkstation(ws.id, false);
    }

    this.selectedWorker = null;
    this.removeInspectionCard();

    if (this.options.cameraControls) {
      this.options.cameraControls.resetView();
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('worker-deselected'));
    }
    this.options.onWorkerDeselected?.();
  }

  private renderInspectionCard(worker: WorkerAvatar, workstationId: string): void {
    if (typeof document === 'undefined') return;

    this.removeInspectionCard();

    const panels = this.options.uiOverlay?.getPanelsContainer() || document.body;
    const card = document.createElement('div');
    card.id = 'agent-inspection-card';
    card.className = 'agent-inspection-card hud-panel';

    const hexColor = `#${worker.state.accentColor.toString(16).padStart(6, '0')}`;
    const stats = worker.state.stats;

    card.innerHTML = `
      <div class="card-header" style="border-top: 3px solid ${hexColor};">
        <div class="card-identity">
          <div class="card-avatar-pill" style="background-color: ${hexColor};"></div>
          <div>
            <h3 class="card-name">${worker.state.name}</h3>
            <span class="card-role">${worker.state.role}</span>
          </div>
        </div>
        <div class="card-actions">
          <span id="card-status-badge" class="card-status status-${worker.state.status}">${worker.state.status.toUpperCase()}</span>
          <button id="card-close-btn" class="card-close" title="Close" aria-label="Close">✕</button>
        </div>
      </div>

      <div class="card-body">
        <div class="card-section">
          <span class="card-label">Active Task</span>
          <p id="card-task-desc" class="card-task">${stats.currentTask}</p>
        </div>

        <div class="card-stats-grid">
          <div class="stat-box">
            <span class="stat-num">${stats.tasksCompleted}</span>
            <span class="stat-name">Completed</span>
          </div>
          <div class="stat-box">
            <span class="stat-num">${stats.linesOfCode.toLocaleString()}</span>
            <span class="stat-name">Lines Code</span>
          </div>
          <div class="stat-box">
            <span id="card-cpu-val" class="stat-num">${stats.cpuUsage}%</span>
            <span class="stat-name">CPU Load</span>
          </div>
        </div>

        <div class="card-section">
          <span class="card-label">Set State</span>
          <div class="state-buttons">
            <button class="state-btn ${worker.state.status === 'coding' ? 'active' : ''}" data-state="coding">Coding</button>
            <button class="state-btn ${worker.state.status === 'reviewing' ? 'active' : ''}" data-state="reviewing">Reviewing</button>
            <button class="state-btn ${worker.state.status === 'idle' ? 'active' : ''}" data-state="idle">Idle</button>
          </div>
        </div>
      </div>

      <div class="card-footer">
        <span class="ws-tag">Workstation ${workstationId}</span>
      </div>
    `;

    // Hook up close button
    const closeBtn = card.querySelector('#card-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deselect();
      });
    }

    // Hook up state switcher buttons
    const stateBtns = card.querySelectorAll<HTMLButtonElement>('.state-btn');
    stateBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const nextStatus = btn.getAttribute('data-state') as WorkerStatus;
        if (nextStatus) {
          worker.state.setStatus(nextStatus);
          stateBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          const badge = card.querySelector('#card-status-badge');
          if (badge) {
            badge.textContent = nextStatus.toUpperCase();
            badge.className = `card-status status-${nextStatus}`;
          }
        }
      });
    });

    // Listen to external status changes
    if (this.unsubscribeStatusListener) {
      this.unsubscribeStatusListener();
    }
    this.unsubscribeStatusListener = worker.state.onStatusChange((status) => {
      const badge = card.querySelector('#card-status-badge');
      if (badge) {
        badge.textContent = status.toUpperCase();
        badge.className = `card-status status-${status}`;
      }
      stateBtns.forEach((b) => {
        if (b.getAttribute('data-state') === status) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });
    });

    panels.appendChild(card);
    this.inspectionCardElement = card;
  }

  private removeInspectionCard(): void {
    if (this.unsubscribeStatusListener) {
      this.unsubscribeStatusListener();
      this.unsubscribeStatusListener = null;
    }
    if (this.inspectionCardElement && this.inspectionCardElement.parentNode) {
      this.inspectionCardElement.parentNode.removeChild(this.inspectionCardElement);
      this.inspectionCardElement = null;
    }
  }
}
