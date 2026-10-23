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

export interface HUDState {
  title: string;
  status: 'online' | 'connecting' | 'offline';
  agentCount: number;
  fps: number;
}

export type WorkerStatus = 'idle' | 'coding' | 'reviewing';

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

