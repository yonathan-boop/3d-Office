import * as THREE from 'three';
import { Workstation } from './workstation.ts';
import { WorkerAvatar } from './worker-avatar.ts';
import { WorkerState } from './worker-state.ts';
import type { WorkerConfig, WorkerStatus, WorkstationConfig } from '../types/index.ts';

export const DEFAULT_WORKSTATION_CONFIGS: WorkstationConfig[] = [
  { id: 'ws-0', position: [-1.6, 0, 0.6], rotation: 0, deskColor: 0x1e293b },
  { id: 'ws-1', position: [1.6, 0, 0.6], rotation: 0, deskColor: 0x1e293b },
  { id: 'ws-2', position: [-1.6, 0, -0.6], rotation: Math.PI, deskColor: 0x1e293b },
  { id: 'ws-3', position: [1.6, 0, -0.6], rotation: Math.PI, deskColor: 0x1e293b },
];

export const DEFAULT_WORKER_CONFIGS: WorkerConfig[] = [
  {
    id: 'worker-ada',
    name: 'Ada',
    role: 'Lead Architect',
    accentColor: 0x06b6d4, // Cyan
    avatarColor: 0x0284c7,
    initialStatus: 'coding',
    workstationIndex: 0,
    stats: {
      currentTask: 'Implementing distributed agent coordinator',
      tasksCompleted: 84,
      linesOfCode: 5240,
      cpuUsage: 68,
    },
  },
  {
    id: 'worker-linus',
    name: 'Linus',
    role: 'Kernel Engineer',
    accentColor: 0xf59e0b, // Amber
    avatarColor: 0xd97706,
    initialStatus: 'reviewing',
    workstationIndex: 1,
    stats: {
      currentTask: 'Code review on memory-mapped IPC buffers',
      tasksCompleted: 128,
      linesOfCode: 9810,
      cpuUsage: 45,
    },
  },
  {
    id: 'worker-grace',
    name: 'Grace',
    role: 'Compiler Systems',
    accentColor: 0x10b981, // Emerald
    avatarColor: 0x059669,
    initialStatus: 'coding',
    workstationIndex: 2,
    stats: {
      currentTask: 'Compiling bytecode JIT optimizations',
      tasksCompleted: 62,
      linesOfCode: 4120,
      cpuUsage: 82,
    },
  },
  {
    id: 'worker-alan',
    name: 'Alan',
    role: 'AI Researcher',
    accentColor: 0x8b5cf6, // Violet
    avatarColor: 0x7c3aed,
    initialStatus: 'idle',
    workstationIndex: 3,
    stats: {
      currentTask: 'Waiting for model weights checkpoint',
      tasksCompleted: 35,
      linesOfCode: 2950,
      cpuUsage: 12,
    },
  },
];

export class OfficeWorkersManager {
  public group: THREE.Group;
  public workstations: Workstation[] = [];
  public workers: WorkerAvatar[] = [];
  public workerStates: Map<string, WorkerState> = new Map();

  private workstationMap: Map<string, Workstation> = new Map();
  private workerMap: Map<string, WorkerAvatar> = new Map();

  constructor(
    wsConfigs: WorkstationConfig[] = DEFAULT_WORKSTATION_CONFIGS,
    workerConfigs: WorkerConfig[] = DEFAULT_WORKER_CONFIGS
  ) {
    this.group = new THREE.Group();
    this.group.name = 'office_workers_manager';

    // 1. Build workstations
    wsConfigs.forEach((config) => {
      const ws = new Workstation(config);
      this.workstations.push(ws);
      this.workstationMap.set(config.id, ws);
      this.group.add(ws.group);
    });

    // 2. Build workers and place at workstations
    workerConfigs.forEach((config) => {
      const state = new WorkerState(config);
      this.workerStates.set(config.id, state);

      const avatar = new WorkerAvatar(state);
      this.workers.push(avatar);
      this.workerMap.set(config.id, avatar);

      // Attach avatar to its designated workstation
      const targetWs = this.workstations[config.workstationIndex];
      if (targetWs) {
        targetWs.group.add(avatar.group);
      } else {
        this.group.add(avatar.group);
      }
    });
  }

  public getWorker(id: string): WorkerAvatar | undefined {
    return this.workerMap.get(id);
  }

  public getWorkstation(id: string): Workstation | undefined {
    return this.workstationMap.get(id);
  }

  public getWorkstationForWorker(workerId: string): Workstation | undefined {
    const worker = this.workerMap.get(workerId);
    if (!worker) return undefined;
    return this.workstations[worker.state.workstationIndex];
  }

  public setWorkerStatus(id: string, status: WorkerStatus): void {
    const worker = this.workerMap.get(id);
    if (worker) {
      worker.state.setStatus(status);
    }
  }

  public highlightWorkstation(workstationId: string, highlight: boolean): void {
    const ws = this.workstationMap.get(workstationId);
    if (ws) {
      ws.setHighlight(highlight);
    }
  }

  public update(delta: number): void {
    for (const worker of this.workers) {
      worker.update(delta);
    }
  }
}
