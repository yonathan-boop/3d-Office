import * as THREE from 'three';
import { WorkerState } from './worker-state.ts';
import type { WorkerStatus } from '../types/index.ts';

/**
 * Creates dynamic canvas texture for floating nameplate.
 * Renders avatar name and colored status badge.
 */
function createNameplateTexture(name: string, role: string, status: WorkerStatus, accentColor: number): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const width = 512;
  const height = 160;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Transparent background with rounded dark glass card
    ctx.clearRect(0, 0, width, height);

    const radius = 24;
    const pad = 12;
    const cardW = width - pad * 2;
    const cardH = height - pad * 2;

    // Card background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, cardW, cardH, radius);
    ctx.fill();

    // Border
    const hexAccent = `#${accentColor.toString(16).padStart(6, '0')}`;
    ctx.strokeStyle = hexAccent;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Worker name
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(name, pad + 24, pad + 56);

    // Role text
    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(role, pad + 24, pad + 96);

    // Status pill
    let statusBg = '#64748b';
    let statusText = status.toUpperCase();
    if (status === 'coding') {
      statusBg = '#10b981'; // emerald green
    } else if (status === 'reviewing') {
      statusBg = '#38bdf8'; // sky blue
    } else if (status === 'idle') {
      statusBg = '#f59e0b'; // amber
    }

    const pillW = 140;
    const pillH = 44;
    const pillX = cardW + pad - pillW - 20;
    const pillY = pad + 38;

    ctx.fillStyle = statusBg;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, 22);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(statusText, pillX + pillW / 2, pillY + pillH / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class WorkerAvatar {
  public readonly id: string;
  public readonly state: WorkerState;
  public group: THREE.Group;
  public isSelected: boolean = false;

  // Animated anatomical parts
  public headGroup!: THREE.Group;
  public torsoGroup!: THREE.Group;
  public leftArmGroup!: THREE.Group;
  public rightArmGroup!: THREE.Group;
  public leftForearm!: THREE.Group;
  public rightForearm!: THREE.Group;
  public hitBox!: THREE.Mesh;
  public nameplateSprite!: THREE.Sprite;
  public selectionRing!: THREE.Mesh;

  private time: number = 0;
  private baseTorsoY: number = 0.52;
  private baseArmAngle: number = -0.55;

  constructor(state: WorkerState) {
    this.state = state;
    this.id = state.id;
    this.group = new THREE.Group();
    this.group.name = `worker_avatar_${state.id}`;

    this.buildAvatar();
    this.updateNameplate();

    // Listen for status changes to update nameplate
    this.state.onStatusChange(() => {
      this.updateNameplate();
    });
  }

  private buildAvatar(): void {
    const skinMaterial = new THREE.MeshStandardMaterial({
      color: 0xf5d0b5,
      roughness: 0.7,
      metalness: 0.05,
    });

    const clothingMaterial = new THREE.MeshStandardMaterial({
      color: this.state.avatarColor,
      roughness: 0.65,
      metalness: 0.1,
    });

    const accentMaterial = new THREE.MeshStandardMaterial({
      color: this.state.accentColor,
      roughness: 0.4,
      metalness: 0.2,
    });

    const darkPantsMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
      metalness: 0.1,
    });

    // 1. Seated Legs & Hips
    // Pelvis/Hips
    const pelvisGeom = new THREE.BoxGeometry(0.32, 0.12, 0.28);
    const pelvis = new THREE.Mesh(pelvisGeom, darkPantsMaterial);
    pelvis.position.set(0, 0.48, 0.60);
    pelvis.castShadow = true;
    pelvis.receiveShadow = true;
    pelvis.name = 'avatar_pelvis';
    this.group.add(pelvis);

    // Thighs (horizontal from chair to front of seat)
    const thighGeom = new THREE.BoxGeometry(0.12, 0.11, 0.32);
    const leftThigh = new THREE.Mesh(thighGeom, darkPantsMaterial);
    leftThigh.position.set(-0.1, 0.48, 0.44);
    leftThigh.castShadow = true;
    this.group.add(leftThigh);

    const rightThigh = new THREE.Mesh(thighGeom, darkPantsMaterial);
    rightThigh.position.set(0.1, 0.48, 0.44);
    rightThigh.castShadow = true;
    this.group.add(rightThigh);

    // Shins/Lower legs (vertical from seat edge down to floor)
    const shinGeom = new THREE.BoxGeometry(0.10, 0.42, 0.10);
    const leftShin = new THREE.Mesh(shinGeom, darkPantsMaterial);
    leftShin.position.set(-0.1, 0.22, 0.28);
    leftShin.castShadow = true;
    this.group.add(leftShin);

    const rightShin = new THREE.Mesh(shinGeom, darkPantsMaterial);
    rightShin.position.set(0.1, 0.22, 0.28);
    rightShin.castShadow = true;
    this.group.add(rightShin);

    // Shoes
    const shoeGeom = new THREE.BoxGeometry(0.11, 0.06, 0.16);
    const leftShoe = new THREE.Mesh(shoeGeom, accentMaterial);
    leftShoe.position.set(-0.1, 0.03, 0.25);
    leftShoe.castShadow = true;
    this.group.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeom, accentMaterial);
    rightShoe.position.set(0.1, 0.03, 0.25);
    rightShoe.castShadow = true;
    this.group.add(rightShoe);

    // 2. Torso Group (breathes and tilts)
    this.torsoGroup = new THREE.Group();
    this.torsoGroup.position.set(0, this.baseTorsoY, 0.60);
    this.torsoGroup.name = 'avatar_torso';

    const torsoWidth = 0.36;
    const torsoHeight = 0.38;
    const torsoDepth = 0.22;
    const torsoGeom = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
    const torsoMesh = new THREE.Mesh(torsoGeom, clothingMaterial);
    torsoMesh.position.set(0, torsoHeight / 2, 0);
    torsoMesh.castShadow = true;
    torsoMesh.receiveShadow = true;
    this.torsoGroup.add(torsoMesh);

    // Accent hoodie stripe / chest badge
    const badgeGeom = new THREE.BoxGeometry(0.08, 0.08, 0.01);
    const badgeMesh = new THREE.Mesh(badgeGeom, accentMaterial);
    badgeMesh.position.set(0.08, torsoHeight * 0.7, -torsoDepth / 2 - 0.005);
    this.torsoGroup.add(badgeMesh);

    // 3. Head Group (attached above torso)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, torsoHeight + 0.12, 0);
    this.headGroup.name = 'avatar_head';

    // Neck
    const neckGeom = new THREE.CylinderGeometry(0.05, 0.06, 0.08, 12);
    const neck = new THREE.Mesh(neckGeom, skinMaterial);
    neck.position.set(0, -0.06, 0);
    this.headGroup.add(neck);

    // Head base (stylized clean box/rounded feel)
    const headGeom = new THREE.BoxGeometry(0.22, 0.24, 0.22);
    const headMesh = new THREE.Mesh(headGeom, skinMaterial);
    headMesh.castShadow = true;
    this.headGroup.add(headMesh);

    // Hair / Headset
    const hairGeom = new THREE.BoxGeometry(0.24, 0.10, 0.24);
    const hairMesh = new THREE.Mesh(hairGeom, accentMaterial);
    hairMesh.position.set(0, 0.10, 0);
    hairMesh.castShadow = true;
    this.headGroup.add(hairMesh);

    // Developer headset / headphones
    const headphoneBandGeom = new THREE.TorusGeometry(0.13, 0.015, 8, 24, Math.PI);
    const headphoneBand = new THREE.Mesh(headphoneBandGeom, accentMaterial);
    headphoneBand.rotation.x = Math.PI / 2;
    headphoneBand.position.set(0, 0.08, 0);
    this.headGroup.add(headphoneBand);

    const earCupGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.03, 12);
    const leftCup = new THREE.Mesh(earCupGeom, accentMaterial);
    leftCup.rotation.z = Math.PI / 2;
    leftCup.position.set(-0.12, 0, 0);
    this.headGroup.add(leftCup);

    const rightCup = new THREE.Mesh(earCupGeom, accentMaterial);
    rightCup.rotation.z = Math.PI / 2;
    rightCup.position.set(0.12, 0, 0);
    this.headGroup.add(rightCup);

    this.torsoGroup.add(this.headGroup);

    // 4. Arms & Forearms (typing & idle animations)
    // Left Arm
    this.leftArmGroup = new THREE.Group();
    this.leftArmGroup.name = 'avatar_arm_left';
    this.leftArmGroup.position.set(-torsoWidth / 2 - 0.04, torsoHeight - 0.05, 0);

    const upperArmGeom = new THREE.BoxGeometry(0.08, 0.22, 0.08);
    const leftUpperArm = new THREE.Mesh(upperArmGeom, clothingMaterial);
    leftUpperArm.position.set(0, -0.11, 0);
    leftUpperArm.castShadow = true;
    this.leftArmGroup.add(leftUpperArm);

    // Left Forearm hinged at elbow
    this.leftForearm = new THREE.Group();
    this.leftForearm.position.set(0, -0.22, 0);
    this.leftForearm.rotation.x = this.baseArmAngle;

    const forearmGeom = new THREE.BoxGeometry(0.07, 0.24, 0.07);
    const leftForearmMesh = new THREE.Mesh(forearmGeom, skinMaterial);
    leftForearmMesh.position.set(0, -0.12, 0);
    leftForearmMesh.castShadow = true;
    this.leftForearm.add(leftForearmMesh);

    // Left Hand
    const handGeom = new THREE.BoxGeometry(0.07, 0.05, 0.06);
    const leftHand = new THREE.Mesh(handGeom, skinMaterial);
    leftHand.position.set(0, -0.24, 0);
    this.leftForearm.add(leftHand);

    this.leftArmGroup.add(this.leftForearm);
    this.torsoGroup.add(this.leftArmGroup);

    // Right Arm
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.name = 'avatar_arm_right';
    this.rightArmGroup.position.set(torsoWidth / 2 + 0.04, torsoHeight - 0.05, 0);

    const rightUpperArm = new THREE.Mesh(upperArmGeom, clothingMaterial);
    rightUpperArm.position.set(0, -0.11, 0);
    rightUpperArm.castShadow = true;
    this.rightArmGroup.add(rightUpperArm);

    // Right Forearm hinged at elbow
    this.rightForearm = new THREE.Group();
    this.rightForearm.position.set(0, -0.22, 0);
    this.rightForearm.rotation.x = this.baseArmAngle;

    const rightForearmMesh = new THREE.Mesh(forearmGeom, skinMaterial);
    rightForearmMesh.position.set(0, -0.12, 0);
    rightForearmMesh.castShadow = true;
    this.rightForearm.add(rightForearmMesh);

    // Right Hand
    const rightHand = new THREE.Mesh(handGeom, skinMaterial);
    rightHand.position.set(0, -0.24, 0);
    this.rightForearm.add(rightHand);

    this.rightArmGroup.add(this.rightForearm);
    this.torsoGroup.add(this.rightArmGroup);

    this.group.add(this.torsoGroup);

    // 5. Floating Nameplate Sprite
    const nameplateMat = new THREE.SpriteMaterial({
      transparent: true,
      depthTest: false,
    });
    this.nameplateSprite = new THREE.Sprite(nameplateMat);
    this.nameplateSprite.name = 'avatar_nameplate';
    this.nameplateSprite.scale.set(1.1, 0.35, 1);
    this.nameplateSprite.position.set(0, 1.35, 0.60);
    this.group.add(this.nameplateSprite);

    // 6. Raycast Hit Box (invisible volume encompassing avatar)
    const hitBoxGeom = new THREE.BoxGeometry(0.75, 1.4, 0.75);
    const hitBoxMat = new THREE.MeshBasicMaterial({
      visible: false,
      wireframe: true,
    });
    this.hitBox = new THREE.Mesh(hitBoxGeom, hitBoxMat);
    this.hitBox.position.set(0, 0.7, 0.55);
    this.hitBox.name = 'avatar_hit_box';
    this.hitBox.userData = { workerId: this.id, isWorkerTarget: true };
    this.group.add(this.hitBox);

    // 7. Floor Selection Ring (visible when selected)
    const ringGeom = new THREE.RingGeometry(0.55, 0.62, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: this.state.accentColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0,
    });
    this.selectionRing = new THREE.Mesh(ringGeom, ringMat);
    this.selectionRing.rotation.x = -Math.PI / 2;
    this.selectionRing.position.set(0, 0.005, 0.60); // slightly above floor
    this.group.add(this.selectionRing);
  }

  public updateNameplate(): void {
    const texture = createNameplateTexture(
      this.state.name,
      this.state.role,
      this.state.status,
      this.state.accentColor
    );
    if (texture && this.nameplateSprite) {
      if (this.nameplateSprite.material.map) {
        this.nameplateSprite.material.map.dispose();
      }
      this.nameplateSprite.material.map = texture;
      this.nameplateSprite.material.needsUpdate = true;
    }
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    if (this.selectionRing) {
      const mat = this.selectionRing.material as THREE.MeshBasicMaterial;
      mat.opacity = selected ? 0.9 : 0;
    }
  }

  public update(delta: number): void {
    this.time += delta;
    const status = this.state.status;

    if (status === 'idle') {
      // Subtle breathing on torso
      this.torsoGroup.position.y = this.baseTorsoY + Math.sin(this.time * 2.5) * 0.005;
      this.torsoGroup.rotation.x = 0;

      // Natural gentle sway on head
      this.headGroup.rotation.y = Math.sin(this.time * 0.8) * 0.08;
      this.headGroup.rotation.x = Math.sin(this.time * 1.2) * 0.03;

      // Relaxed arms
      this.leftForearm.rotation.x = this.baseArmAngle + Math.sin(this.time * 2.5) * 0.02;
      this.rightForearm.rotation.x = this.baseArmAngle + Math.sin(this.time * 2.5) * 0.02;
      this.leftForearm.position.y = -0.22;
      this.rightForearm.position.y = -0.22;
    } else if (status === 'coding') {
      // Engaged posture: subtle forward lean
      this.torsoGroup.position.y = this.baseTorsoY + Math.sin(this.time * 4) * 0.003;
      this.torsoGroup.rotation.x = -0.06;

      // Head focused on screens with slight rhythmic nod
      this.headGroup.rotation.x = 0.08 + Math.sin(this.time * 5) * 0.03;
      this.headGroup.rotation.y = Math.sin(this.time * 1.4) * 0.06;

      // Rapid alternating typing animation on forearms
      const leftTyping = Math.sin(this.time * 18);
      const rightTyping = Math.sin(this.time * 18 + Math.PI * 0.65);

      this.leftForearm.rotation.x = this.baseArmAngle - 0.08 + leftTyping * 0.08;
      this.rightForearm.rotation.x = this.baseArmAngle - 0.08 + rightTyping * 0.08;

      // Micro taps on Y
      this.leftForearm.position.y = -0.22 + Math.max(0, leftTyping) * 0.01;
      this.rightForearm.position.y = -0.22 + Math.max(0, rightTyping) * 0.01;
    } else if (status === 'reviewing') {
      // Reviewing code: head pans between left and right screens
      this.torsoGroup.position.y = this.baseTorsoY + Math.sin(this.time * 2) * 0.004;
      this.torsoGroup.rotation.x = -0.02;

      // Head sweeps between left monitor (-0.25 rad) and right monitor (+0.25 rad)
      this.headGroup.rotation.y = Math.sin(this.time * 1.2) * 0.26;
      this.headGroup.rotation.x = 0.04 + Math.sin(this.time * 0.6) * 0.02;

      // Right arm periodically moves mouse
      this.leftForearm.rotation.x = this.baseArmAngle - 0.04;
      this.rightForearm.rotation.x = this.baseArmAngle - 0.04 + Math.sin(this.time * 3) * 0.03;
      this.rightForearm.position.x = Math.sin(this.time * 2) * 0.015;
    }

    // Nameplate subtle bobbing
    if (this.nameplateSprite) {
      this.nameplateSprite.position.y = 1.35 + Math.sin(this.time * 2) * 0.012;
    }

    // Selection ring pulse if selected
    if (this.isSelected && this.selectionRing) {
      const mat = this.selectionRing.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.75 + Math.sin(this.time * 6) * 0.2;
    }
  }
}
