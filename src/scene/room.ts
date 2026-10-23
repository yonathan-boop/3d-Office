import * as THREE from 'three';
import type { RoomDimensions } from '../types/index.ts';
import { CommandWallScreen } from './commandWall.ts';

/**
 * Creates a procedural canvas texture for tiled office floor.
 * Uses native HTML5 2D canvas to avoid external asset dependencies.
 */
function createFloorTileTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Base tile color: modern commercial slate carpet tile
    ctx.fillStyle = '#2f3542';
    ctx.fillRect(0, 0, size, size);

    // Subtle checkered carpet grain
    const tileSize = size / 4;
    for (let x = 0; x < size; x += tileSize) {
      for (let y = 0; y < size; y += tileSize) {
        if ((x / tileSize + y / tileSize) % 2 === 0) {
          ctx.fillStyle = '#353b48';
          ctx.fillRect(x + 1, y + 1, tileSize - 2, tileSize - 2);
        }
      }
    }

    // Tile seams / grout
    ctx.strokeStyle = '#1e222a';
    ctx.lineWidth = 3;
    for (let i = 0; i <= size; i += tileSize) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Creates ceiling tile texture with acoustic grid pattern.
 */
function createCeilingTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(0, 0, size, size);

    // Grid lines for suspended ceiling tiles
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    const step = size / 4;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class OfficeRoom {
  public group: THREE.Group;
  public dimensions: RoomDimensions;
  public commandWall: CommandWallScreen;

  constructor(dimensions: RoomDimensions = { width: 16, height: 4, depth: 16 }) {
    this.dimensions = dimensions;
    this.group = new THREE.Group();
    this.commandWall = new CommandWallScreen(6.4, 2.2, [0, 2.3, -dimensions.depth / 2 + 0.08]);
    this.buildRoom();
  }

  private buildRoom(): void {
    const { width, height, depth } = this.dimensions;

    // Floor
    const floorTexture = createFloorTileTexture();
    const floorMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.1,
    });
    if (floorTexture) {
      floorTexture.repeat.set(width / 2, depth / 2);
      floorMaterial.map = floorTexture;
    }
    const floorGeometry = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    floor.name = 'office_floor';
    this.group.add(floor);

    // Ceiling (facing downwards into room; invisible from above for cutaway orbital view)
    const ceilingTexture = createCeilingTexture();
    const ceilingMaterial = new THREE.MeshStandardMaterial({
      roughness: 0.95,
      metalness: 0.05,
    });
    if (ceilingTexture) {
      ceilingTexture.repeat.set(width / 2, depth / 2);
      ceilingMaterial.map = ceilingTexture;
    }
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = height;
    ceiling.name = 'office_ceiling';
    this.group.add(ceiling);

    // Wall materials
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Clean light slate wall
      roughness: 0.9,
      metalness: 0.05,
    });
    const accentWallMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155, // Elegant slate blue accent
      roughness: 0.85,
      metalness: 0.1,
    });
    const trimMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.2,
    });

    // Back wall
    const backWallGeom = new THREE.PlaneGeometry(width, height);
    const backWall = new THREE.Mesh(backWallGeom, accentWallMaterial);
    backWall.position.set(0, height / 2, -depth / 2);
    backWall.receiveShadow = true;
    backWall.name = 'wall_back';
    this.group.add(backWall);

    // Side walls
    const sideWallGeom = new THREE.PlaneGeometry(depth, height);
    const leftWall = new THREE.Mesh(sideWallGeom, wallMaterial);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-width / 2, height / 2, 0);
    leftWall.receiveShadow = true;
    leftWall.name = 'wall_left';
    this.group.add(leftWall);

    const rightWall = new THREE.Mesh(sideWallGeom, wallMaterial);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(width / 2, height / 2, 0);
    rightWall.receiveShadow = true;
    rightWall.name = 'wall_right';
    this.group.add(rightWall);

    // Baseboard trims (bottom edge)
    const trimHeight = 0.12;
    const trimDepth = 0.04;

    const backTrimGeom = new THREE.BoxGeometry(width, trimHeight, trimDepth);
    const backTrim = new THREE.Mesh(backTrimGeom, trimMaterial);
    backTrim.position.set(0, trimHeight / 2, -depth / 2 + trimDepth / 2);
    this.group.add(backTrim);

    const sideTrimGeom = new THREE.BoxGeometry(trimDepth, trimHeight, depth);
    const leftTrim = new THREE.Mesh(sideTrimGeom, trimMaterial);
    leftTrim.position.set(-width / 2 + trimDepth / 2, trimHeight / 2, 0);
    this.group.add(leftTrim);

    const rightTrim = new THREE.Mesh(sideTrimGeom, trimMaterial);
    rightTrim.position.set(width / 2 - trimDepth / 2, trimHeight / 2, 0);
    this.group.add(rightTrim);

    // Wall top trims (gives crisp architectural edge to cutaway walls)
    const topTrimHeight = 0.08;
    const topTrimDepth = 0.12;

    const backTopTrimGeom = new THREE.BoxGeometry(width, topTrimHeight, topTrimDepth);
    const backTopTrim = new THREE.Mesh(backTopTrimGeom, trimMaterial);
    backTopTrim.position.set(0, height - topTrimHeight / 2, -depth / 2 + topTrimDepth / 2);
    this.group.add(backTopTrim);

    const sideTopTrimGeom = new THREE.BoxGeometry(topTrimDepth, topTrimHeight, depth);
    const leftTopTrim = new THREE.Mesh(sideTopTrimGeom, trimMaterial);
    leftTopTrim.position.set(-width / 2 + topTrimDepth / 2, height - topTrimHeight / 2, 0);
    this.group.add(leftTopTrim);

    const rightTopTrim = new THREE.Mesh(sideTopTrimGeom, trimMaterial);
    rightTopTrim.position.set(width / 2 - topTrimDepth / 2, height - topTrimHeight / 2, 0);
    this.group.add(rightTopTrim);

    // Suspended ceiling light fixtures
    this.addCeilingFixtures();

    // Wall-mounted command monitor display
    this.group.add(this.commandWall.group);
  }

  private addCeilingFixtures(): void {
    const housingMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.7,
    });
    const diffuserMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfffaf0,
      emissiveIntensity: 0.95,
      roughness: 0.2,
    });
    const cableMaterial = new THREE.MeshBasicMaterial({ color: 0x475569 });

    const fixtureWidth = 2.4;
    const fixtureHeight = 0.08;
    const fixtureDepth = 0.35;
    const suspensionY = this.dimensions.height - 0.45;
    const cableLength = this.dimensions.height - suspensionY;

    const positions: [number, number][] = [
      [-3.5, -3.5],
      [3.5, -3.5],
      [-3.5, 3.5],
      [3.5, 3.5],
    ];

    positions.forEach(([x, z], idx) => {
      const fixtureGroup = new THREE.Group();
      fixtureGroup.name = `ceiling_fixture_${idx}`;

      // Housing bar
      const housingGeom = new THREE.BoxGeometry(fixtureWidth, fixtureHeight, fixtureDepth);
      const housing = new THREE.Mesh(housingGeom, housingMaterial);
      housing.position.set(0, 0, 0);
      housing.castShadow = true;
      fixtureGroup.add(housing);

      // Bottom light diffuser
      const diffuserGeom = new THREE.BoxGeometry(fixtureWidth - 0.1, 0.02, fixtureDepth - 0.08);
      const diffuser = new THREE.Mesh(diffuserGeom, diffuserMaterial);
      diffuser.position.set(0, -fixtureHeight / 2 - 0.01, 0);
      fixtureGroup.add(diffuser);

      // Suspension cables connecting fixture to ceiling
      const cableGeom = new THREE.CylinderGeometry(0.008, 0.008, cableLength, 6);
      const cableLeft = new THREE.Mesh(cableGeom, cableMaterial);
      cableLeft.position.set(-fixtureWidth / 2 + 0.2, cableLength / 2, 0);
      fixtureGroup.add(cableLeft);

      const cableRight = new THREE.Mesh(cableGeom, cableMaterial);
      cableRight.position.set(fixtureWidth / 2 - 0.2, cableLength / 2, 0);
      fixtureGroup.add(cableRight);

      fixtureGroup.position.set(x, suspensionY, z);
      this.group.add(fixtureGroup);
    });
  }
}
