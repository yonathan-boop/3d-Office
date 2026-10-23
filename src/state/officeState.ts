import type {
  ActivityEvent,
  ActivityEventType,
  ActivityStatus,
  OfficeKPIs,
  WorkerState,
} from '../types/index.ts';

export const DEFAULT_WORKERS: WorkerState[] = [
  {
    id: 'ada',
    name: 'Agent Ada',
    pod: 'Dev Pod 1',
    status: 'coding',
    currentTask: 'Task #2 Workstation mesh layout',
    position: [-3.8, 1.4, -1.2],
    avatarColor: '#38bdf8',
  },
  {
    id: 'linus',
    name: 'Agent Linus',
    pod: 'Dev Pod 1',
    status: 'reviewing',
    currentTask: 'PR #1 Git worktree manager',
    position: [-3.8, 1.4, 1.2],
    avatarColor: '#a855f7',
  },
  {
    id: 'grace',
    name: 'Agent Grace',
    pod: 'Dev Pod 2',
    status: 'testing',
    currentTask: 'Playwright test runner suite',
    position: [3.8, 1.4, -1.2],
    avatarColor: '#10b981',
  },
  {
    id: 'alan',
    name: 'Agent Alan',
    pod: 'Dev Pod 2',
    status: 'idle',
    position: [3.8, 1.4, 1.2],
    avatarColor: '#f59e0b',
  },
];

export const INITIAL_EVENTS: Omit<ActivityEvent, 'id' | 'timestamp'>[] = [
  { workerName: 'Agent Linus', action: 'merged PR #1 (Git worktree manager)', type: 'pr_merged' },
  { workerName: 'Agent Ada', action: 'started task #2 (Workstation mesh layout)', type: 'task_started' },
  { workerName: 'Agent Grace', action: 'passed E2E test suite (14 passing)', type: 'build_passed' },
  { workerName: 'Agent Alan', action: 'completed code review for #3', type: 'review_completed' },
];

export class OfficeStateManager {
  private workers: Map<string, WorkerState> = new Map();
  private events: ActivityEvent[] = [];
  private listeners: Set<() => void> = new Set();
  private commitsPerHour: number = 18;
  private currentFps: number = 60;
  private nextEventId: number = 1;

  constructor(initialWorkers: WorkerState[] = DEFAULT_WORKERS) {
    initialWorkers.forEach((w) => this.workers.set(w.id, { ...w }));

    // Seed initial milestones
    const now = Date.now();
    INITIAL_EVENTS.forEach((e, idx) => {
      this.events.push({
        id: `evt-${this.nextEventId++}`,
        timestamp: now - (INITIAL_EVENTS.length - idx) * 12000,
        ...e,
      });
    });
  }

  public getState(): { workers: WorkerState[]; events: ActivityEvent[] } {
    return {
      workers: Array.from(this.workers.values()),
      events: [...this.events],
    };
  }

  public getWorkers(): WorkerState[] {
    return Array.from(this.workers.values());
  }

  public getWorker(id: string): WorkerState | undefined {
    return this.workers.get(id);
  }

  public getEvents(): ActivityEvent[] {
    return [...this.events];
  }

  public getKPIs(): OfficeKPIs {
    const workersList = Array.from(this.workers.values());
    const activeWorkers = workersList.filter((w) => w.status !== 'idle').length;
    const idleWorkers = workersList.filter((w) => w.status === 'idle').length;
    const tasksInProgress = workersList.filter((w) => Boolean(w.currentTask)).length;

    return {
      activeWorkers,
      idleWorkers,
      tasksInProgress,
      commitsPerHour: this.commitsPerHour,
      fps: this.currentFps,
    };
  }

  public setFps(fps: number): void {
    this.currentFps = fps;
  }

  public setWorkerStatus(id: string, status: ActivityStatus, currentTask?: string): void {
    const worker = this.workers.get(id);
    if (!worker) return;

    worker.status = status;
    worker.currentTask = currentTask;
    this.notify();
  }

  public logEvent(event: { workerName: string; action: string; type: ActivityEventType }): ActivityEvent {
    const newEvent: ActivityEvent = {
      id: `evt-${this.nextEventId++}`,
      timestamp: Date.now(),
      ...event,
    };

    // Prepend new event, max 50 items
    this.events.unshift(newEvent);
    if (this.events.length > 50) {
      this.events.pop();
    }

    if (event.type === 'pr_merged') {
      this.commitsPerHour = Math.min(60, this.commitsPerHour + 1);
    }

    this.notify();
    return newEvent;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
