import * as THREE from 'three';
import type { WorkstationConfig } from '../types/index.ts';

/**
 * Creates procedural canvas texture representing code/terminal text on dual monitors.
 * Safe for headless test environments (returns null if document is undefined).
 */
function createScreenTexture(isCodeEditor: boolean = true): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const width = 512;
  const height = 288; // 16:9 aspect ratio
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Editor background: deep dark theme
    ctx.fillStyle = isCodeEditor ? '#0d1117' : '#161b22';
    ctx.fillRect(0, 0, width, height);

    // Window top bar
    ctx.fillStyle = '#21262d';
    ctx.fillRect(0, 0, width, 24);

    // Window control buttons
    ctx.fillStyle = '#ff5f56';
    ctx.beginPath();
    ctx.arc(14, 12, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffbd2e';
    ctx.beginPath();
    ctx.arc(28, 12, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#27c93f';
    ctx.beginPath();
    ctx.arc(42, 12, 4, 0, Math.PI * 2);
    ctx.fill();

    // Editor lines of code representation
    const colors = ['#79c0ff', '#7ee787', '#d2a8ff', '#ffa657', '#8b949e', '#ff7b72'];
    let y = 38;
    const lineHeight = 11;

    for (let i = 0; i < 20; i++) {
      const indent = (i % 5 === 0 ? 10 : (i % 3 === 0 ? 30 : 20));
      let x = indent;
      const numTokens = 2 + (i % 4);

      for (let t = 0; t < numTokens; t++) {
        const tokenWidth = 18 + ((i * 17 + t * 23) % 45);
        ctx.fillStyle = colors[(i + t) % colors.length];
        ctx.fillRect(x, y, tokenWidth, 5);
        x += tokenWidth + 8;
      }
      y += lineHeight;
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class Workstation {
  public readonly id: string;
  public group: THREE.Group;
  public isHighlighted: boolean = false;

  private deskMatMaterial!: THREE.MeshStandardMaterial;
  private highlightAccentMesh!: THREE.Mesh;
  private highlightLight!: THREE.PointLight;

  constructor(config: WorkstationConfig) {
    this.id = config.id;
    this.group = new THREE.Group();
    this.group.name = `workstation_${config.id}`;

    this.buildWorkstation(config);

    this.group.position.set(...config.position);
    this.group.rotation.y = config.rotation;
  }

  private buildWorkstation(config: WorkstationConfig): void {
    // 1. Desk Assembly
    const deskWidth = 1.8;
    const deskDepth = 0.9;
    const deskThickness = 0.04;
    const deskHeight = 0.74;

    const deskTopMaterial = new THREE.MeshStandardMaterial({
      color: config.deskColor ?? 0x1e293b,
      roughness: 0.6,
      metalness: 0.15,
    });

    const steelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.8,
    });

    // Tabletop
    const deskTopGeom = new THREE.BoxGeometry(deskWidth, deskThickness, deskDepth);
    const deskTop = new THREE.Mesh(deskTopGeom, deskTopMaterial);
    deskTop.position.set(0, deskHeight - deskThickness / 2, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskTop.name = 'desk_tabletop';
    this.group.add(deskTop);

    // Sturdy steel legs (trapezoid frame profile)
    const legWidth = 0.05;
    const legDepth = deskDepth * 0.85;
    const legHeight = deskHeight - deskThickness;

    const legGeom = new THREE.BoxGeometry(legWidth, legHeight, legDepth);
    const leftLeg = new THREE.Mesh(legGeom, steelMaterial);
    leftLeg.position.set(-deskWidth / 2 + 0.12, legHeight / 2, 0);
    leftLeg.castShadow = true;
    leftLeg.receiveShadow = true;
    leftLeg.name = 'desk_leg_left';
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, steelMaterial);
    rightLeg.position.set(deskWidth / 2 - 0.12, legHeight / 2, 0);
    rightLeg.castShadow = true;
    rightLeg.receiveShadow = true;
    rightLeg.name = 'desk_leg_right';
    this.group.add(rightLeg);

    // Crossbar / cable management trough under desk
    const beamGeom = new THREE.BoxGeometry(deskWidth - 0.3, 0.04, 0.08);
    const crossBeam = new THREE.Mesh(beamGeom, steelMaterial);
    crossBeam.position.set(0, deskHeight - 0.1, -0.15);
    crossBeam.castShadow = true;
    this.group.add(crossBeam);

    // Under-desk subtle LED strip for selection highlight
    const ledGeom = new THREE.BoxGeometry(deskWidth - 0.2, 0.015, 0.02);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.1,
      roughness: 0.2,
    });
    this.highlightAccentMesh = new THREE.Mesh(ledGeom, ledMat);
    this.highlightAccentMesh.position.set(0, deskHeight - deskThickness - 0.01, 0.38);
    this.highlightAccentMesh.name = 'workstation_accent_led';
    this.group.add(this.highlightAccentMesh);

    this.highlightLight = new THREE.PointLight(0x38bdf8, 0, 3, 1.5);
    this.highlightLight.position.set(0, deskHeight - 0.15, 0.3);
    this.group.add(this.highlightLight);

    // 2. Dual-Monitor Mount & Screens
    const poleHeight = 0.44;
    const poleRadius = 0.018;
    const poleGeom = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 16);
    const pole = new THREE.Mesh(poleGeom, steelMaterial);
    pole.position.set(0, deskHeight + poleHeight / 2, -0.3);
    pole.castShadow = true;
    pole.name = 'monitor_mount_pole';
    this.group.add(pole);

    // Horizontal VESA articulated crossbar
    const barWidth = 0.8;
    const barGeom = new THREE.BoxGeometry(barWidth, 0.025, 0.025);
    const bar = new THREE.Mesh(barGeom, steelMaterial);
    bar.position.set(0, deskHeight + poleHeight * 0.75, -0.28);
    bar.castShadow = true;
    this.group.add(bar);

    // Dual monitors (Left & Right, tilted inward ~14 deg)
    const monitorWidth = 0.52;
    const monitorHeight = 0.32;
    const monitorBezelDepth = 0.018;
    const screenWidth = monitorWidth - 0.02;
    const screenHeight = monitorHeight - 0.02;

    const bezelMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.3,
      metalness: 0.8,
    });

    const screenTextureLeft = createScreenTexture(true);
    const screenTextureRight = createScreenTexture(false);

    const leftScreenMat = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.35,
    });
    if (screenTextureLeft) leftScreenMat.map = screenTextureLeft;

    const rightScreenMat = new THREE.MeshStandardMaterial({
      roughness: 0.2,
      metalness: 0.1,
      emissive: 0x10b981,
      emissiveIntensity: 0.35,
    });
    if (screenTextureRight) rightScreenMat.map = screenTextureRight;

    // Monitor Left
    const monitorLeftGroup = new THREE.Group();
    monitorLeftGroup.name = 'monitor_left';
    const bezelLeft = new THREE.Mesh(
      new THREE.BoxGeometry(monitorWidth, monitorHeight, monitorBezelDepth),
      bezelMaterial
    );
    bezelLeft.castShadow = true;
    monitorLeftGroup.add(bezelLeft);

    const screenLeft = new THREE.Mesh(
      new THREE.PlaneGeometry(screenWidth, screenHeight),
      leftScreenMat
    );
    screenLeft.position.set(0, 0, monitorBezelDepth / 2 + 0.001); // 1mm offset avoids z-fighting
    monitorLeftGroup.add(screenLeft);

    monitorLeftGroup.position.set(-0.3, deskHeight + 0.35, -0.25);
    monitorLeftGroup.rotation.y = 0.22; // angled inward
    this.group.add(monitorLeftGroup);

    // Monitor Right
    const monitorRightGroup = new THREE.Group();
    monitorRightGroup.name = 'monitor_right';
    const bezelRight = new THREE.Mesh(
      new THREE.BoxGeometry(monitorWidth, monitorHeight, monitorBezelDepth),
      bezelMaterial
    );
    bezelRight.castShadow = true;
    monitorRightGroup.add(bezelRight);

    const screenRight = new THREE.Mesh(
      new THREE.PlaneGeometry(screenWidth, screenHeight),
      rightScreenMat
    );
    screenRight.position.set(0, 0, monitorBezelDepth / 2 + 0.001);
    monitorRightGroup.add(screenRight);

    monitorRightGroup.position.set(0.3, deskHeight + 0.35, -0.25);
    monitorRightGroup.rotation.y = -0.22; // angled inward
    this.group.add(monitorRightGroup);

    // 3. Desktop Tower
    const towerWidth = 0.2;
    const towerHeight = 0.44;
    const towerDepth = 0.42;

    const towerGroup = new THREE.Group();
    towerGroup.name = 'desktop_tower';

    const towerCaseMat = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.35,
      metalness: 0.85,
    });
    const towerCase = new THREE.Mesh(
      new THREE.BoxGeometry(towerWidth, towerHeight, towerDepth),
      towerCaseMat
    );
    towerCase.position.set(0, towerHeight / 2, 0);
    towerCase.castShadow = true;
    towerCase.receiveShadow = true;
    towerGroup.add(towerCase);

    // Front intake panel with LED strip
    const towerLedMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    });
    const towerLed = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, towerHeight * 0.7, 0.01),
      towerLedMat
    );
    towerLed.position.set(0, towerHeight / 2, towerDepth / 2 + 0.005);
    towerGroup.add(towerLed);

    towerGroup.position.set(deskWidth / 2 - 0.24, 0, 0.05);
    this.group.add(towerGroup);

    // 4. Desk Accessories (Mat, Keyboard, Mouse)
    const matWidth = 0.8;
    const matDepth = 0.36;
    this.deskMatMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.9,
      metalness: 0.05,
    });
    const matGeom = new THREE.BoxGeometry(matWidth, 0.004, matDepth);
    const deskMat = new THREE.Mesh(matGeom, this.deskMatMaterial);
    deskMat.position.set(0, deskHeight + 0.002, 0.12);
    deskMat.receiveShadow = true;
    deskMat.name = 'desk_mat';
    this.group.add(deskMat);

    // Keyboard
    const kbGeom = new THREE.BoxGeometry(0.36, 0.015, 0.13);
    const kbMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.5,
      metalness: 0.3,
    });
    const keyboard = new THREE.Mesh(kbGeom, kbMat);
    keyboard.position.set(-0.06, deskHeight + 0.01, 0.14);
    keyboard.castShadow = true;
    keyboard.name = 'keyboard';
    this.group.add(keyboard);

    // Mouse
    const mouseGeom = new THREE.BoxGeometry(0.065, 0.022, 0.1);
    const mouseMat = new THREE.MeshStandardMaterial({
      color: 0x3f3f46,
      roughness: 0.4,
      metalness: 0.2,
    });
    const mouse = new THREE.Mesh(mouseGeom, mouseMat);
    mouse.position.set(0.22, deskHeight + 0.013, 0.14);
    mouse.castShadow = true;
    mouse.name = 'mouse';
    this.group.add(mouse);

    // 5. Ergonomic Chair
    const chairGroup = this.buildErgonomicChair();
    chairGroup.name = 'ergonomic_chair';
    chairGroup.position.set(0, 0, 0.65); // In front of desk
    this.group.add(chairGroup);
  }

  private buildErgonomicChair(): THREE.Group {
    const chair = new THREE.Group();

    const chromeMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.9,
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.7,
      metalness: 0.1,
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x27272a,
      roughness: 0.85,
      metalness: 0.05,
    });

    // 5-star base spokes
    const baseRadius = 0.28;
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5;
      const spoke = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012, 0.014, baseRadius, 8),
        chromeMat
      );
      spoke.rotation.z = Math.PI / 2;
      spoke.rotation.y = angle;
      spoke.position.set(
        Math.cos(angle) * (baseRadius / 2),
        0.06,
        Math.sin(angle) * (baseRadius / 2)
      );
      spoke.castShadow = true;
      chair.add(spoke);

      // Caster wheel
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.02, 0.018, 12),
        blackMat
      );
      wheel.rotation.x = Math.PI / 2;
      wheel.position.set(
        Math.cos(angle) * baseRadius,
        0.03,
        Math.sin(angle) * baseRadius
      );
      wheel.castShadow = true;
      chair.add(wheel);
    }

    // Gas lift cylinder
    const piston = new THREE.Mesh(
      new THREE.CylinderGeometry(0.024, 0.028, 0.38, 12),
      chromeMat
    );
    piston.position.set(0, 0.25, 0);
    piston.castShadow = true;
    chair.add(piston);

    // Seat cushion
    const seatWidth = 0.48;
    const seatDepth = 0.46;
    const seatThickness = 0.06;
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(seatWidth, seatThickness, seatDepth),
      cushionMat
    );
    seat.position.set(0, 0.46, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;
    chair.add(seat);

    // Backrest with lumbar contour
    const backWidth = 0.44;
    const backHeight = 0.52;
    const backThickness = 0.04;
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(backWidth, backHeight, backThickness),
      cushionMat
    );
    backrest.position.set(0, 0.74, 0.22);
    backrest.rotation.x = -0.08;
    backrest.castShadow = true;
    chair.add(backrest);

    // Armrests
    const armRestGeom = new THREE.BoxGeometry(0.06, 0.025, 0.22);
    const armSupportGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.22, 8);

    const leftArmSupport = new THREE.Mesh(armSupportGeom, blackMat);
    leftArmSupport.position.set(-seatWidth / 2 + 0.03, 0.55, 0.04);
    chair.add(leftArmSupport);

    const leftArmPad = new THREE.Mesh(armRestGeom, blackMat);
    leftArmPad.position.set(-seatWidth / 2 + 0.03, 0.66, 0.04);
    leftArmPad.castShadow = true;
    chair.add(leftArmPad);

    const rightArmSupport = new THREE.Mesh(armSupportGeom, blackMat);
    rightArmSupport.position.set(seatWidth / 2 - 0.03, 0.55, 0.04);
    chair.add(rightArmSupport);

    const rightArmPad = new THREE.Mesh(armRestGeom, blackMat);
    rightArmPad.position.set(seatWidth / 2 - 0.03, 0.66, 0.04);
    rightArmPad.castShadow = true;
    chair.add(rightArmPad);

    return chair;
  }

  public setHighlight(highlight: boolean): void {
    this.isHighlighted = highlight;
    if (this.highlightAccentMesh) {
      const mat = this.highlightAccentMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = highlight ? 2.5 : 0.1;
    }
    if (this.highlightLight) {
      this.highlightLight.intensity = highlight ? 2.0 : 0;
    }
    if (this.deskMatMaterial) {
      this.deskMatMaterial.color.setHex(highlight ? 0x1e3a5f : 0x18181b);
    }
  }
}
