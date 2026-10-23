import * as THREE from 'three';
import { WorkerStateStore, workerStore } from '../state/workerState.ts';
import { CodeStreamSimulator, codeSimulator } from '../simulator/codeStreamSimulator.ts';

export interface DeskMonitorStationOptions {
  store?: WorkerStateStore;
  simulator?: CodeStreamSimulator;
}

interface WorkerMonitorDisplay {
  workerId: string;
  canvas: HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | null;
  texture: THREE.CanvasTexture | null;
  screenMesh: THREE.Mesh;
  dirty: boolean;
}

export class DeskMonitorStation {
  public group: THREE.Group;
  private store: WorkerStateStore;
  private simulator: CodeStreamSimulator;
  private activeWorkerId: string;
  private displays: Map<string, WorkerMonitorDisplay> = new Map();
  private screenMeshes: THREE.Mesh[] = [];

  private lastRenderTime: number = 0;
  private renderThrottleMs: number = 100;
  private unsubscribeSelect: (() => void) | null = null;
  private unsubscribeLines: (() => void) | null = null;

  constructor(options: DeskMonitorStationOptions = {}) {
    this.store = options.store || workerStore;
    this.simulator = options.simulator || codeSimulator;
    this.activeWorkerId = this.store.getSelectedWorker()?.id || 'ada';

    this.group = new THREE.Group();
    this.group.name = 'office_workstations_group';

    this.buildWorkstations();

    // Listen to worker selection
    this.unsubscribeSelect = this.store.onWorkerSelect((worker) => {
      this.setActiveWorker(worker.id);
    });

    // Listen to incoming lines to mark display dirty
    this.unsubscribeLines = this.simulator.onAnyLine((workerId) => {
      const display = this.displays.get(workerId);
      if (display) {
        display.dirty = true;
      }
    });
  }

  private createScreenCanvas(): {
    canvas: HTMLCanvasElement | null;
    ctx: CanvasRenderingContext2D | null;
    texture: THREE.CanvasTexture | null;
  } {
    if (typeof document === 'undefined') {
      return { canvas: null, ctx: null, texture: null };
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    return { canvas, ctx, texture };
  }

  private buildWorkstations(): void {
    const workers = this.store.getWorkers();

    // 4 Workstation layout arranged in 2x2 facing pods in center of office
    const stationPositions: { pos: [number, number, number]; rotY: number; workerId: string }[] = [
      { pos: [-3.2, 0, -2], rotY: 0, workerId: 'ada' },
      { pos: [3.2, 0, -2], rotY: 0, workerId: 'linus' },
      { pos: [-3.2, 0, 2], rotY: Math.PI, workerId: 'hopper' },
      { pos: [3.2, 0, 2], rotY: Math.PI, workerId: 'turing' },
    ];

    // Shared materials
    const deskMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark charcoal executive desk
      roughness: 0.6,
      metalness: 0.2,
    });
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Matte black metal frame
      roughness: 0.4,
      metalness: 0.8,
    });
    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.6,
    });
    const chairMaterial = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Vibrant cobalt fabric chair
      roughness: 0.8,
    });
    const computerTowerMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.3,
      metalness: 0.7,
    });

    stationPositions.forEach(({ pos, rotY, workerId }, index) => {
      const fallbackWorker = workers[index % workers.length];
      const targetWorkerId = workerId || fallbackWorker.id;

      const stationGroup = new THREE.Group();
      stationGroup.name = `desk_workstation_${targetWorkerId}`;
      stationGroup.position.set(...pos);
      stationGroup.rotation.y = rotY;

      // 1. Desk Surface
      const deskWidth = 2.2;
      const deskHeight = 0.08;
      const deskDepth = 1.1;
      const deskY = 0.75;

      const deskGeom = new THREE.BoxGeometry(deskWidth, deskHeight, deskDepth);
      const deskMesh = new THREE.Mesh(deskGeom, deskMaterial);
      deskMesh.position.set(0, deskY, 0);
      deskMesh.castShadow = true;
      deskMesh.receiveShadow = true;
      stationGroup.add(deskMesh);

      // Desk Metal Legs (4 legs)
      const legRadius = 0.035;
      const legHeight = deskY - deskHeight / 2;
      const legGeom = new THREE.CylinderGeometry(legRadius, legRadius, legHeight, 12);

      const legOffsets = [
        [-deskWidth / 2 + 0.1, legHeight / 2, -deskDepth / 2 + 0.1],
        [deskWidth / 2 - 0.1, legHeight / 2, -deskDepth / 2 + 0.1],
        [-deskWidth / 2 + 0.1, legHeight / 2, deskDepth / 2 - 0.1],
        [deskWidth / 2 - 0.1, legHeight / 2, deskDepth / 2 - 0.1],
      ];
      legOffsets.forEach(([lx, ly, lz]) => {
        const leg = new THREE.Mesh(legGeom, legMaterial);
        leg.position.set(lx, ly, lz);
        leg.castShadow = true;
        stationGroup.add(leg);
      });

      // 2. Dual Monitors: Left (Secondary) & Right/Center (Primary Terminal Screen)
      const monitorWidth = 0.75;
      const monitorHeight = 0.45;
      const monitorDepth = 0.03;
      const standHeight = 0.28;

      // Primary Terminal Monitor Stand & Arm
      const standGeom = new THREE.CylinderGeometry(0.02, 0.03, standHeight, 12);
      const standMesh = new THREE.Mesh(standGeom, legMaterial);
      standMesh.position.set(0, deskY + standHeight / 2, -0.2);
      stationGroup.add(standMesh);

      // Screen Bezel
      const bezelGeom = new THREE.BoxGeometry(monitorWidth, monitorHeight, monitorDepth);
      const bezelMesh = new THREE.Mesh(bezelGeom, bezelMaterial);
      bezelMesh.position.set(0, deskY + standHeight + monitorHeight / 2 - 0.05, -0.2);
      bezelMesh.castShadow = true;
      stationGroup.add(bezelMesh);

      // Interactive Canvas Screen Mesh
      const { canvas, ctx, texture } = this.createScreenCanvas();
      const screenGeom = new THREE.PlaneGeometry(monitorWidth - 0.03, monitorHeight - 0.03);

      const screenMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.3,
        metalness: 0.1,
      });

      if (texture) {
        screenMat.map = texture;
        screenMat.emissiveMap = texture;
        screenMat.emissive = new THREE.Color(0xffffff);
        screenMat.emissiveIntensity = 0.95;
      } else {
        screenMat.color = new THREE.Color(0x0f172a);
      }

      const screenMesh = new THREE.Mesh(screenGeom, screenMat);
      screenMesh.name = `monitor_screen_${targetWorkerId}`;
      screenMesh.position.set(0, deskY + standHeight + monitorHeight / 2 - 0.05, -0.2 + monitorDepth / 2 + 0.002);
      screenMesh.userData = {
        workerId: targetWorkerId,
        type: 'monitor_screen',
      };
      stationGroup.add(screenMesh);
      this.screenMeshes.push(screenMesh);

      // Store display mapping
      this.displays.set(targetWorkerId, {
        workerId: targetWorkerId,
        canvas,
        ctx,
        texture,
        screenMesh,
        dirty: true,
      });

      // Secondary Angled Monitor
      const secBezel = new THREE.Mesh(bezelGeom, bezelMaterial);
      secBezel.position.set(-0.75, deskY + standHeight + monitorHeight / 2 - 0.05, -0.15);
      secBezel.rotation.y = 0.25; // Angled slightly inward
      secBezel.castShadow = true;
      stationGroup.add(secBezel);

      const secScreenMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const secScreen = new THREE.Mesh(screenGeom, secScreenMat);
      secScreen.position.set(-0.75, deskY + standHeight + monitorHeight / 2 - 0.05, -0.15 + monitorDepth / 2 + 0.002);
      secScreen.rotation.y = 0.25;
      stationGroup.add(secScreen);

      // 3. Desktop Tower on Floor beside desk
      const towerGeom = new THREE.BoxGeometry(0.25, 0.45, 0.5);
      const towerMesh = new THREE.Mesh(towerGeom, computerTowerMaterial);
      towerMesh.position.set(deskWidth / 2 - 0.2, 0.45 / 2, 0.1);
      towerMesh.castShadow = true;
      stationGroup.add(towerMesh);

      // 4. Keyboard & Mousepad on desk
      const padGeom = new THREE.BoxGeometry(0.9, 0.005, 0.4);
      const padMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 });
      const padMesh = new THREE.Mesh(padGeom, padMat);
      padMesh.position.set(0, deskY + deskHeight / 2 + 0.003, 0.15);
      stationGroup.add(padMesh);

      const kbGeom = new THREE.BoxGeometry(0.48, 0.015, 0.16);
      const kbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
      const kbMesh = new THREE.Mesh(kbGeom, kbMat);
      kbMesh.position.set(-0.1, deskY + deskHeight / 2 + 0.01, 0.15);
      stationGroup.add(kbMesh);

      // 5. Office Chair
      const chairSeatGeom = new THREE.BoxGeometry(0.55, 0.08, 0.52);
      const chairSeat = new THREE.Mesh(chairSeatGeom, chairMaterial);
      chairSeat.position.set(0, 0.52, 0.65);
      chairSeat.castShadow = true;
      stationGroup.add(chairSeat);

      const chairBackGeom = new THREE.BoxGeometry(0.52, 0.6, 0.06);
      const chairBack = new THREE.Mesh(chairBackGeom, chairMaterial);
      chairBack.position.set(0, 0.85, 0.88);
      chairBack.castShadow = true;
      stationGroup.add(chairBack);

      const chairStemGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 12);
      const chairStem = new THREE.Mesh(chairStemGeom, legMaterial);
      chairStem.position.set(0, 0.25, 0.65);
      stationGroup.add(chairStem);

      this.group.add(stationGroup);
    });
  }

  public renderMonitorCanvas(display: WorkerMonitorDisplay): void {
    const { canvas, ctx, texture, workerId } = display;
    if (!canvas || !ctx || !texture) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background terminal slate
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, width, height);

    // Title bar
    const isSelected = workerId === this.activeWorkerId;
    ctx.fillStyle = isSelected ? '#1e293b' : '#111827';
    ctx.fillRect(0, 0, width, 28);

    // Traffic light dots
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(14, 14, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(28, 14, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(42, 14, 5, 0, Math.PI * 2);
    ctx.fill();

    // Title text
    const worker = this.store.getWorker(workerId);
    ctx.fillStyle = isSelected ? '#38bdf8' : '#94a3b8';
    ctx.font = 'bold 12px monospace';
    ctx.fillText(`@${workerId} - ${worker?.role || 'Live Terminal'}`, 58, 18);

    // Render code stream lines
    const lines = this.simulator.getLines(workerId);
    const visibleLines = lines.slice(-12); // Last 12 lines fit nicely on 256px height

    let y = 46;
    const lineHeight = 16;
    ctx.font = '11px monospace';

    for (const line of visibleLines) {
      switch (line.type) {
        case 'command':
          ctx.fillStyle = '#38bdf8';
          ctx.font = 'bold 11px monospace';
          break;
        case 'thought':
          ctx.fillStyle = '#c084fc';
          ctx.font = 'italic 11px monospace';
          break;
        case 'diff-add':
          ctx.fillStyle = '#34d399';
          ctx.font = '11px monospace';
          break;
        case 'diff-del':
          ctx.fillStyle = '#f87171';
          ctx.font = '11px monospace';
          break;
        case 'diff-header':
          ctx.fillStyle = '#60a5fa';
          ctx.font = 'bold 11px monospace';
          break;
        case 'success':
          ctx.fillStyle = '#10b981';
          ctx.font = '11px monospace';
          break;
        case 'error':
          ctx.fillStyle = '#ef4444';
          ctx.font = 'bold 11px monospace';
          break;
        default:
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '11px monospace';
          break;
      }

      // Truncate long lines to canvas width
      const maxChars = 58;
      const text = line.text.length > maxChars ? line.text.substring(0, maxChars) + '…' : line.text;
      ctx.fillText(text, 12, y);
      y += lineHeight;
    }

    // Prompt cursor line at bottom
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`$ `, 12, height - 8);

    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(24, height - 18, 6, 12);

    texture.needsUpdate = true;
    display.dirty = false;
  }

  public setActiveWorker(workerId: string): void {
    this.activeWorkerId = workerId;
    const display = this.displays.get(workerId);
    if (display) {
      display.dirty = true;
    }
  }

  public getActiveWorkerId(): string {
    return this.activeWorkerId;
  }

  public getScreenMeshes(): THREE.Mesh[] {
    return this.screenMeshes;
  }

  public update(): void {
    const now = performance.now();
    if (now - this.lastRenderTime < this.renderThrottleMs) return;

    this.displays.forEach((display) => {
      if (display.dirty) {
        this.renderMonitorCanvas(display);
      }
    });

    this.lastRenderTime = now;
  }

  public destroy(): void {
    this.unsubscribeSelect?.();
    this.unsubscribeLines?.();
    this.displays.forEach((display) => {
      display.texture?.dispose();
    });
    this.displays.clear();
  }
}
