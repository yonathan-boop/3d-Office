import type { HUDState } from '../types';
import { ChatStore } from '../chat/store';
import { ChatPanel } from './chat';

export class UIOverlay {
  private container: HTMLElement;
  private fpsElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private agentCountElement: HTMLElement | null = null;

  public chatStore: ChatStore;
  public chatPanel: ChatPanel;

  constructor(containerId: string = 'ui-overlay', chatStore?: ChatStore) {
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
    this.container.innerHTML = `
      <header class="hud-header">
        <div class="hud-brand">
          <span class="hud-dot online"></span>
          <span class="hud-title">3D Virtual Office</span>
          <span class="hud-badge">v0.1.0</span>
        </div>
        <div class="hud-metrics">
          <div class="metric-item">
            <span class="metric-label">FPS</span>
            <span id="hud-fps" class="metric-val">60</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Status</span>
            <span id="hud-status" class="metric-val status-online">Online</span>
          </div>
          <div class="metric-item">
            <span class="metric-label">Workers</span>
            <span id="hud-workers" class="metric-val">0 active</span>
          </div>
        </div>
      </header>

      <div id="hud-panels" class="hud-panels">
        <!-- Future HUD panels and status monitors mount here -->
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
    this.statusElement = document.getElementById('hud-status');
    this.agentCountElement = document.getElementById('hud-workers');
  }

  public update(state: Partial<HUDState>): void {
    if (state.fps !== undefined && this.fpsElement) {
      this.fpsElement.textContent = Math.round(state.fps).toString();
    }
    if (state.status !== undefined && this.statusElement) {
      this.statusElement.textContent = state.status.toUpperCase();
      this.statusElement.className = `metric-val status-${state.status}`;
    }
    if (state.agentCount !== undefined && this.agentCountElement) {
      this.agentCountElement.textContent = `${state.agentCount} active`;
    }
  }

  public getPanelsContainer(): HTMLElement | null {
    return document.getElementById('hud-panels');
  }
}
