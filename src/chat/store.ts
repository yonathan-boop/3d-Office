import type { ChatAttachment, ChatMessage, SendMessageOptions } from '../types/index.ts';

export const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
];

export function isValidImageType(type: string): boolean {
  if (!type) return false;
  return ACCEPTED_IMAGE_TYPES.includes(type.toLowerCase().trim());
}

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function fileToAttachment(
  file: { name: string; type: string; size?: number },
  readDataUrl: () => Promise<string>
): Promise<ChatAttachment> {
  if (!isValidImageType(file.type)) {
    throw new Error(`Unsupported image type: ${file.type}. Allowed: PNG, JPG, WebP, SVG.`);
  }

  const dataUrl = await readDataUrl();
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    type: file.type,
    dataUrl,
    size: file.size,
  };
}

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file as data URL'));
    reader.readAsDataURL(file);
  });
}

export type ChatListener = (messages: ChatMessage[], newMsg?: ChatMessage) => void;

export class ChatStore {
  private messages: ChatMessage[] = [];
  private listeners: Set<ChatListener> = new Set();

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public sendMessage(options: SendMessageOptions): ChatMessage {
    const trimmedText = options.text?.trim() ?? '';
    const hasText = trimmedText.length > 0;
    const hasAttachment = Boolean(options.attachment);

    if (!hasText && !hasAttachment) {
      throw new Error('Message must have text or attachment');
    }

    const message: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: options.sender ?? 'manager',
      senderName: options.senderName ?? 'Manager',
      text: trimmedText,
      attachment: options.attachment,
      timestamp: Date.now(),
    };

    this.messages.push(message);
    this.notify(message);
    return message;
  }

  public subscribe(listener: ChatListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(newMsg?: ChatMessage): void {
    const current = this.getMessages();
    for (const listener of this.listeners) {
      try {
        listener(current, newMsg);
      } catch (err) {
        console.error('ChatStore listener error:', err);
      }
    }
  }

  public clear(): void {
    this.messages = [];
    this.notify();
  }
}
