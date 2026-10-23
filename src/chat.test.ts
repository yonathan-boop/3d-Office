import test from 'node:test';
import assert from 'node:assert/strict';
import { ChatStore, isValidImageType, formatFileSize, fileToAttachment } from './chat/store.ts';
import type { ChatAttachment } from './types/index.ts';

test('isValidImageType accepts PNG, JPEG, WebP, SVG and rejects others', () => {
  assert.equal(isValidImageType('image/png'), true);
  assert.equal(isValidImageType('image/jpeg'), true);
  assert.equal(isValidImageType('image/jpg'), true);
  assert.equal(isValidImageType('image/webp'), true);
  assert.equal(isValidImageType('image/svg+xml'), true);

  assert.equal(isValidImageType('application/pdf'), false);
  assert.equal(isValidImageType('text/plain'), false);
  assert.equal(isValidImageType(''), false);
  assert.equal(isValidImageType('video/mp4'), false);
});

test('formatFileSize formats byte sizes correctly', () => {
  assert.equal(formatFileSize(500), '500 B');
  assert.equal(formatFileSize(1024), '1.0 KB');
  assert.equal(formatFileSize(2048 * 1024), '2.0 MB');
});

test('ChatStore starts with empty messages list', () => {
  const store = new ChatStore();
  assert.deepEqual(store.getMessages(), []);
});

test('ChatStore.sendMessage adds message with text', () => {
  const store = new ChatStore();
  const msg = store.sendMessage({ text: 'Hello team' });

  assert.ok(msg.id);
  assert.equal(msg.text, 'Hello team');
  assert.equal(msg.sender, 'manager');
  assert.equal(msg.senderName, 'Manager');
  assert.ok(typeof msg.timestamp === 'number');
  assert.equal(store.getMessages().length, 1);
  assert.deepEqual(store.getMessages()[0], msg);
});

test('ChatStore.sendMessage adds message with attachment only', () => {
  const store = new ChatStore();
  const attachment: ChatAttachment = {
    id: 'att-1',
    name: 'screenshot.png',
    type: 'image/png',
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    size: 68,
  };

  const msg = store.sendMessage({ attachment });
  assert.equal(msg.text, '');
  assert.deepEqual(msg.attachment, attachment);
  assert.equal(store.getMessages().length, 1);
});

test('ChatStore.sendMessage adds message with both text and attachment', () => {
  const store = new ChatStore();
  const attachment: ChatAttachment = {
    id: 'att-2',
    name: 'diagram.webp',
    type: 'image/webp',
    dataUrl: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAgA0JaQAA3AA/vuUAAA=',
    size: 100,
  };

  const msg = store.sendMessage({
    text: 'Check this diagram',
    attachment,
    sender: 'worker',
    senderName: 'Worker #1',
  });

  assert.equal(msg.text, 'Check this diagram');
  assert.equal(msg.sender, 'worker');
  assert.equal(msg.senderName, 'Worker #1');
  assert.deepEqual(msg.attachment, attachment);
});

test('ChatStore.sendMessage throws error when neither text nor attachment is provided', () => {
  const store = new ChatStore();
  assert.throws(() => {
    store.sendMessage({ text: '   ' });
  }, /Message must have text or attachment/);

  assert.throws(() => {
    store.sendMessage({});
  }, /Message must have text or attachment/);
});

test('ChatStore.subscribe notifies listeners on new messages and unsubscribes cleanly', () => {
  const store = new ChatStore();
  const calls: number[] = [];

  const unsubscribe = store.subscribe((messages, newMsg) => {
    calls.push(messages.length);
    assert.ok(newMsg);
  });

  store.sendMessage({ text: 'First' });
  assert.deepEqual(calls, [1]);

  store.sendMessage({ text: 'Second' });
  assert.deepEqual(calls, [1, 2]);

  unsubscribe();
  store.sendMessage({ text: 'Third' });
  assert.deepEqual(calls, [1, 2]);
  assert.equal(store.getMessages().length, 3);
});

test('fileToAttachment validates image type and returns attachment', async () => {
  const mockFile = {
    name: 'photo.jpg',
    type: 'image/jpeg',
    size: 1234,
  };
  const fakeDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';

  const attachment = await fileToAttachment(mockFile, async () => fakeDataUrl);
  assert.equal(attachment.name, 'photo.jpg');
  assert.equal(attachment.type, 'image/jpeg');
  assert.equal(attachment.dataUrl, fakeDataUrl);
  assert.equal(attachment.size, 1234);
  assert.ok(attachment.id);

  const invalidFile = {
    name: 'doc.pdf',
    type: 'application/pdf',
    size: 500,
  };
  await assert.rejects(async () => {
    await fileToAttachment(invalidFile, async () => fakeDataUrl);
  }, /Unsupported image type/);
});
