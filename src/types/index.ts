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

export type ChatSenderRole = 'manager' | 'worker' | 'system';

export interface ChatAttachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size?: number;
}

export interface ChatMessage {
  id: string;
  sender: ChatSenderRole;
  senderName: string;
  text: string;
  attachment?: ChatAttachment;
  timestamp: number;
}

export interface SendMessageOptions {
  text?: string;
  attachment?: ChatAttachment;
  sender?: ChatSenderRole;
  senderName?: string;
}

