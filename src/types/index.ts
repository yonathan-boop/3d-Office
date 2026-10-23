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
