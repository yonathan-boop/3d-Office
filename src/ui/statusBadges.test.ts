import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { project3DToScreen } from './statusBadges.ts';

test('project3DToScreen projects center world point to screen center', () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  const coords = project3DToScreen([0, 0, 0], camera, 1000, 1000);
  assert.ok(coords, 'point should be visible in front of camera');
  assert.equal(Math.round(coords.x), 500);
  assert.equal(Math.round(coords.y), 500);
});

test('project3DToScreen returns null for coordinates behind the camera', () => {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();

  // Point behind camera at z = 20
  const coords = project3DToScreen([0, 0, 20], camera, 1000, 1000);
  assert.equal(coords, null, 'point behind camera must be culled');
});
