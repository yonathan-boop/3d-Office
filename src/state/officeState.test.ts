import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeStateManager } from './officeState.ts';

test('OfficeStateManager initializes default workers and computes correct initial KPIs', () => {
  const manager = new OfficeStateManager();
  const state = manager.getState();

  assert.equal(state.workers.length, 4, 'should initialize 4 default workers');

  const kpis = manager.getKPIs();
  assert.equal(kpis.activeWorkers, 3, '3 active workers');
  assert.equal(kpis.idleWorkers, 1, '1 idle worker');
  assert.equal(kpis.tasksInProgress, 3, '3 in-progress tasks');
  assert.ok(kpis.commitsPerHour > 0, 'throughput > 0');
});

test('OfficeStateManager updates worker status and triggers listeners', () => {
  const manager = new OfficeStateManager();
  let listenerCalled = false;

  manager.subscribe(() => {
    listenerCalled = true;
  });

  manager.setWorkerStatus('alan', 'coding', 'Task #4 Activity Monitor');

  assert.ok(listenerCalled, 'subscriber called');
  const worker = manager.getWorker('alan');
  assert.equal(worker?.status, 'coding');
  assert.equal(worker?.currentTask, 'Task #4 Activity Monitor');

  const kpis = manager.getKPIs();
  assert.equal(kpis.activeWorkers, 4);
  assert.equal(kpis.idleWorkers, 0);
});

test('OfficeStateManager adds activity events and caps event history', () => {
  const manager = new OfficeStateManager();

  manager.logEvent({
    workerName: 'Ada',
    action: 'started task #2',
    type: 'task_started'
  });

  const events = manager.getEvents();
  assert.equal(events[0].workerName, 'Ada');
  assert.equal(events[0].action, 'started task #2');
  assert.ok(events[0].id, 'event has id');
  assert.ok(events[0].timestamp, 'event has timestamp');
});
