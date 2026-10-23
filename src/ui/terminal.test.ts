import test from 'node:test';
import assert from 'node:assert/strict';
import { TerminalOverlay, formatTerminalLine } from './terminal.ts';
import { WorkerStateStore } from '../state/workerState.ts';
import { CodeStreamSimulator } from '../simulator/codeStreamSimulator.ts';

test('formatTerminalLine escapes HTML and applies syntax color class', () => {
  const line = {
    id: '1',
    timestamp: Date.now(),
    type: 'diff-add' as const,
    text: '+ const port = 5657;',
  };

  const html = formatTerminalLine(line);
  assert.ok(html.includes('line-diff-add'), 'has line-diff-add class');
  assert.ok(html.includes('+ const port = 5657;'), 'contains text');
  assert.ok(html.includes('<span class="line-content">'), 'has line-content span');

  // Verify escaping
  const unsafeLine = {
    id: '2',
    timestamp: Date.now(),
    type: 'output' as const,
    text: '<script>alert(1)</script>',
  };
  const escapedHtml = formatTerminalLine(unsafeLine);
  assert.ok(!escapedHtml.includes('<script>'), 'escapes HTML tags');
  assert.ok(escapedHtml.includes('&lt;script&gt;'), 'properly escaped');
});

test('TerminalOverlay manages active worker, autoScroll, and window state', () => {
  // Minimal DOM mock for Node environment
  const mockContainer = {
    innerHTML: '',
    appendChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };

  const store = new WorkerStateStore();
  const simulator = new CodeStreamSimulator({ autoStart: false });
  const terminal = new TerminalOverlay({
    store,
    simulator,
    container: mockContainer as unknown as HTMLElement,
  });

  assert.equal(terminal.getActiveWorkerId(), 'ada');
  assert.equal(terminal.isAutoScroll(), true);
  assert.equal(terminal.isMinimized(), false);
  assert.equal(terminal.isMaximized(), false);

  // Toggle auto scroll
  terminal.toggleAutoScroll();
  assert.equal(terminal.isAutoScroll(), false);

  // Toggle maximize
  terminal.toggleMaximize();
  assert.equal(terminal.isMaximized(), true);
  terminal.toggleMaximize();
  assert.equal(terminal.isMaximized(), false);

  // Toggle minimize
  terminal.toggleMinimize();
  assert.equal(terminal.isMinimized(), true);
  terminal.toggleMinimize();
  assert.equal(terminal.isMinimized(), false);

  // Switch worker tab
  terminal.setActiveWorker('linus');
  assert.equal(terminal.getActiveWorkerId(), 'linus');

  // Clear worker buffer
  terminal.clearCurrent();
  assert.equal(simulator.getLines('linus').length, 0);
});
