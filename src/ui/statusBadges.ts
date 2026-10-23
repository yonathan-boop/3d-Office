import * as THREE from 'three';
import type { ActivityStatus, WorkerState } from '../types/index.ts';

const _projVector = new THREE.Vector3();

export function project3DToScreen(
  coords: [number, number, number],
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number
): { x: number; y: number } | null {
  _projVector.set(...coords);
  _projVector.project(camera);

  // If point is behind camera or beyond far plane, cull it
  if (_projVector.z > 1.0 || _projVector.z < -1.0) {
    return null;
  }

  const x = (_projVector.x * 0.5 + 0.5) * width;
  const y = (-_projVector.y * 0.5 + 0.5) * height;

  if (x < -80 || x > width + 80 || y < -80 || y > height + 80) {
    return null;
  }

  return { x, y };
}

export const STATUS_COLORS: Record<ActivityStatus, { bg: string; text: string; dot: string; label: string }> = {
  coding: { bg: 'rgba(14, 165, 233, 0.2)', text: '#38bdf8', dot: '#38bdf8', label: 'Coding' },
  reviewing: { bg: 'rgba(168, 85, 247, 0.2)', text: '#c084fc', dot: '#c084fc', label: 'Reviewing' },
  testing: { bg: 'rgba(16, 185, 129, 0.2)', text: '#34d399', dot: '#10b981', label: 'Testing' },
  idle: { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', dot: '#64748b', label: 'Idle' },
};

export class StatusBadgeOverlay {
  private container: HTMLElement | null = null;
  private badgeElements: Map<string, HTMLElement> = new Map();

  constructor(containerId: string = 'status-badges-overlay') {
    if (typeof document === 'undefined') return;

    let el = document.getElementById(containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = containerId;
      el.className = 'status-badges-overlay';
      const appEl = document.getElementById('app') || document.body;
      appEl.appendChild(el);
    }
    this.container = el;
  }

  public update(camera: THREE.PerspectiveCamera, workers: WorkerState[]): void {
    if (!this.container || typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    for (const worker of workers) {
      let badge = this.badgeElements.get(worker.id);
      if (!badge) {
        badge = this.createBadgeElement(worker);
        this.badgeElements.set(worker.id, badge);
        this.container.appendChild(badge);
      }

      // Height anchor: 0.65m above seated position
      const worldPos: [number, number, number] = [
        worker.position[0],
        worker.position[1] + 0.65,
        worker.position[2],
      ];

      const screenCoords = project3DToScreen(worldPos, camera, width, height);
      if (!screenCoords) {
        badge.style.display = 'none';
        continue;
      }

      badge.style.display = 'flex';
      badge.style.transform = `translate3d(${screenCoords.x}px, ${screenCoords.y}px, 0) translate(-50%, -100%)`;

      // Update badge contents if changed
      this.syncBadgeContent(badge, worker);
    }
  }

  private createBadgeElement(worker: WorkerState): HTMLElement {
    const el = document.createElement('div');
    el.id = `worker-badge-${worker.id}`;
    el.className = `worker-status-badge status-${worker.status}`;

    el.innerHTML = `
      <div class="badge-pill">
        <span class="badge-dot" style="background-color: ${STATUS_COLORS[worker.status].dot}"></span>
        <span class="badge-name">${worker.name}</span>
        <span class="badge-status-label">${STATUS_COLORS[worker.status].label}</span>
      </div>
      ${worker.currentTask ? `<div class="badge-task-hint">${worker.currentTask}</div>` : ''}
    `;

    return el;
  }

  private syncBadgeContent(badge: HTMLElement, worker: WorkerState): void {
    const currentStatus = badge.getAttribute('data-status');
    const currentTask = badge.getAttribute('data-task') || '';

    if (currentStatus !== worker.status || currentTask !== (worker.currentTask || '')) {
      badge.setAttribute('data-status', worker.status);
      badge.setAttribute('data-task', worker.currentTask || '');
      badge.className = `worker-status-badge status-${worker.status}`;

      const config = STATUS_COLORS[worker.status];
      badge.innerHTML = `
        <div class="badge-pill">
          <span class="badge-dot" style="background-color: ${config.dot}"></span>
          <span class="badge-name">${worker.name}</span>
          <span class="badge-status-label">${config.label}</span>
        </div>
        ${worker.currentTask ? `<div class="badge-task-hint">${worker.currentTask}</div>` : ''}
      `;
    }
  }

  public destroy(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.badgeElements.clear();
  }
}
