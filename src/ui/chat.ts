import { ChatStore, fileToAttachment, formatFileSize, isValidImageType, readFileAsDataUrl } from '../chat/store';
import type { ChatAttachment, ChatMessage } from '../types';

export class ChatPanel {
  private store: ChatStore;
  private container: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  private isCollapsed: boolean = false;
  private draftAttachment: ChatAttachment | null = null;
  private isSending: boolean = false;
  private unreadCount: number = 0;

  // DOM references
  private panelEl!: HTMLElement;
  private messagesContainerEl!: HTMLElement;
  private inputEl!: HTMLInputElement;
  private fileInputEl!: HTMLInputElement;
  private draftContainerEl!: HTMLElement;
  private draftThumbEl!: HTMLImageElement;
  private draftNameEl!: HTMLElement;
  private draftSizeEl!: HTMLElement;
  private draftRemoveBtn!: HTMLButtonElement;
  private dropOverlayEl!: HTMLElement;
  private badgeEl!: HTMLElement;
  private toggleBtnEl!: HTMLButtonElement;
  private lightboxEl!: HTMLElement;
  private lightboxImgEl!: HTMLImageElement;
  private lightboxCaptionEl!: HTMLElement;

  constructor(store: ChatStore, initialCollapsed: boolean = false) {
    this.store = store;
    this.isCollapsed = initialCollapsed;
  }

  public mount(parent: HTMLElement): void {
    this.container = parent;
    this.render();
    this.bindEvents();
    this.unsubscribe = this.store.subscribe((_msgs, newMsg) => {
      this.renderMessages();
      if (this.isCollapsed && newMsg && newMsg.sender !== 'manager') {
        this.unreadCount++;
        this.updateBadge();
      }
    });
    this.renderMessages();
  }

  public destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.lightboxEl && this.lightboxEl.parentNode) {
      this.lightboxEl.parentNode.removeChild(this.lightboxEl);
    }
    if (this.panelEl && this.panelEl.parentNode) {
      this.panelEl.parentNode.removeChild(this.panelEl);
    }
    window.removeEventListener('keydown', this.onKeyDown);
  }

  public toggleCollapse(): void {
    this.isCollapsed = !this.isCollapsed;
    this.panelEl.classList.toggle('collapsed', this.isCollapsed);
    this.toggleBtnEl.setAttribute('aria-expanded', String(!this.isCollapsed));
    this.toggleBtnEl.innerHTML = this.isCollapsed ? this.getExpandIconSvg() : this.getCollapseIconSvg();

    if (!this.isCollapsed) {
      this.unreadCount = 0;
      this.updateBadge();
      this.scrollToBottom();
      this.inputEl.focus();
    }
  }

  public getDraftAttachment(): ChatAttachment | null {
    return this.draftAttachment;
  }

  public setDraftAttachment(attachment: ChatAttachment | null): void {
    this.draftAttachment = attachment;
    if (attachment) {
      this.draftThumbEl.src = attachment.dataUrl;
      this.draftNameEl.textContent = attachment.name;
      this.draftSizeEl.textContent = formatFileSize(attachment.size);
      this.draftContainerEl.classList.remove('hidden');
    } else {
      this.draftThumbEl.src = '';
      this.draftNameEl.textContent = '';
      this.draftSizeEl.textContent = '';
      this.draftContainerEl.classList.add('hidden');
      if (this.fileInputEl) {
        this.fileInputEl.value = '';
      }
    }
  }

  private render(): void {
    this.panelEl = document.createElement('section');
    this.panelEl.className = `chat-panel hud-panel ${this.isCollapsed ? 'collapsed' : ''}`;
    this.panelEl.setAttribute('aria-label', 'Manager Chat Panel');

    this.panelEl.innerHTML = `
      <header class="chat-header">
        <div class="chat-header-title">
          <span class="chat-status-indicator"></span>
          <span class="chat-title-text">Manager Chat</span>
          <span class="chat-unread-badge hidden" id="chat-unread-badge">0</span>
        </div>
        <div class="chat-header-actions">
          <button type="button" class="chat-icon-btn chat-toggle-btn" id="chat-toggle-btn" aria-label="Toggle chat panel" aria-expanded="${!this.isCollapsed}">
            ${this.isCollapsed ? this.getExpandIconSvg() : this.getCollapseIconSvg()}
          </button>
        </div>
      </header>

      <div class="chat-content">
        <div class="chat-messages" id="chat-messages" role="log" aria-live="polite"></div>

        <div class="chat-draft-preview hidden" id="chat-draft-preview">
          <div class="draft-thumb-wrap">
            <img class="draft-thumb" id="chat-draft-thumb" alt="Draft attachment preview" />
          </div>
          <div class="draft-meta">
            <span class="draft-filename" id="chat-draft-name"></span>
            <span class="draft-filesize" id="chat-draft-size"></span>
          </div>
          <button type="button" class="chat-draft-remove-btn" id="chat-draft-remove" title="Remove attachment" aria-label="Remove attachment">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div class="chat-drop-overlay hidden" id="chat-drop-overlay">
          <div class="chat-drop-content">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            <span>Drop image to attach</span>
          </div>
        </div>

        <form class="chat-input-form" id="chat-input-form">
          <input
            type="file"
            id="chat-file-input"
            class="chat-hidden-file-input"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            aria-label="Upload image attachment"
          />
          <button
            type="button"
            class="chat-icon-btn chat-attach-btn"
            id="chat-attach-btn"
            title="Attach image (PNG, JPG, WebP, SVG)"
            aria-label="Attach image"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
          </button>
          <input
            type="text"
            id="chat-text-input"
            class="chat-text-input"
            placeholder="Type message or paste screenshot..."
            autocomplete="off"
          />
          <button
            type="submit"
            class="chat-icon-btn chat-send-btn"
            id="chat-send-btn"
            title="Send message"
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    `;

    this.container!.appendChild(this.panelEl);

    // Cache elements
    this.messagesContainerEl = this.panelEl.querySelector('#chat-messages') as HTMLElement;
    this.inputEl = this.panelEl.querySelector('#chat-text-input') as HTMLInputElement;
    this.fileInputEl = this.panelEl.querySelector('#chat-file-input') as HTMLInputElement;
    this.draftContainerEl = this.panelEl.querySelector('#chat-draft-preview') as HTMLElement;
    this.draftThumbEl = this.panelEl.querySelector('#chat-draft-thumb') as HTMLImageElement;
    this.draftNameEl = this.panelEl.querySelector('#chat-draft-name') as HTMLElement;
    this.draftSizeEl = this.panelEl.querySelector('#chat-draft-size') as HTMLElement;
    this.draftRemoveBtn = this.panelEl.querySelector('#chat-draft-remove') as HTMLButtonElement;
    this.dropOverlayEl = this.panelEl.querySelector('#chat-drop-overlay') as HTMLElement;
    this.badgeEl = this.panelEl.querySelector('#chat-unread-badge') as HTMLElement;
    this.toggleBtnEl = this.panelEl.querySelector('#chat-toggle-btn') as HTMLButtonElement;

    this.createLightbox();
  }

  private createLightbox(): void {
    this.lightboxEl = document.createElement('div');
    this.lightboxEl.className = 'chat-lightbox hidden';
    this.lightboxEl.setAttribute('role', 'dialog');
    this.lightboxEl.setAttribute('aria-modal', 'true');
    this.lightboxEl.setAttribute('aria-label', 'Image preview lightbox');

    this.lightboxEl.innerHTML = `
      <div class="lightbox-backdrop" id="lightbox-backdrop"></div>
      <div class="lightbox-dialog">
        <header class="lightbox-header">
          <span class="lightbox-caption" id="lightbox-caption"></span>
          <button type="button" class="chat-icon-btn lightbox-close-btn" id="lightbox-close-btn" aria-label="Close image preview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </header>
        <div class="lightbox-body">
          <img class="lightbox-img" id="lightbox-img" alt="Full size preview" />
        </div>
      </div>
    `;

    document.body.appendChild(this.lightboxEl);
    this.lightboxImgEl = this.lightboxEl.querySelector('#lightbox-img') as HTMLImageElement;
    this.lightboxCaptionEl = this.lightboxEl.querySelector('#lightbox-caption') as HTMLElement;

    const closeBtn = this.lightboxEl.querySelector('#lightbox-close-btn') as HTMLElement;
    const backdrop = this.lightboxEl.querySelector('#lightbox-backdrop') as HTMLElement;
    closeBtn.addEventListener('click', () => this.closeLightbox());
    backdrop.addEventListener('click', () => this.closeLightbox());
  }

  public openLightbox(attachment: ChatAttachment): void {
    this.lightboxImgEl.src = attachment.dataUrl;
    this.lightboxCaptionEl.textContent = `${attachment.name} (${formatFileSize(attachment.size)})`;
    this.lightboxEl.classList.remove('hidden');
  }

  public closeLightbox(): void {
    this.lightboxEl.classList.add('hidden');
    this.lightboxImgEl.src = '';
  }

  private bindEvents(): void {
    // Stop pointer propagation so Three.js OrbitControls does not intercept interactions
    const stopPropagation = (e: Event) => e.stopPropagation();
    this.panelEl.addEventListener('pointerdown', stopPropagation);
    this.panelEl.addEventListener('mousedown', stopPropagation);
    this.panelEl.addEventListener('touchstart', stopPropagation, { passive: true });
    this.panelEl.addEventListener('wheel', stopPropagation);

    // Toggle collapse
    this.toggleBtnEl.addEventListener('click', () => this.toggleCollapse());

    // File input trigger
    const attachBtn = this.panelEl.querySelector('#chat-attach-btn') as HTMLButtonElement;
    attachBtn.addEventListener('click', () => {
      this.fileInputEl.click();
    });

    this.fileInputEl.addEventListener('change', async () => {
      const file = this.fileInputEl.files?.[0];
      if (file) {
        await this.handleFile(file);
      }
    });

    // Remove draft attachment
    this.draftRemoveBtn.addEventListener('click', () => {
      this.setDraftAttachment(null);
    });

    // Form submit / Send
    const form = this.panelEl.querySelector('#chat-input-form') as HTMLFormElement;
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSend();
    });

    // Clipboard paste support (e.g. screenshot pasting)
    this.panelEl.addEventListener('paste', async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file && isValidImageType(file.type)) {
            e.preventDefault();
            await this.handleFile(file);
            return;
          }
        }
      }
    });

    // Drag and drop handling
    let dragCounter = 0;
    this.panelEl.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      this.dropOverlayEl.classList.remove('hidden');
    });

    this.panelEl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        this.dropOverlayEl.classList.add('hidden');
      }
    });

    this.panelEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    this.panelEl.addEventListener('drop', async (e: DragEvent) => {
      e.preventDefault();
      dragCounter = 0;
      this.dropOverlayEl.classList.add('hidden');

      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (isValidImageType(file.type)) {
            await this.handleFile(file);
            break;
          }
        }
      }
    });

    window.addEventListener('keydown', this.onKeyDown);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && !this.lightboxEl.classList.contains('hidden')) {
      this.closeLightbox();
    }
  };

  private async handleFile(file: File | Blob): Promise<void> {
    if (!isValidImageType(file.type)) return;

    try {
      const fileName = (file as File).name || `screenshot-${Date.now()}.png`;
      const attachment = await fileToAttachment(
        { name: fileName, type: file.type, size: file.size },
        () => readFileAsDataUrl(file)
      );
      this.setDraftAttachment(attachment);
    } catch (err) {
      console.error('Failed to attach image:', err);
    }
  }

  private handleSend(): void {
    if (this.isSending) return;

    const text = this.inputEl.value.trim();
    const attachment = this.draftAttachment;

    if (!text && !attachment) return;

    this.isSending = true;
    try {
      this.store.sendMessage({
        text,
        attachment: attachment || undefined,
        sender: 'manager',
        senderName: 'Manager',
      });

      this.inputEl.value = '';
      this.setDraftAttachment(null);
      this.scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      this.isSending = false;
    }
  }

  private renderMessages(): void {
    const messages = this.store.getMessages();
    if (messages.length === 0) {
      this.messagesContainerEl.innerHTML = `
        <div class="chat-empty-state">
          <p>No messages yet.</p>
          <span>Share status notes or drop screenshot images here.</span>
        </div>
      `;
      return;
    }

    this.messagesContainerEl.innerHTML = messages
      .map((msg) => this.renderMessageItem(msg))
      .join('');

    // Attach click listeners to all thumbnails
    const thumbnails = this.messagesContainerEl.querySelectorAll<HTMLImageElement>('.chat-msg-thumbnail');
    thumbnails.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const msgId = thumb.getAttribute('data-msg-id');
        const targetMsg = messages.find((m) => m.id === msgId);
        if (targetMsg && targetMsg.attachment) {
          this.openLightbox(targetMsg.attachment);
        }
      });
    });

    this.scrollToBottom();
  }

  private renderMessageItem(msg: ChatMessage): string {
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isManager = msg.sender === 'manager';
    const roleClass = isManager ? 'role-manager' : msg.sender === 'worker' ? 'role-worker' : 'role-system';

    const attachmentHtml = msg.attachment
      ? `
      <div class="chat-msg-attachment">
        <div class="chat-thumbnail-container" title="Click to view full image">
          <img
            src="${msg.attachment.dataUrl}"
            alt="${this.escapeHtml(msg.attachment.name)}"
            class="chat-msg-thumbnail"
            data-msg-id="${msg.id}"
            loading="lazy"
          />
          <div class="chat-thumbnail-overlay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
          </div>
        </div>
        <div class="chat-attachment-meta">
          <span class="chat-att-name">${this.escapeHtml(msg.attachment.name)}</span>
          <span class="chat-att-size">${formatFileSize(msg.attachment.size)}</span>
        </div>
      </div>
    `
      : '';

    const textHtml = msg.text
      ? `<div class="chat-msg-text">${this.escapeHtml(msg.text)}</div>`
      : '';

    return `
      <div class="chat-message ${isManager ? 'outgoing' : 'incoming'}" data-id="${msg.id}">
        <div class="chat-msg-header">
          <span class="chat-badge ${roleClass}">${this.escapeHtml(msg.senderName)}</span>
          <time class="chat-timestamp">${timeStr}</time>
        </div>
        <div class="chat-msg-content">
          ${textHtml}
          ${attachmentHtml}
        </div>
      </div>
    `;
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      if (this.messagesContainerEl) {
        this.messagesContainerEl.scrollTop = this.messagesContainerEl.scrollHeight;
      }
    });
  }

  private updateBadge(): void {
    if (this.unreadCount > 0) {
      this.badgeEl.textContent = this.unreadCount > 99 ? '99+' : String(this.unreadCount);
      this.badgeEl.classList.remove('hidden');
    } else {
      this.badgeEl.classList.add('hidden');
    }
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private getCollapseIconSvg(): string {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
  }

  private getExpandIconSvg(): string {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="18 15 12 9 6 15"></polyline>
      </svg>
    `;
  }
}
