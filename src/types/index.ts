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

