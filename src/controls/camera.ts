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
  public initialConfig: CameraConfig;

  private transitionTarget: THREE.Vector3 | null = null;
  private transitionCamera: THREE.Vector3 | null = null;
  private isTransitioning: boolean = false;

  constructor(
    domElement: HTMLElement,
    aspect: number = window.innerWidth / window.innerHeight,
    config: CameraConfig = DEFAULT_CAMERA_CONFIG
  ) {
    this.initialConfig = config;
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

  public focusOn(target: THREE.Vector3, cameraPosition?: THREE.Vector3): void {
    this.transitionTarget = target.clone();
    if (cameraPosition) {
      this.transitionCamera = cameraPosition.clone();
    }
    this.isTransitioning = true;
  }

  public resetView(): void {
    const target = new THREE.Vector3(...this.initialConfig.target);
    const pos = new THREE.Vector3(...this.initialConfig.initialPosition);
    this.focusOn(target, pos);
  }

  public update(): void {
    if (this.isTransitioning) {
      if (this.transitionTarget) {
        this.controls.target.lerp(this.transitionTarget, 0.08);
      }
      if (this.transitionCamera) {
        this.camera.position.lerp(this.transitionCamera, 0.08);
      }
      if (
        (!this.transitionTarget || this.controls.target.distanceTo(this.transitionTarget) < 0.02) &&
        (!this.transitionCamera || this.camera.position.distanceTo(this.transitionCamera) < 0.02)
      ) {
        this.isTransitioning = false;
        this.transitionTarget = null;
        this.transitionCamera = null;
      }
    }
    this.controls.update();
  }

  public resize(width: number, height: number): void {
    if (height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }
}

