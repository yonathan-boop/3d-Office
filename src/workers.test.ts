import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerState } from './scene/worker-state.ts';
import { Workstation } from './scene/workstation.ts';
import type { WorkerConfig, WorkerStatus, WorkstationConfig } from './types/index.ts';

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

test('Workstation builds complete 3D desk setup with required parts', () => {
  const config: WorkstationConfig = {
    id: 'ws-1',
    position: [0, 0, 0],
    rotation: 0,
    deskColor: 0x334155,
  };

  const ws = new Workstation(config);
  assert.equal(ws.id, 'ws-1');
  assert.ok(ws.group, 'workstation group exists');

  // Verify key components exist in hierarchy
  const partNames: string[] = [];
  ws.group.traverse((obj) => {
    if (obj.name) partNames.push(obj.name);
  });

  assert.ok(partNames.includes('desk_tabletop'), 'has desk tabletop');
  assert.ok(partNames.includes('monitor_mount_pole'), 'has monitor mount');
  assert.ok(partNames.includes('monitor_left'), 'has left monitor');
  assert.ok(partNames.includes('monitor_right'), 'has right monitor');
  assert.ok(partNames.includes('desktop_tower'), 'has desktop tower');
  assert.ok(partNames.includes('ergonomic_chair'), 'has ergonomic chair');
  assert.ok(partNames.includes('keyboard'), 'has keyboard');
  assert.ok(partNames.includes('mouse'), 'has mouse');

  // Highlight toggle
  assert.equal(ws.isHighlighted, false);
  ws.setHighlight(true);
  assert.equal(ws.isHighlighted, true);
  ws.setHighlight(false);
  assert.equal(ws.isHighlighted, false);
});

