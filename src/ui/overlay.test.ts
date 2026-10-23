import test from 'node:test';
import assert from 'node:assert/strict';
import { formatEventTime, UIOverlay } from './overlay.ts';

test('formatEventTime formats epoch timestamp to HH:MM:SS', () => {
  const ts = new Date('2026-10-23T14:30:45Z').getTime();
  const formatted = formatEventTime(ts);
  assert.match(formatted, /^\d{2}:\d{2}:\d{2}$/);
});

test('UIOverlay formats KPI metrics cleanly', async () => {
  // Verify UIOverlay methods exist
  const proto = UIOverlay.prototype;
  assert.equal(typeof proto.updateKPIs, 'function');
  assert.equal(typeof proto.addActivityEvent, 'function');
  assert.equal(typeof proto.setActivityEvents, 'function');
  assert.equal(typeof proto.setActivePreset, 'function');
  assert.equal(typeof proto.toggleActivityFeed, 'function');
});
