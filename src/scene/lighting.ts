import * as THREE from 'three';
import type { RoomDimensions } from '../types';

export class OfficeLighting {
  public group: THREE.Group;
  public ambientLight: THREE.AmbientLight;
  public mainDirectionalLight: THREE.DirectionalLight;
  public fillDirectionalLight: THREE.DirectionalLight;
  public pointLights: THREE.PointLight[] = [];

  constructor(dimensions: RoomDimensions = { width: 16, height: 4, depth: 16 }) {
    this.group = new THREE.Group();

    // 1. Soft neutral ambient fill
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    this.ambientLight.name = 'ambient_light';
    this.group.add(this.ambientLight);

    // 2. Primary ceiling directional key light with soft shadow mapping
    this.mainDirectionalLight = new THREE.DirectionalLight(0xfff7ed, 1.1);
    this.mainDirectionalLight.name = 'main_directional_light';
    this.mainDirectionalLight.position.set(4, dimensions.height + 4, 5);
    this.mainDirectionalLight.target.position.set(0, 0, 0);
    this.mainDirectionalLight.castShadow = true;

    // Shadow camera bounds tailored to room dimensions
    const bound = Math.max(dimensions.width, dimensions.depth) / 2 + 2;
    this.mainDirectionalLight.shadow.camera.left = -bound;
    this.mainDirectionalLight.shadow.camera.right = bound;
    this.mainDirectionalLight.shadow.camera.top = bound;
    this.mainDirectionalLight.shadow.camera.bottom = -bound;
    this.mainDirectionalLight.shadow.camera.near = 0.5;
    this.mainDirectionalLight.shadow.camera.far = 30;
    this.mainDirectionalLight.shadow.mapSize.width = 2048;
    this.mainDirectionalLight.shadow.mapSize.height = 2048;
    this.mainDirectionalLight.shadow.bias = -0.0005;

    this.group.add(this.mainDirectionalLight);
    this.group.add(this.mainDirectionalLight.target);

    // 3. Subtle cool fill light from opposite side for architectural depth
    this.fillDirectionalLight = new THREE.DirectionalLight(0xe0f2fe, 0.4);
    this.fillDirectionalLight.name = 'fill_directional_light';
    this.fillDirectionalLight.position.set(-5, dimensions.height + 2, -4);
    this.group.add(this.fillDirectionalLight);

    // 4. Warm downlight point lights under ceiling fixtures
    const fixturePositions: [number, number][] = [
      [-3.5, -3.5],
      [3.5, -3.5],
      [-3.5, 3.5],
      [3.5, 3.5],
    ];

    fixturePositions.forEach(([x, z], idx) => {
      const pointLight = new THREE.PointLight(0xffedd5, 0.5, 8, 1.2);
      pointLight.name = `point_light_${idx}`;
      pointLight.position.set(x, dimensions.height - 0.4, z);
      this.pointLights.push(pointLight);
      this.group.add(pointLight);
    });
  }
}
