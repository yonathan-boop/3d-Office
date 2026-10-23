import type { TerminalLine, TerminalLineType } from '../types/index.ts';
import { WORKER_SCENARIOS, type ScenarioStep } from './activityScenarios.ts';

export interface SimulatorConfig {
  maxLines?: number;
  intervalMs?: number;
  autoStart?: boolean;
}

export class CodeStreamSimulator {
  private buffers: Map<string, TerminalLine[]> = new Map();
  private scenarioIndices: Map<string, number> = new Map();
  private lineListeners: Map<string, Set<(line: TerminalLine) => void>> = new Map();
  private anyLineListeners: Set<(workerId: string, line: TerminalLine) => void> = new Set();
  private maxLines: number;
  private intervalMs: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private paused: boolean = false;
  private lineCounter: number = 0;

  constructor(config: SimulatorConfig = {}) {
    this.maxLines = config.maxLines ?? 300;
    this.intervalMs = config.intervalMs ?? 600;

    // Initialize default buffers with welcome banners
    const workerIds = Object.keys(WORKER_SCENARIOS);
    for (const id of workerIds) {
      this.initWorkerBuffer(id);
    }

    if (config.autoStart ?? true) {
      this.start();
    }
  }

  private initWorkerBuffer(workerId: string): void {
    const bannerLines: { type: TerminalLineType; text: string }[] = [
      { type: 'system', text: `3D Office Terminal Shell v1.0.0 [x86_64-cubefarm]` },
      { type: 'system', text: `Session attached to worker: @${workerId} | Pty /dev/pts/1` },
      { type: 'system', text: `Type or watch simulated real-time developer stream...` },
      { type: 'output', text: '' },
    ];

    const lines: TerminalLine[] = bannerLines.map((b) => ({
      id: `init-${workerId}-${++this.lineCounter}`,
      timestamp: Date.now(),
      type: b.type,
      text: b.text,
    }));

    this.buffers.set(workerId, lines);
    this.scenarioIndices.set(workerId, 0);
  }

  public getLines(workerId: string): TerminalLine[] {
    if (!this.buffers.has(workerId)) {
      this.initWorkerBuffer(workerId);
    }
    return this.buffers.get(workerId) || [];
  }

  public emitLine(workerId: string, input: { type: TerminalLineType; text: string }): TerminalLine {
    if (!this.buffers.has(workerId)) {
      this.initWorkerBuffer(workerId);
    }

    const lines = this.buffers.get(workerId)!;
    const line: TerminalLine = {
      id: `line-${workerId}-${++this.lineCounter}`,
      timestamp: Date.now(),
      type: input.type,
      text: input.text,
    };

    lines.push(line);

    // Enforce bounded ring buffer to guarantee no memory leak
    if (lines.length > this.maxLines) {
      lines.splice(0, lines.length - this.maxLines);
    }

    // Notify worker-specific listeners
    const listeners = this.lineListeners.get(workerId);
    if (listeners) {
      listeners.forEach((fn) => fn(line));
    }

    // Notify global stream listeners
    this.anyLineListeners.forEach((fn) => fn(workerId, line));

    return line;
  }

  public clear(workerId: string): void {
    this.buffers.set(workerId, []);
  }

  public onLine(workerId: string, listener: (line: TerminalLine) => void): () => void {
    if (!this.lineListeners.has(workerId)) {
      this.lineListeners.set(workerId, new Set());
    }
    const set = this.lineListeners.get(workerId)!;
    set.add(listener);
    return () => set.delete(listener);
  }

  public onAnyLine(listener: (workerId: string, line: TerminalLine) => void): () => void {
    this.anyLineListeners.add(listener);
    return () => this.anyLineListeners.delete(listener);
  }

  public tickWorker(workerId: string): TerminalLine | null {
    const steps = WORKER_SCENARIOS[workerId];
    if (!steps || steps.length === 0) return null;

    const currentIndex = this.scenarioIndices.get(workerId) || 0;
    const step: ScenarioStep = steps[currentIndex];

    const line = this.emitLine(workerId, {
      type: step.type,
      text: step.text,
    });

    const nextIndex = (currentIndex + 1) % steps.length;
    this.scenarioIndices.set(workerId, nextIndex);
    return line;
  }

  public tickAll(): void {
    if (this.paused) return;
    const workers = Object.keys(WORKER_SCENARIOS);
    for (const workerId of workers) {
      // Simulate realistic async distribution: randomly tick a subset of workers per frame
      if (Math.random() < 0.65) {
        this.tickWorker(workerId);
      }
    }
  }

  public start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tickAll();
    }, this.intervalMs);
    // In Node.js environment (e.g. tests), unref the timer so it doesn't block process exit
    if (typeof this.timer === 'object' && this.timer !== null && 'unref' in this.timer) {
      (this.timer as { unref: () => void }).unref();
    }
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public destroy(): void {
    this.stop();
    this.buffers.clear();
    this.lineListeners.clear();
    this.anyLineListeners.clear();
  }
}

// Global default simulator singleton
export const codeSimulator = new CodeStreamSimulator({ autoStart: false, intervalMs: 800 });
