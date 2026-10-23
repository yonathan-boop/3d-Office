import * as THREE from 'three';
import { OfficeRoom } from './scene/room.ts';
import { OfficeLighting } from './scene/lighting.ts';
import { OfficeCameraControls } from './controls/camera.ts';
import { UIOverlay } from './ui/overlay.ts';
import { OfficeStateManager } from './state/officeState.ts';

export class OfficeApp {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public cameraControls: OfficeCameraControls;
  public room: OfficeRoom;
  public lighting: OfficeLighting;
  public ui: UIOverlay;
  public stateManager: OfficeStateManager;
  public clock: THREE.Clock;

  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;

  constructor(canvas: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);

    // Renderer setup with soft shadows and ACES tone mapping
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Room & Environment
    this.room = new OfficeRoom();
    this.scene.add(this.room.group);

    // Lighting rig
    this.lighting = new OfficeLighting(this.room.dimensions);
    this.scene.add(this.lighting.group);

    // Camera & dampened OrbitControls
    this.cameraControls = new OfficeCameraControls(canvas);

    // Office State Manager
    this.stateManager = new OfficeStateManager();

    // UI Overlay
    this.ui = new UIOverlay();

    // Delta clock
    this.clock = new THREE.Clock();

    // Event listeners
    window.addEventListener('resize', this.onResize);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    this.clock.stop();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    // Delta timing targeting 60 FPS
    const delta = this.clock.getDelta();
    this.updateFps(delta);

    // Update dampened controls
    this.cameraControls.update();

    // Render frame
    this.renderer.render(this.scene, this.cameraControls.camera);
  };

  private updateFps(delta: number): void {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 500) {
      if (delta > 0) {
        this.currentFps = 1 / delta;
      }
      this.stateManager.setFps(this.currentFps);
      this.ui.update({ fps: this.currentFps });
      this.room.commandWall.update(this.stateManager.getKPIs(), this.stateManager.getEvents());
      this.lastFpsUpdate = now;
      this.frameCount = 0;
    }
  }

  private onResize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.cameraControls.resize(width, height);
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  };

  public destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
  }
}

// Bootstrap application on DOM ready
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('office-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Office canvas element #office-canvas not found');
    return;
  }
  const app = new OfficeApp(canvas);
  app.start();
  (window as unknown as { __OFFICE_APP__: OfficeApp }).__OFFICE_APP__ = app;
});
