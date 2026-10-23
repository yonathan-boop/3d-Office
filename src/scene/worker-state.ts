import type { WorkerConfig, WorkerStats, WorkerStatus } from '../types/index.ts';

export class WorkerState {
  public readonly id: string;
  public readonly name: string;
  public readonly role: string;
  public readonly accentColor: number;
  public readonly avatarColor: number;
  public readonly workstationIndex: number;

  private _status: WorkerStatus;
  private _stats: WorkerStats;

  private listeners: Set<(status: WorkerStatus) => void> = new Set();

  constructor(config: WorkerConfig) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.accentColor = config.accentColor;
    this.avatarColor = config.avatarColor;
    this.workstationIndex = config.workstationIndex;
    this._status = config.initialStatus;

    this._stats = {
      currentTask: config.stats?.currentTask ?? 'Standby',
      tasksCompleted: config.stats?.tasksCompleted ?? 0,
      linesOfCode: config.stats?.linesOfCode ?? 0,
      cpuUsage: config.stats?.cpuUsage ?? 15,
    };
  }

  public get status(): WorkerStatus {
    return this._status;
  }

  public get stats(): Readonly<WorkerStats> {
    return this._stats;
  }

  public setStatus(status: WorkerStatus): void {
    if (this._status === status) return;
    this._status = status;
    this.listeners.forEach((listener) => listener(status));
  }

  public updateStats(stats: Partial<WorkerStats>): void {
    this._stats = {
      ...this._stats,
      ...stats,
    };
  }

  public onStatusChange(callback: (status: WorkerStatus) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
