import type { TerminalLine } from '../types/index.ts';
import { WorkerStateStore, workerStore } from '../state/workerState.ts';
import { CodeStreamSimulator, codeSimulator } from '../simulator/codeStreamSimulator.ts';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatTerminalLine(line: TerminalLine): string {
  const safeText = escapeHtml(line.text);
  const time = new Date(line.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return `<div class="term-line line-${line.type}" data-id="${line.id}">
    <span class="line-time">${time}</span>
    <span class="line-content">${safeText}</span>
  </div>`;
}

export interface TerminalOverlayOptions {
  store?: WorkerStateStore;
  simulator?: CodeStreamSimulator;
  container?: HTMLElement | string;
  onModeToggle?: (mode: 'overlay' | 'in-world') => void;
}

export class TerminalOverlay {
  private store: WorkerStateStore;
  private simulator: CodeStreamSimulator;
  private rootElement: HTMLElement | null = null;
  private scrollArea: HTMLElement | null = null;
  private tabsContainer: HTMLElement | null = null;
  private statusLineElement: HTMLElement | null = null;
  private minimizedPill: HTMLElement | null = null;

  private activeWorkerId: string;
  private autoScroll: boolean = true;
  private minimized: boolean = false;
  private maximized: boolean = false;
  private displayMode: 'overlay' | 'in-world' = 'overlay';

  private unsubscribeStoreSelect: (() => void) | null = null;
  private unsubscribeStoreStatus: (() => void) | null = null;
  private unsubscribeSimulator: (() => void) | null = null;
  private onModeToggleCallback?: (mode: 'overlay' | 'in-world') => void;

  constructor(options: TerminalOverlayOptions = {}) {
    this.store = options.store || workerStore;
    this.simulator = options.simulator || codeSimulator;
    this.activeWorkerId = this.store.getSelectedWorker()?.id || 'ada';
    this.onModeToggleCallback = options.onModeToggle;

    if (typeof document !== 'undefined') {
      let targetContainer: HTMLElement | null = null;
      if (typeof options.container === 'string') {
        targetContainer = document.getElementById(options.container);
      } else if (options.container) {
        targetContainer = options.container;
      }

      if (!targetContainer) {
        targetContainer = document.getElementById('hud-panels');
        if (!targetContainer) {
          targetContainer = document.body;
        }
      }

      this.initDom(targetContainer);
    }

    // Subscribe to state changes
    this.unsubscribeStoreSelect = this.store.onWorkerSelect((worker) => {
      this.setActiveWorker(worker.id, false);
    });

    this.unsubscribeStoreStatus = this.store.onWorkerStatusChange(() => {
      this.renderTabs();
      this.updateStatusLine();
    });

    this.unsubscribeSimulator = this.simulator.onAnyLine((workerId, line) => {
      if (workerId === this.activeWorkerId) {
        this.appendLine(line);
      }
      this.updateStatusLine();
    });
  }

  private initDom(container: HTMLElement): void {
    const wrapper = document.createElement('div');
    wrapper.id = 'worker-terminal-panel';
    wrapper.className = 'terminal-window hud-panel';
    wrapper.innerHTML = `
      <div class="terminal-header">
        <div class="terminal-traffic-lights">
          <button class="t-btn btn-close" title="Hide/Close" aria-label="Close"></button>
          <button class="t-btn btn-minimize" title="Minimize" aria-label="Minimize"></button>
          <button class="t-btn btn-maximize" title="Maximize" aria-label="Maximize"></button>
        </div>

        <div class="terminal-tabs" id="terminal-tabs-list">
          <!-- Worker switcher tabs rendered dynamically -->
        </div>

        <div class="terminal-actions">
          <button id="btn-term-mode" class="term-action-btn" title="Toggle overlay vs in-world 3D monitor">
            <span class="icon">🖥️</span> <span class="label">Overlay</span>
          </button>
          <button id="btn-term-autoscroll" class="term-action-btn active" title="Toggle Auto-Scroll Lock">
            <span class="icon">📜</span> <span class="label">Scroll Lock</span>
          </button>
          <button id="btn-term-pause" class="term-action-btn" title="Pause / Resume Live Code Stream">
            <span class="icon">⏸️</span>
          </button>
          <button id="btn-term-clear" class="term-action-btn" title="Clear Terminal Buffer">
            <span class="icon">🗑️</span>
          </button>
          <button id="btn-term-max" class="term-action-btn" title="Maximize / Restore">
            <span class="icon">⛶</span>
          </button>
        </div>
      </div>

      <div class="terminal-body" id="terminal-body-area">
        <div class="terminal-scroll-area" id="terminal-scroll-area"></div>
        <div class="terminal-input-prompt">
          <span class="prompt-user">cubefarm</span><span class="prompt-sep">:</span><span class="prompt-path">~/office</span><span class="prompt-sym">$</span>
          <span class="prompt-text"></span>
          <span class="prompt-cursor">█</span>
        </div>
      </div>

      <div class="terminal-status-line" id="terminal-status-line">
        <!-- Rendered dynamically -->
      </div>
    `;

    container.appendChild(wrapper);
    this.rootElement = wrapper;
    this.scrollArea = wrapper.querySelector('#terminal-scroll-area');
    this.tabsContainer = wrapper.querySelector('#terminal-tabs-list');
    this.statusLineElement = wrapper.querySelector('#terminal-status-line');

    // Create floating minimized pill dock
    const pill = document.createElement('div');
    pill.id = 'terminal-minimized-pill';
    pill.className = 'terminal-minimized-pill hidden';
    pill.innerHTML = `
      <span class="pill-dot online"></span>
      <span class="pill-title">&gt;_ Live Terminal</span>
      <span class="pill-worker" id="pill-worker-badge">@ada</span>
      <button class="pill-restore-btn" title="Restore Terminal">Restore ❐</button>
    `;
    document.body.appendChild(pill);
    this.minimizedPill = pill;

    this.bindEvents();
    this.renderTabs();
    this.renderCurrentBuffer();
    this.updateStatusLine();
  }

  private bindEvents(): void {
    if (!this.rootElement) return;

    // Traffic light buttons
    this.rootElement.querySelector('.btn-close')?.addEventListener('click', () => {
      this.toggleMinimize();
    });
    this.rootElement.querySelector('.btn-minimize')?.addEventListener('click', () => {
      this.toggleMinimize();
    });
    this.rootElement.querySelector('.btn-maximize')?.addEventListener('click', () => {
      this.toggleMaximize();
    });

    // Minimized pill restore click
    this.minimizedPill?.addEventListener('click', () => {
      this.toggleMinimize();
    });

    // Action buttons
    const btnAutoScroll = this.rootElement.querySelector('#btn-term-autoscroll');
    btnAutoScroll?.addEventListener('click', () => {
      this.toggleAutoScroll();
    });

    const btnClear = this.rootElement.querySelector('#btn-term-clear');
    btnClear?.addEventListener('click', () => {
      this.clearCurrent();
    });

    const btnPause = this.rootElement.querySelector('#btn-term-pause');
    btnPause?.addEventListener('click', () => {
      const isPaused = this.simulator.togglePause();
      if (btnPause) {
        btnPause.innerHTML = isPaused ? '<span class="icon">▶️</span>' : '<span class="icon">⏸️</span>';
        btnPause.classList.toggle('active', isPaused);
      }
      this.updateStatusLine();
    });

    const btnMax = this.rootElement.querySelector('#btn-term-max');
    btnMax?.addEventListener('click', () => {
      this.toggleMaximize();
    });

    const btnMode = this.rootElement.querySelector('#btn-term-mode');
    btnMode?.addEventListener('click', () => {
      this.toggleDisplayMode();
    });

    // Manual scroll listener: unlock auto-scroll when user scrolls upwards
    if (this.scrollArea) {
      this.scrollArea.addEventListener('scroll', () => {
        if (!this.scrollArea) return;
        const threshold = 30;
        const atBottom =
          this.scrollArea.scrollHeight - this.scrollArea.scrollTop - this.scrollArea.clientHeight <= threshold;

        if (!atBottom && this.autoScroll) {
          this.autoScroll = false;
          this.updateAutoScrollButton();
          this.updateStatusLine();
        } else if (atBottom && !this.autoScroll) {
          this.autoScroll = true;
          this.updateAutoScrollButton();
          this.updateStatusLine();
        }
      });
    }
  }

  public renderTabs(): void {
    if (!this.tabsContainer) return;
    const workers = this.store.getWorkers();

    this.tabsContainer.innerHTML = workers
      .map((w) => {
        const isActive = w.id === this.activeWorkerId;
        return `
          <button class="term-tab ${isActive ? 'active' : ''}" data-worker="${w.id}" title="${w.name}: ${w.role}">
            <span class="tab-dot status-${w.status}"></span>
            <span class="tab-label">${w.name}</span>
            <span class="tab-badge">${w.status}</span>
          </button>
        `;
      })
      .join('');

    // Bind tab clicks
    const tabButtons = this.tabsContainer.querySelectorAll('.term-tab');
    tabButtons.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const target = (e.currentTarget as HTMLElement).dataset.worker;
        if (target) {
          this.setActiveWorker(target);
        }
      });
    });
  }

  public renderCurrentBuffer(): void {
    if (!this.scrollArea) return;
    const lines = this.simulator.getLines(this.activeWorkerId);
    this.scrollArea.innerHTML = lines.map((l) => formatTerminalLine(l)).join('');
    this.scrollToBottom();
  }

  public appendLine(line: TerminalLine): void {
    if (!this.scrollArea) return;
    const lineHtml = formatTerminalLine(line);
    this.scrollArea.insertAdjacentHTML('beforeend', lineHtml);

    // Keep DOM line elements bounded to match buffer limit
    while (this.scrollArea.children.length > 300) {
      this.scrollArea.firstElementChild?.remove();
    }

    if (this.autoScroll) {
      this.scrollToBottom();
    }
  }

  public scrollToBottom(): void {
    if (this.scrollArea) {
      this.scrollArea.scrollTop = this.scrollArea.scrollHeight;
    }
  }

  public setActiveWorker(workerId: string, dispatchStore: boolean = true): void {
    if (this.activeWorkerId === workerId) return;
    this.activeWorkerId = workerId;

    if (dispatchStore) {
      this.store.selectWorker(workerId);
    }

    this.renderTabs();
    this.renderCurrentBuffer();
    this.updateStatusLine();

    // Update minimized pill badge
    if (typeof document !== 'undefined') {
      const badge = document.getElementById('pill-worker-badge');
      if (badge) {
        badge.textContent = `@${workerId}`;
      }
    }
  }

  public getActiveWorkerId(): string {
    return this.activeWorkerId;
  }

  public toggleAutoScroll(): boolean {
    this.autoScroll = !this.autoScroll;
    this.updateAutoScrollButton();
    if (this.autoScroll) {
      this.scrollToBottom();
    }
    this.updateStatusLine();
    return this.autoScroll;
  }

  public isAutoScroll(): boolean {
    return this.autoScroll;
  }

  private updateAutoScrollButton(): void {
    const btn = this.rootElement?.querySelector('#btn-term-autoscroll');
    if (btn) {
      btn.classList.toggle('active', this.autoScroll);
      const label = btn.querySelector('.label');
      if (label) {
        label.textContent = this.autoScroll ? 'Scroll Lock' : 'Unlock';
      }
    }
  }

  public toggleMinimize(): boolean {
    this.minimized = !this.minimized;
    if (this.rootElement) {
      this.rootElement.classList.toggle('minimized', this.minimized);
    }
    if (this.minimizedPill) {
      this.minimizedPill.classList.toggle('hidden', !this.minimized);
    }
    return this.minimized;
  }

  public isMinimized(): boolean {
    return this.minimized;
  }

  public toggleMaximize(): boolean {
    this.maximized = !this.maximized;
    if (this.rootElement) {
      this.rootElement.classList.toggle('maximized', this.maximized);
      const btn = this.rootElement.querySelector('#btn-term-max .icon');
      if (btn) {
        btn.textContent = this.maximized ? '❐' : '⛶';
      }
    }
    return this.maximized;
  }

  public isMaximized(): boolean {
    return this.maximized;
  }

  public toggleDisplayMode(): 'overlay' | 'in-world' {
    this.displayMode = this.displayMode === 'overlay' ? 'in-world' : 'overlay';
    const btnMode = this.rootElement?.querySelector('#btn-term-mode');
    if (btnMode) {
      const icon = btnMode.querySelector('.icon');
      const label = btnMode.querySelector('.label');
      if (this.displayMode === 'in-world') {
        if (icon) icon.textContent = '🏢';
        if (label) label.textContent = '3D Desk';
        btnMode.classList.add('mode-in-world');
      } else {
        if (icon) icon.textContent = '🖥️';
        if (label) label.textContent = 'Overlay';
        btnMode.classList.remove('mode-in-world');
      }
    }

    if (this.onModeToggleCallback) {
      this.onModeToggleCallback(this.displayMode);
    }

    return this.displayMode;
  }

  public getDisplayMode(): 'overlay' | 'in-world' {
    return this.displayMode;
  }

  public clearCurrent(): void {
    this.simulator.clear(this.activeWorkerId);
    if (this.scrollArea) {
      this.scrollArea.innerHTML = '';
    }
    this.updateStatusLine();
  }

  public updateStatusLine(): void {
    if (!this.statusLineElement) return;

    const worker = this.store.getWorker(this.activeWorkerId);
    const lines = this.simulator.getLines(this.activeWorkerId);
    const isPaused = this.simulator.isPaused();

    this.statusLineElement.innerHTML = `
      <div class="status-left">
        <span class="status-worker-badge" style="color: ${worker?.avatarColor || '#38bdf8'}">● @${this.activeWorkerId}</span>
        <span class="status-sep">|</span>
        <span class="status-role">${worker?.role || 'Developer'}</span>
        <span class="status-sep">|</span>
        <span class="status-branch"><span class="git-icon">⎇</span> ${worker?.branch || 'main'}</span>
      </div>
      <div class="status-right">
        <span class="status-line-count">${lines.length} lines</span>
        <span class="status-sep">|</span>
        <span class="status-scroll-lock ${this.autoScroll ? 'active' : ''}">${this.autoScroll ? 'AUTO-SCROLL' : 'MANUAL'}</span>
        <span class="status-sep">|</span>
        <span class="status-stream-badge ${isPaused ? 'paused' : 'streaming'}">${isPaused ? 'PAUSED' : 'STREAMING'}</span>
      </div>
    `;
  }

  public destroy(): void {
    this.unsubscribeStoreSelect?.();
    this.unsubscribeStoreStatus?.();
    this.unsubscribeSimulator?.();
    this.rootElement?.remove();
    this.minimizedPill?.remove();
  }
}
