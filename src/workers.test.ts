import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerState } from './scene/worker-state.ts';
import type { WorkerConfig, WorkerStatus } from './types/index.ts';

test('WorkerState manages worker identity and transitions status', () => {
  const config: WorkerConfig = {
    id: 'worker-ada',
    name: 'Ada',
    role: 'Lead Architect',
    accentColor: 0x06b6d4, // Cyan
    avatarColor: 0x38bdf8,
    initialStatus: 'idle',
    workstationIndex: 0,
    stats: {
      currentTask: 'Designing distributed consensus protocol',
      tasksCompleted: 42,
      linesOfCode: 3820,
      cpuUsage: 18,
    },
  };

  const state = new WorkerState(config);
  assert.equal(state.id, 'worker-ada');
  assert.equal(state.name, 'Ada');
  assert.equal(state.role, 'Lead Architect');
  assert.equal(state.status, 'idle');
  assert.equal(state.stats.tasksCompleted, 42);

  // Status transitions
  state.setStatus('coding');
  assert.equal(state.status, 'coding');

  state.setStatus('reviewing');
  assert.equal(state.status, 'reviewing');

  state.setStatus('idle');
  assert.equal(state.status, 'idle');

  // Updating task details
  state.updateStats({ currentTask: 'Refactoring 3D scene graph', cpuUsage: 74 });
  assert.equal(state.stats.currentTask, 'Refactoring 3D scene graph');
  assert.equal(state.stats.cpuUsage, 74);
  assert.equal(state.stats.tasksCompleted, 42); // preserved
});
