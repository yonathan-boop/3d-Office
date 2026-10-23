export interface RoomDimensions {
  width: number;
  height: number;
  depth: number;
}

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  initialPosition: [number, number, number];
  target: [number, number, number];
}

export interface OfficeSceneConfig {
  roomDimensions: RoomDimensions;
  camera: CameraConfig;
}

export type ActivityStatus = 'idle' | 'coding' | 'reviewing' | 'testing';

export interface WorkerState {
  id: string;
  name: string;
  pod: 'Dev Pod 1' | 'Dev Pod 2';
  status: ActivityStatus;
  currentTask?: string;
  position: [number, number, number];
  avatarColor: string;
}

export interface OfficeKPIs {
  activeWorkers: number;
  idleWorkers: number;
  tasksInProgress: number;
  commitsPerHour: number;
  fps: number;
}

export type ActivityEventType = 'task_started' | 'pr_merged' | 'build_passed' | 'review_completed' | 'test_run';

export interface ActivityEvent {
  id: string;
  timestamp: number;
  workerName: string;
  action: string;
  type: ActivityEventType;
}

export type CameraPresetName = 'overview' | 'devPod1' | 'devPod2' | 'commandWall';

export interface CameraPreset {
  name: CameraPresetName;
  label: string;
  position: [number, number, number];
  target: [number, number, number];
}

export interface HUDState {
  title: string;
  status: 'online' | 'connecting' | 'offline';
  agentCount: number;
  fps: number;
  kpis?: OfficeKPIs;
}

export type WorkerStatus = 'idle' | 'coding' | 'reviewing' | 'testing';

export interface WorkerProfile {
  id: string;
  name: string;
  role: string;
  status: WorkerStatus;
  branch: string;
  avatarColor: string;
}

export type TerminalLineType =
  | 'command'
  | 'output'
  | 'thought'
  | 'diff-add'
  | 'diff-del'
  | 'diff-header'
  | 'success'
  | 'error'
  | 'system';

export interface TerminalLine {
  id: string;
  timestamp: number;
  type: TerminalLineType;
  text: string;
}

export interface WorkerStats {
  currentTask: string;
  tasksCompleted: number;
  linesOfCode: number;
  cpuUsage: number;
}

export interface WorkerConfig {
  id: string;
  name: string;
  role: string;
  accentColor: number;
  avatarColor: number;
  initialStatus: WorkerStatus;
  workstationIndex: number;
  stats?: Partial<WorkerStats>;
}

export interface WorkstationConfig {
  id: string;
  position: [number, number, number];
  rotation: number;
  deskColor?: number;
  monitorCount?: number;
}

export interface WorkerSelectedEventDetail {
  workerId: string;
  name: string;
  role: string;
  status: WorkerStatus;
  currentTask: string;
  stats: WorkerStats;
  workstationId: string;
  position: [number, number, number];
}

