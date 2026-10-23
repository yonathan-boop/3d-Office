import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { CAMERA_PRESETS, OfficeCameraControls } from './camera.ts';

// Mock minimal DOM element for headless test
function createMockElement(): HTMLElement {
  const doc = {
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  return {
    addEventListener: () => {},
    removeEventListener: () => {},
    getRootNode: () => doc,
    style: {},
    ownerDocument: doc,
  } as unknown as HTMLElement;
}

test('CAMERA_PRESETS defines all 4 required camera viewpoints', () => {
  const presetKeys = Object.keys(CAMERA_PRESETS);
  assert.ok(presetKeys.includes('overview'));
  assert.ok(presetKeys.includes('devPod1'));
  assert.ok(presetKeys.includes('devPod2'));
  assert.ok(presetKeys.includes('commandWall'));
});

test('OfficeCameraControls initiates and completes smooth transition between presets', () => {
  const el = createMockElement();
  const controls = new OfficeCameraControls(el, 16 / 9);

  assert.equal(controls.isTransitioning(), false);

  // Start transition to commandWall
  controls.transitionTo('commandWall', 0.5);
  assert.equal(controls.isTransitioning(), true);
  assert.equal(controls.getCurrentPreset(), 'commandWall');

  // Step halfway
  controls.update(0.25);
  assert.equal(controls.isTransitioning(), true);

  // Step to completion
  controls.update(0.3);
  assert.equal(controls.isTransitioning(), false);

  const targetPreset = CAMERA_PRESETS.commandWall;
  assert.ok(
    controls.camera.position.distanceTo(new THREE.Vector3(...targetPreset.position)) < 0.05,
    'camera reaches target position'
  );
  assert.ok(
    controls.controls.target.distanceTo(new THREE.Vector3(...targetPreset.target)) < 0.05,
    'controls target reaches target'
  );
});
