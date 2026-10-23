import * as THREE from 'three';
import { OfficeRoom } from './scene/room';
import { OfficeLighting } from './scene/lighting';
import { OfficeCameraControls } from './controls/camera';
import { UIOverlay } from './ui/overlay';
import { DeskMonitorStation } from './scene/deskMonitor.ts';
import { TerminalOverlay } from './ui/terminal.ts';
import { workerStore } from './state/workerState.ts';
import { codeSimulator } from './simulator/codeStreamSimulator.ts';
import { OfficeWorkersManager } from './scene/office-workers.ts';
import { WorkerSelectionManager } from './interactions/selection.ts';

export class OfficeApp {
  public scene: THREE.Scene;
  public renderer: THREE.WebGLRenderer;
  public cameraControls: OfficeCameraControls;
  public room: OfficeRoom;
  public lighting: OfficeLighting;
  public workstations: DeskMonitorStation;
  public ui: UIOverlay;
  public terminal: TerminalOverlay;
  public workersManager: OfficeWorkersManager;
  public selectionManager: WorkerSelectionManager;
  public clock: THREE.Clock;

  private isRunning: boolean = false;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 60;
  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
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

    // Workstations with in-world dual monitors
    this.workstations = new DeskMonitorStation({ store: workerStore, simulator: codeSimulator });
    this.scene.add(this.workstations.group);

    // Lighting rig
    this.lighting = new OfficeLighting(this.room.dimensions);
    this.scene.add(this.lighting.group);

    // AI Coding Worker Pods & Workstations
    this.workersManager = new OfficeWorkersManager();
    this.scene.add(this.workersManager.group);

    // Camera & dampened OrbitControls
    this.cameraControls = new OfficeCameraControls(canvas);

    // UI Overlay & Terminal Window
    this.ui = new UIOverlay();
    this.ui.update({ agentCount: this.workersManager.workers.length });

    this.terminal = new TerminalOverlay({
      store: workerStore,
      simulator: codeSimulator,
      onModeToggle: (mode) => {
        if (mode === 'in-world') {
          // In-world mode: minimize overlay to give clear view of 3D screens
          if (!this.terminal.isMinimized()) {
            this.terminal.toggleMinimize();
          }
        }
      },
    });

    // Interactive Worker Selection & Raycasting
    this.selectionManager = new WorkerSelectionManager({
      workersManager: this.workersManager,
      canvas,
      camera: this.cameraControls.camera,
      cameraControls: this.cameraControls,
      uiOverlay: this.ui,
    });

    // Raycasting for interactive monitor clicks
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.canvas.addEventListener('click', this.onCanvasClick);

    // Delta clock
    this.clock = new THREE.Clock();

    // Event listeners
    window.addEventListener('resize', this.onResize);
  }

  private onCanvasClick = (event: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.cameraControls.camera);
    const screens = this.workstations.getScreenMeshes();
    const intersects = this.raycaster.intersectObjects(screens, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const workerId = hit.object.userData?.workerId;
      if (workerId) {
        workerStore.selectWorker(workerId);
        const avatarMap: Record<string, string> = {
          ada: 'worker-ada',
          linus: 'worker-linus',
          hopper: 'worker-grace',
          turing: 'worker-alan',
        };
        const avatarId = avatarMap[workerId] || `worker-${workerId}`;
        this.selectionManager.selectWorker(avatarId);
        if (this.terminal.isMinimized()) {
          this.terminal.toggleMinimize();
        }
      }
    }
  };

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    codeSimulator.start();
    this.animate();
  }

  public stop(): void {
    this.isRunning = false;
    this.clock.stop();
    codeSimulator.stop();
  }

  private animate = (): void => {
    if (!this.isRunning) return;

    requestAnimationFrame(this.animate);

    // Delta timing targeting 60 FPS
    const delta = this.clock.getDelta();
    this.updateFps(delta);

    // Update in-world monitor textures
    this.workstations.update();

    // Update dampened controls
    this.cameraControls.update();

    // Update worker avatars animation loops
    this.workersManager.update(delta);

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
      this.ui.update({ fps: this.currentFps });
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
    this.canvas.removeEventListener('click', this.onCanvasClick);
    this.selectionManager.destroy();
    window.removeEventListener('resize', this.onResize);
    this.workstations.destroy();
    this.terminal.destroy();
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
