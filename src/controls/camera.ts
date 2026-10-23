import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { CameraConfig, CameraPreset, CameraPresetName } from '../types/index.ts';

export const CAMERA_PRESETS: Record<CameraPresetName, CameraPreset> = {
  overview: {
    name: 'overview',
    label: 'Overview',
    position: [0, 6.0, 12.0],
    target: [0, 1.0, 0],
  },
  devPod1: {
    name: 'devPod1',
    label: 'Dev Pod 1',
    position: [-3.8, 2.8, 4.2],
    target: [-3.8, 1.2, 0],
  },
  devPod2: {
    name: 'devPod2',
    label: 'Dev Pod 2',
    position: [3.8, 2.8, 4.2],
    target: [3.8, 1.2, 0],
  },
  commandWall: {
    name: 'commandWall',
    label: 'Command Wall',
    position: [0, 2.5, -2.8],
    target: [0, 2.2, -7.92],
  },
};

export const DEFAULT_CAMERA_CONFIG: CameraConfig = {
  fov: 48,
  near: 0.1,
  far: 100,
  initialPosition: [0, 6.0, 12.0],
  target: [0, 1.0, 0],
};

export class OfficeCameraControls {
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private currentPreset: CameraPresetName | null = 'overview';
  private inTransition: boolean = false;
  private transitionElapsed: number = 0;
  private transitionDuration: number = 1.0;
  private startPosition: THREE.Vector3 = new THREE.Vector3();
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  private startTarget: THREE.Vector3 = new THREE.Vector3();
  private targetTarget: THREE.Vector3 = new THREE.Vector3();

  constructor(
    domElement: HTMLElement,
    aspect: number = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight : 16 / 9,
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
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 24.0;

    // Pan options
    this.controls.enablePan = true;
    this.controls.panSpeed = 0.8;
    this.controls.screenSpacePanning = true;

    this.controls.target.set(...config.target);
    this.controls.update();

    // Cancel programmatic camera flight if user grabs the controls
    this.controls.addEventListener('start', () => {
      this.inTransition = false;
    });
  }

  public transitionTo(presetName: CameraPresetName, duration: number = 1.0): void {
    const preset = CAMERA_PRESETS[presetName];
    if (!preset) return;

    this.currentPreset = presetName;
    this.inTransition = true;
    this.transitionElapsed = 0;
    this.transitionDuration = Math.max(0.01, duration);

    this.startPosition.copy(this.camera.position);
    this.targetPosition.set(...preset.position);

    this.startTarget.copy(this.controls.target);
    this.targetTarget.set(...preset.target);
  }

  public isTransitioning(): boolean {
    return this.inTransition;
  }

  public getCurrentPreset(): CameraPresetName | null {
    return this.currentPreset;
  }

  public update(delta: number = 0.016): void {
    if (this.inTransition) {
      this.transitionElapsed += delta;
      const rawProgress = Math.min(1.0, this.transitionElapsed / this.transitionDuration);

      // Smoothstep easing: S-curve transition
      const t = rawProgress * rawProgress * (3 - 2 * rawProgress);

      this.camera.position.lerpVectors(this.startPosition, this.targetPosition, t);
      this.controls.target.lerpVectors(this.startTarget, this.targetTarget, t);

      if (rawProgress >= 1.0) {
        this.camera.position.copy(this.targetPosition);
        this.controls.target.copy(this.targetTarget);
        this.inTransition = false;
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
