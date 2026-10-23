import test from 'node:test';
import assert from 'node:assert/strict';
import { CodeStreamSimulator } from './codeStreamSimulator.ts';

test('CodeStreamSimulator initializes buffers and generates lines for workers', () => {
  const simulator = new CodeStreamSimulator({ autoStart: false, maxLines: 50 });
  const linesAda = simulator.getLines('ada');
  assert.ok(Array.isArray(linesAda), 'initializes buffer as array');
  assert.ok(linesAda.length > 0, 'has initial welcoming/banner lines');

  // Push a line manually
  simulator.emitLine('ada', {
    type: 'command',
    text: '$ git status',
  });

  const updatedLines = simulator.getLines('ada');
  const lastLine = updatedLines[updatedLines.length - 1];
  assert.equal(lastLine.type, 'command');
  assert.equal(lastLine.text, '$ git status');
});

test('CodeStreamSimulator notifies line listeners when new lines arrive', () => {
  const simulator = new CodeStreamSimulator({ autoStart: false, maxLines: 50 });
  let receivedText = '';

  const unsubscribe = simulator.onLine('linus', (line) => {
    receivedText = line.text;
  });

  simulator.emitLine('linus', {
    type: 'thought',
    text: '[thinking] optimizing buffer upload to GPU',
  });

  assert.equal(receivedText, '[thinking] optimizing buffer upload to GPU');
  unsubscribe();

  simulator.emitLine('linus', { type: 'command', text: '$ echo test' });
  assert.equal(receivedText, '[thinking] optimizing buffer upload to GPU', 'listener unsubscribed');
});

test('CodeStreamSimulator enforces bounded buffer to prevent memory leaks', () => {
  const maxLines = 10;
  const simulator = new CodeStreamSimulator({ autoStart: false, maxLines });

  for (let i = 0; i < 25; i++) {
    simulator.emitLine('hopper', {
      type: 'output',
      text: `log line ${i}`,
    });
  }

  const lines = simulator.getLines('hopper');
  assert.equal(lines.length, maxLines, `buffer capped at maxLines (${maxLines})`);
  assert.equal(lines[lines.length - 1].text, 'log line 24');
  assert.equal(lines[0].text, 'log line 15');
});

test('CodeStreamSimulator clear empties buffer', () => {
  const simulator = new CodeStreamSimulator({ autoStart: false, maxLines: 50 });
  simulator.emitLine('turing', { type: 'command', text: '$ npm test' });
  assert.ok(simulator.getLines('turing').length > 0);

  simulator.clear('turing');
  assert.equal(simulator.getLines('turing').length, 0);
});

test('CodeStreamSimulator steps simulation and emits scenario steps', () => {
  const simulator = new CodeStreamSimulator({ autoStart: false, maxLines: 50 });
  const initialCount = simulator.getLines('ada').length;

  simulator.tickWorker('ada');
  const countAfter = simulator.getLines('ada').length;
  assert.ok(countAfter > initialCount, 'tickWorker produced new line');
});
