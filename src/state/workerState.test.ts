import test from 'node:test';
import assert from 'node:assert/strict';
import { WorkerStateStore } from './workerState.ts';

test('WorkerStateStore initializes with default workers and initial selection', () => {
  const store = new WorkerStateStore();
  const workers = store.getWorkers();

  assert.ok(workers.length >= 3, 'initializes with at least 3 workers');
  const workerIds = workers.map((w) => w.id);
  assert.ok(workerIds.includes('ada'));
  assert.ok(workerIds.includes('linus'));

  const selected = store.getSelectedWorker();
  assert.ok(selected, 'has an initially selected worker');
  assert.equal(selected.id, 'ada');
});

test('WorkerStateStore allows selecting workers and notifies subscribers', () => {
  const store = new WorkerStateStore();
  let notifiedWorkerId: string | null = null;

  const unsubscribe = store.onWorkerSelect((worker) => {
    notifiedWorkerId = worker.id;
  });

  const selected = store.selectWorker('linus');
  assert.equal(selected?.id, 'linus');
  assert.equal(store.getSelectedWorker()?.id, 'linus');
  assert.equal(notifiedWorkerId, 'linus');

  unsubscribe();
  store.selectWorker('ada');
  assert.equal(notifiedWorkerId, 'linus', 'unsubscribed callback is not called');
});

test('WorkerStateStore updates worker status cleanly', () => {
  const store = new WorkerStateStore();
  store.setWorkerStatus('hopper', 'reviewing');
  const worker = store.getWorker('hopper');
  assert.equal(worker?.status, 'reviewing');
});
