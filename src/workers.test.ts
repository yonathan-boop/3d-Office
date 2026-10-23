import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerState } from './scene/worker-state.ts';
import { Workstation } from './scene/workstation.ts';
import { WorkerAvatar } from './scene/worker-avatar.ts';
import { OfficeWorkersManager } from './scene/office-workers.ts';
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

test('WorkerAvatar builds seated avatar model, supports status and animations', () => {
  const config: WorkerConfig = {
    id: 'worker-ada',
    name: 'Ada',
    role: 'Lead Architect',
    accentColor: 0x06b6d4,
    avatarColor: 0x38bdf8,
    initialStatus: 'idle',
    workstationIndex: 0,
  };

  const state = new WorkerState(config);
  const avatar = new WorkerAvatar(state);

  assert.equal(avatar.id, 'worker-ada');
  assert.ok(avatar.group, 'avatar group exists');
  assert.equal(avatar.state.status, 'idle');

  // Verify avatar body parts exist
  const partNames: string[] = [];
  avatar.group.traverse((obj) => {
    if (obj.name) partNames.push(obj.name);
  });

  assert.ok(partNames.includes('avatar_head'), 'has avatar head');
  assert.ok(partNames.includes('avatar_torso'), 'has avatar torso');
  assert.ok(partNames.includes('avatar_arm_left'), 'has left arm');
  assert.ok(partNames.includes('avatar_arm_right'), 'has right arm');
  assert.ok(partNames.includes('avatar_hit_box'), 'has raycast hit box');
  assert.ok(partNames.includes('avatar_nameplate'), 'has nameplate');

  // Animation updates without crash
  const initialArmY = avatar.leftForearm.rotation.x;
  avatar.update(0.016); // 60 FPS delta
  avatar.update(0.016);

  // Transition to coding status
  avatar.state.setStatus('coding');
  assert.equal(avatar.state.status, 'coding');
  avatar.update(0.05);
  // Typing motion should animate forearm rotations
  assert.notEqual(avatar.leftForearm.rotation.x, initialArmY);

  // Transition to reviewing status
  avatar.state.setStatus('reviewing');
  assert.equal(avatar.state.status, 'reviewing');
  avatar.update(0.1);

  // Selection highlight test
  assert.equal(avatar.isSelected, false);
  avatar.setSelected(true);
  assert.equal(avatar.isSelected, true);
  avatar.setSelected(false);
  assert.equal(avatar.isSelected, false);
});

test('OfficeWorkersManager sets up workstations pod layout and manages workers', () => {
  const manager = new OfficeWorkersManager();

  assert.ok(manager.group, 'manager group exists');
  assert.equal(manager.workstations.length, 4, 'creates 4 workstations in pod layout');
  assert.equal(manager.workers.length, 4, 'creates 4 worker avatars');

  // Verify finding by id
  const ada = manager.getWorker('worker-ada');
  assert.ok(ada, 'Ada worker exists');
  assert.equal(ada.state.name, 'Ada');

  const linus = manager.getWorker('worker-linus');
  assert.ok(linus, 'Linus worker exists');
  assert.equal(linus.state.name, 'Linus');

  // Status updates
  manager.setWorkerStatus('worker-ada', 'reviewing');
  assert.equal(ada.state.status, 'reviewing');

  // Workstation highlight
  const ws0 = manager.getWorkstation('ws-0');
  assert.ok(ws0, 'workstation 0 exists');
  manager.highlightWorkstation('ws-0', true);
  assert.equal(ws0.isHighlighted, true);
  manager.highlightWorkstation('ws-0', false);
  assert.equal(ws0.isHighlighted, false);

  // Update animation loop
  manager.update(0.016);
});



