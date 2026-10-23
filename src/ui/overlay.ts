import type { ActivityEvent, CameraPresetName, HUDState, OfficeKPIs } from '../types/index.ts';
import { ChatStore } from '../chat/store.ts';
import { ChatPanel } from './chat.ts';

export function formatEventTime(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export class UIOverlay {
  private container: HTMLElement | null = null;
  private fpsElement: HTMLElement | null = null;
  private activeWorkersElement: HTMLElement | null = null;
  private idleWorkersElement: HTMLElement | null = null;
  private tasksElement: HTMLElement | null = null;
  private throughputElement: HTMLElement | null = null;
  private presetButtons: Map<CameraPresetName, HTMLElement> = new Map();
  private activityPanel: HTMLElement | null = null;
  private activityList: HTMLElement | null = null;
  private countBadge: HTMLElement | null = null;
  private feedToggleBtn: HTMLElement | null = null;
  private isFeedOpen: boolean = true;

  public onPresetSelect?: (preset: CameraPresetName) => void;

  public chatStore!: ChatStore;
  public chatPanel!: ChatPanel;

  constructor(containerId: string = 'ui-overlay', chatStore?: ChatStore) {
    if (typeof document === 'undefined') return;

    const el = document.getElementById(containerId);
    if (!el) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      this.container.className = 'ui-overlay';
      document.body.appendChild(this.container);
    } else {
      this.container = el;
    }

    this.chatStore = chatStore || new ChatStore();
    this.render();

    const panelsContainer = this.getPanelsContainer() || this.container;
    this.chatPanel = new ChatPanel(this.chatStore);
    this.chatPanel.mount(panelsContainer);
  }

  private render(): void {
    if (!this.container) return;

    this.container.innerHTML = `
      <header class="hud-header">
        <div class="hud-brand">
          <span class="hud-dot online"></span>
          <span class="hud-title">3D Virtual Office</span>
          <span class="hud-badge">v0.1.0</span>
        </div>

        <nav class="camera-presets-nav" role="toolbar" aria-label="Camera Presets">
          <span class="nav-label">VIEWS</span>
          <button class="camera-preset-btn active" data-preset="overview">Overview</button>
          <button class="camera-preset-btn" data-preset="devPod1">Dev Pod 1</button>
          <button class="camera-preset-btn" data-preset="devPod2">Dev Pod 2</button>
          <button class="camera-preset-btn" data-preset="commandWall">Command Wall</button>
        </nav>

        <div class="hud-metrics">
          <div class="metric-item">
            <span class="metric-label">ACTIVE</span>
            <span id="kpi-active" class="metric-val text-cyan">3</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">IDLE</span>
            <span id="kpi-idle" class="metric-val text-amber">1</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">TASKS</span>
            <span id="kpi-tasks" class="metric-val text-purple">3</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">THROUGHPUT</span>
            <span id="kpi-throughput" class="metric-val text-emerald">18/hr</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">FPS</span>
            <span id="hud-fps" class="metric-val">60</span>
          </div>
          <button id="feed-toggle-btn" class="feed-toggle-btn active" title="Toggle Activity Feed">
            <span class="feed-icon">⚡</span> Feed
          </button>
        </div>
      </header>

      <div id="hud-panels" class="hud-panels">
        <!-- Floating or side panels mount here -->
        <aside id="activity-feed-panel" class="activity-feed-panel">
          <div class="feed-header">
            <div class="feed-title-wrap">
              <span class="feed-live-dot"></span>
              <span class="feed-title">Activity Stream</span>
              <span id="feed-count-badge" class="feed-count-badge">4</span>
            </div>
            <button id="feed-collapse-btn" class="feed-close-btn" aria-label="Collapse feed" title="Collapse stream">&times;</button>
          </div>
          <div id="activity-feed-list" class="activity-feed-list"></div>
        </aside>
      </div>

      <footer class="hud-footer">
        <div class="hud-controls-hint">
          <span><kbd>L-Click</kbd> Rotate</span>
          <span><kbd>R-Click</kbd> Pan</span>
          <span><kbd>Scroll</kbd> Zoom</span>
        </div>
      </footer>
    `;

    this.fpsElement = document.getElementById('hud-fps');
    this.activeWorkersElement = document.getElementById('kpi-active');
    this.idleWorkersElement = document.getElementById('kpi-idle');
    this.tasksElement = document.getElementById('kpi-tasks');
    this.throughputElement = document.getElementById('kpi-throughput');
    this.activityPanel = document.getElementById('activity-feed-panel');
    this.activityList = document.getElementById('activity-feed-list');
    this.countBadge = document.getElementById('feed-count-badge');
    this.feedToggleBtn = document.getElementById('feed-toggle-btn');

    // Wire camera preset buttons
    const presetNames: CameraPresetName[] = ['overview', 'devPod1', 'devPod2', 'commandWall'];
    presetNames.forEach((preset) => {
      const btn = this.container?.querySelector(`[data-preset="${preset}"]`) as HTMLElement;
      if (btn) {
        this.presetButtons.set(preset, btn);
        btn.addEventListener('click', () => {
          this.setActivePreset(preset);
          if (this.onPresetSelect) {
            this.onPresetSelect(preset);
          }
        });
      }
    });

    // Wire feed collapse/toggle
    if (this.feedToggleBtn) {
      this.feedToggleBtn.addEventListener('click', () => {
        this.toggleActivityFeed();
      });
    }

    const collapseBtn = document.getElementById('feed-collapse-btn');
    if (collapseBtn) {
      collapseBtn.addEventListener('click', () => {
        this.toggleActivityFeed(false);
      });
    }
  }

  public setActivePreset(preset: CameraPresetName): void {
    this.presetButtons.forEach((btn, name) => {
      if (name === preset) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  public updateKPIs(kpis: OfficeKPIs): void {
    if (this.activeWorkersElement) {
      this.activeWorkersElement.textContent = kpis.activeWorkers.toString();
    }
    if (this.idleWorkersElement) {
      this.idleWorkersElement.textContent = kpis.idleWorkers.toString();
    }
    if (this.tasksElement) {
      this.tasksElement.textContent = kpis.tasksInProgress.toString();
    }
    if (this.throughputElement) {
      this.throughputElement.textContent = `${kpis.commitsPerHour}/hr`;
    }
    if (this.fpsElement) {
      this.fpsElement.textContent = Math.round(kpis.fps).toString();
    }
  }

  public update(state: Partial<HUDState>): void {
    if (state.fps !== undefined && this.fpsElement) {
      this.fpsElement.textContent = Math.round(state.fps).toString();
    }
    if (state.kpis) {
      this.updateKPIs(state.kpis);
    }
  }

  public setActivityEvents(events: ActivityEvent[]): void {
    if (!this.activityList) return;
    this.activityList.innerHTML = '';
    events.forEach((evt) => this.renderEventItem(evt, false));
    if (this.countBadge) {
      this.countBadge.textContent = events.length.toString();
    }
  }

  public addActivityEvent(event: ActivityEvent): void {
    this.renderEventItem(event, true);
    if (this.countBadge && this.activityList) {
      this.countBadge.textContent = this.activityList.children.length.toString();
    }
  }

  private renderEventItem(event: ActivityEvent, prepend: boolean = true): void {
    if (!this.activityList) return;

    const item = document.createElement('div');
    item.className = `activity-item type-${event.type}`;

    const typeTag =
      event.type === 'pr_merged'
        ? 'PR MERGED'
        : event.type === 'task_started'
        ? 'TASK'
        : event.type === 'build_passed'
        ? 'BUILD'
        : event.type === 'review_completed'
        ? 'REVIEW'
        : 'TEST';

    item.innerHTML = `
      <div class="activity-item-header">
        <span class="activity-time">${formatEventTime(event.timestamp)}</span>
        <span class="activity-type-tag">${typeTag}</span>
      </div>
      <div class="activity-item-body">
        <strong class="activity-worker">${event.workerName}</strong>
        <span class="activity-action">${event.action}</span>
      </div>
    `;

    if (prepend && this.activityList.firstChild) {
      this.activityList.insertBefore(item, this.activityList.firstChild);
    } else {
      this.activityList.appendChild(item);
    }
  }

  public toggleActivityFeed(open?: boolean): boolean {
    if (open !== undefined) {
      this.isFeedOpen = open;
    } else {
      this.isFeedOpen = !this.isFeedOpen;
    }

    if (this.activityPanel) {
      if (this.isFeedOpen) {
        this.activityPanel.classList.remove('collapsed');
      } else {
        this.activityPanel.classList.add('collapsed');
      }
    }

    if (this.feedToggleBtn) {
      if (this.isFeedOpen) {
        this.feedToggleBtn.classList.add('active');
      } else {
        this.feedToggleBtn.classList.remove('active');
      }
    }

    return this.isFeedOpen;
  }

  public getPanelsContainer(): HTMLElement | null {
    return document.getElementById('hud-panels');
  }
}
