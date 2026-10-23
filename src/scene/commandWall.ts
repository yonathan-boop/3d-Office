import * as THREE from 'three';
import type { ActivityEvent, OfficeKPIs } from '../types/index.ts';

export class CommandWallScreen {
  public group: THREE.Group;
  public screenMesh: THREE.Mesh;
  public bezelMesh: THREE.Mesh;

  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private texture: THREE.CanvasTexture | null = null;
  private lastRenderTime: number = 0;

  constructor(
    width: number = 6.4,
    height: number = 2.2,
    position: [number, number, number] = [0, 2.3, -7.92]
  ) {
    this.group = new THREE.Group();
    this.group.name = 'command_wall_display';
    this.group.position.set(...position);

    // Bezel casing
    const bezelWidth = width + 0.16;
    const bezelHeight = height + 0.16;
    const bezelDepth = 0.06;
    const bezelGeom = new THREE.BoxGeometry(bezelWidth, bezelHeight, bezelDepth);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.5,
      metalness: 0.8,
    });
    this.bezelMesh = new THREE.Mesh(bezelGeom, bezelMat);
    this.bezelMesh.name = 'command_wall_bezel';
    this.bezelMesh.castShadow = true;
    this.group.add(this.bezelMesh);

    // Dynamic Canvas Texture
    if (typeof document !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 1024;
      this.canvas.height = 512;
      this.ctx = this.canvas.getContext('2d');

      this.texture = new THREE.CanvasTexture(this.canvas);
      this.texture.colorSpace = THREE.SRGBColorSpace;
      this.drawCanvas(
        { activeWorkers: 3, idleWorkers: 1, tasksInProgress: 3, commitsPerHour: 18, fps: 60 },
        []
      );
    }

    // Screen display panel
    const screenGeom = new THREE.PlaneGeometry(width, height);
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.25,
      metalness: 0.05,
      map: this.texture,
      emissive: 0x334155,
      emissiveIntensity: 0.6,
      emissiveMap: this.texture,
    });
    this.screenMesh = new THREE.Mesh(screenGeom, screenMat);
    this.screenMesh.name = 'command_wall_screen';
    this.screenMesh.position.set(0, 0, bezelDepth / 2 + 0.005);
    this.group.add(this.screenMesh);
  }

  public update(kpis: OfficeKPIs, events: ActivityEvent[]): void {
    if (!this.canvas || !this.ctx || !this.texture) return;

    // Throttle canvas texture re-render to max once every 250ms for performance
    const now = performance.now();
    if (now - this.lastRenderTime < 250) return;
    this.lastRenderTime = now;

    this.drawCanvas(kpis, events);
    this.texture.needsUpdate = true;
  }

  private drawCanvas(kpis: OfficeKPIs, events: ActivityEvent[]): void {
    const ctx = this.ctx;
    if (!ctx || !this.canvas) return;

    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Subtle technical grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Top Header Banner
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, 56);
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(0, 54, w, 2);

    // Pulse dot
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(30, 28, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CUBEFARM COMMAND // OFFICE STATUS DASHBOARD', 50, 35);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`SYSTEM FPS: ${Math.round(kpis.fps)}  |  ONLINE`, w - 24, 35);
    ctx.textAlign = 'left';

    // 4 KPI Cards
    const cardY = 74;
    const cardH = 92;
    const cardW = (w - 50) / 4;

    const cards = [
      { label: 'ACTIVE WORKERS', val: `${kpis.activeWorkers}`, sub: 'Online in pods', color: '#38bdf8' },
      { label: 'IDLE WORKERS', val: `${kpis.idleWorkers}`, sub: 'Ready for assignment', color: '#f59e0b' },
      { label: 'TASKS IN FLIGHT', val: `${kpis.tasksInProgress}`, sub: 'Active sprints', color: '#a855f7' },
      { label: 'THROUGHPUT', val: `${kpis.commitsPerHour}`, sub: 'Commits / hour', color: '#10b981' },
    ];

    cards.forEach((c, idx) => {
      const cx = 20 + idx * (cardW + 3);
      ctx.fillStyle = 'rgba(30, 41, 59, 0.7)';
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx, cardY, cardW, cardH, 8);
      ctx.fill();
      ctx.stroke();

      // Top color indicator bar
      ctx.fillStyle = c.color;
      ctx.fillRect(cx + 12, cardY + 12, 4, cardH - 24);

      ctx.fillStyle = '#94a3b8';
      ctx.font = 'bold 11px monospace';
      ctx.fillText(c.label, cx + 24, cardY + 28);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(c.val, cx + 24, cardY + 62);

      ctx.fillStyle = '#64748b';
      ctx.font = '11px sans-serif';
      ctx.fillText(c.sub, cx + 24, cardY + 80);
    });

    // Lower Left Panel: Hourly Throughput Sparkline/Bars
    const chartX = 20;
    const chartY = 186;
    const chartW = 420;
    const chartH = 300;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.roundRect(chartX, chartY, chartW, chartH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('VELOCITY & COMMIT THROUGHPUT', chartX + 16, chartY + 28);

    // Bar chart
    const bars = [8, 11, 14, 10, 16, 13, 19, 15, 18, 22, 17, kpis.commitsPerHour];
    const barAreaW = chartW - 40;
    const barAreaH = 210;
    const barW = barAreaW / bars.length - 8;
    const maxVal = 25;

    bars.forEach((val, i) => {
      const bh = (val / maxVal) * barAreaH;
      const bx = chartX + 20 + i * (barW + 8);
      const by = chartY + chartH - 30 - bh;

      // Gradient bar
      const grad = ctx.createLinearGradient(0, by, 0, by + bh);
      grad.addColorStop(0, '#38bdf8');
      grad.addColorStop(1, 'rgba(16, 185, 129, 0.3)');
      ctx.fillStyle = grad;
      ctx.fillRect(bx, by, barW, bh);

      // Value text
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(val.toString(), bx + barW / 2, by - 6);
      ctx.fillText(`T-${11 - i}`, bx + barW / 2, chartY + chartH - 12);
    });
    ctx.textAlign = 'left';

    // Lower Right Panel: Real-Time Milestone Activity Stream
    const feedX = 460;
    const feedY = 186;
    const feedW = w - feedX - 20;
    const feedH = 300;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.65)';
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
    ctx.beginPath();
    ctx.roundRect(feedX, feedY, feedW, feedH, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('REAL-TIME AGENT MILESTONE FEED', feedX + 16, feedY + 28);

    const displayEvents = events.slice(0, 5);
    let eventY = feedY + 62;

    if (displayEvents.length === 0) {
      ctx.fillStyle = '#64748b';
      ctx.font = '13px monospace';
      ctx.fillText('Streaming agent events...', feedX + 24, eventY);
    } else {
      displayEvents.forEach((evt) => {
        const timeStr = new Date(evt.timestamp).toTimeString().substring(0, 8);

        // Dot tag
        ctx.fillStyle = evt.type === 'pr_merged' ? '#10b981' : evt.type === 'task_started' ? '#38bdf8' : '#a855f7';
        ctx.beginPath();
        ctx.arc(feedX + 24, eventY - 4, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.fillText(`[${timeStr}]`, feedX + 36, eventY);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(evt.workerName, feedX + 115, eventY);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        const actionTrunc = evt.action.length > 40 ? evt.action.substring(0, 38) + '...' : evt.action;
        ctx.fillText(actionTrunc, feedX + 225, eventY);

        eventY += 46;
      });
    }
  }
}
