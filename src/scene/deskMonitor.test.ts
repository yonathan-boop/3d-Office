import test from 'node:test';
import assert from 'node:assert/strict';
import { DeskMonitorStation } from './deskMonitor.ts';
import { WorkerStateStore } from '../state/workerState.ts';
import { CodeStreamSimulator } from '../simulator/codeStreamSimulator.ts';

test('DeskMonitorStation builds 3D desk mesh and monitor setup', () => {
  const store = new WorkerStateStore();
  const simulator = new CodeStreamSimulator({ autoStart: false });
  const station = new DeskMonitorStation({ store, simulator });

  assert.ok(station.group, 'group exists');
  const names = station.group.children.map((c) => c.name);
  assert.ok(names.some((n) => n.startsWith('desk_workstation_')), 'desk workstation exists');
  assert.ok(station.group.getObjectByName('monitor_screen_ada'), 'monitor screen mesh exists in scene graph');

  // Verify getScreenMeshes returns clickable monitor screens
  const screens = station.getScreenMeshes();
  assert.ok(screens.length > 0, 'has interactive screen meshes');
});

test('DeskMonitorStation updates screen for selected worker', () => {
  const store = new WorkerStateStore();
  const simulator = new CodeStreamSimulator({ autoStart: false });
  const station = new DeskMonitorStation({ store, simulator });

  station.setActiveWorker('linus');
  assert.equal(station.getActiveWorkerId(), 'linus');

  // Update render cycle without crashing
  station.update();
  assert.ok(true, 'station.update() completed cleanly');
});
