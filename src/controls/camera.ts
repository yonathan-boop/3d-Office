import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraConfig } from '../types';

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 48,
  near: 0.1,
  far: 100,
  initialPosition: [0, 5.5, 11],
  target: [0, 1.0, 0],
};

export class OfficeCameraControls {
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  constructor(
    domElement: HTMLElement,
    aspect: number = window.innerWidth / window.innerHeight,
    config: CameraConfig = DEFAULT_CAMERA_CONFIG
  ) {
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      aspect,
      config.near,
      config.far
    );
    this.camera.position.set(...config.initialPosition);

    this.controls = new OrbitControls(this.camera, domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // Bounded angles: prevent going below floor and limit top-down flipping
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    this.controls.minPolarAngle = 0.1;

    // Bounded distance: smooth zoom within room limits
    this.controls.minDistance = 2.0;
    this.controls.maxDistance = 24.0;

    // Pan options
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.screenSpacePanning = true;

    this.controls.target.set(...config.target);
    this.controls.update();
  }

  public update(): void {
    this.controls.update();
  }

  public resize(width: number, height: number): void {
    if (height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}
