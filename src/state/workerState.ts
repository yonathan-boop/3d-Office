import type { WorkerProfile, WorkerStatus } from '../types/index.ts';

export const DEFAULT_WORKERS: WorkerProfile[] = [
  {
    id: 'ada',
    name: 'Ada',
    role: 'Frontend & UI Components',
    status: 'coding',
    branch: 'feat/terminal-overlay',
    avatarColor: '#38bdf8',
  },
  {
    id: 'linus',
    name: 'Linus',
    role: 'Core & Three.js Engine',
    status: 'coding',
    branch: 'swarm/issue-3-linus',
    avatarColor: '#10b981',
  },
  {
    id: 'hopper',
    name: 'Hopper',
    role: 'Compiler & Test Suites',
    status: 'testing',
    branch: 'fix/ci-pipeline',
    avatarColor: '#f59e0b',
  },
  {
    id: 'turing',
    name: 'Turing',
    role: 'LLM & Reasoning Engine',
    status: 'reviewing',
    branch: 'ai/reasoning-loop',
    avatarColor: '#a855f7',
  },
];

export class WorkerStateStore {
  private workers: Map<string, WorkerProfile> = new Map();
  private selectedWorkerId: string;
  private selectListeners: Set<(worker: WorkerProfile) => void> = new Set();
  private statusListeners: Set<(worker: WorkerProfile, status: WorkerStatus) => void> = new Set();

  constructor(initialWorkers: WorkerProfile[] = DEFAULT_WORKERS, initialSelectedId?: string) {
    initialWorkers.forEach((w) => this.workers.set(w.id, { ...w }));
    this.selectedWorkerId = initialSelectedId || initialWorkers[0]?.id || 'ada';

    // Bridge with DOM custom events if running in browser
    if (typeof window !== 'undefined') {
      window.addEventListener('worker-selected', (e: Event) => {
        const customEvent = e as CustomEvent<{ workerId: string }>;
        if (customEvent.detail?.workerId) {
          this.selectWorker(customEvent.detail.workerId, false);
        }
      });
    }
  }

  private resolveWorkerId(id: string): string {
    if (this.workers.has(id)) return id;
    const stripped = id.toLowerCase().replace(/^worker-/, '');
    if (this.workers.has(stripped)) return stripped;
    if (stripped === 'grace') return 'hopper';
    if (stripped === 'alan') return 'turing';
    return id;
  }

  public getWorkers(): WorkerProfile[] {
    return Array.from(this.workers.values());
  }

  public getWorker(id: string): WorkerProfile | undefined {
    return this.workers.get(this.resolveWorkerId(id));
  }

  public getSelectedWorker(): WorkerProfile | undefined {
    return this.workers.get(this.selectedWorkerId);
  }

  public selectWorker(id: string, dispatchDomEvent: boolean = true): WorkerProfile | undefined {
    const resolvedId = this.resolveWorkerId(id);
    const worker = this.workers.get(resolvedId);
    if (!worker) return undefined;

    this.selectedWorkerId = resolvedId;
    this.selectListeners.forEach((fn) => fn(worker));

    if (dispatchDomEvent && typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('worker-selected', { detail: { workerId: resolvedId, worker } })
      );
    }

    return worker;
  }

  public setWorkerStatus(id: string, status: WorkerStatus): void {
    const worker = this.workers.get(this.resolveWorkerId(id));
    if (!worker) return;

    worker.status = status;
    this.statusListeners.forEach((fn) => fn(worker, status));
  }

  public onWorkerSelect(listener: (worker: WorkerProfile) => void): () => void {
    this.selectListeners.add(listener);
    return () => this.selectListeners.delete(listener);
  }

  public onWorkerStatusChange(
    listener: (worker: WorkerProfile, status: WorkerStatus) => void
  ): () => void {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }
}

// Global singleton instance for shared app state
export const workerStore = new WorkerStateStore();
