import test from 'node:test';
import assert from 'node:assert/strict';
import { OfficeRoom } from './scene/room.ts';
import { OfficeLighting } from './scene/lighting.ts';

test('OfficeRoom builds geometry with expected dimensions and parts', () => {
  const room = new OfficeRoom({ width: 16, height: 4, depth: 16 });
  assert.equal(room.dimensions.width, 16);
  assert.equal(room.dimensions.height, 4);
  assert.equal(room.dimensions.depth, 16);

  const names = room.group.children.map((c) => c.name);
  assert.ok(names.includes('office_floor'), 'floor mesh exists');
  assert.ok(names.includes('office_ceiling'), 'ceiling mesh exists');
  assert.ok(names.includes('wall_back'), 'back wall mesh exists');
  assert.ok(names.includes('wall_left'), 'left wall mesh exists');
  assert.ok(names.includes('wall_right'), 'right wall mesh exists');
  assert.ok(names.some((n) => n.startsWith('ceiling_fixture_')), 'ceiling fixtures exist');
});

test('OfficeLighting initializes ambient, directional, and point lights', () => {
  const lighting = new OfficeLighting({ width: 16, height: 4, depth: 16 });
  assert.ok(lighting.ambientLight, 'ambient light exists');
  assert.equal(lighting.ambientLight.name, 'ambient_light');

  assert.ok(lighting.mainDirectionalLight, 'main directional light exists');
  assert.equal(lighting.mainDirectionalLight.castShadow, true, 'directional light casts shadow');

  assert.equal(lighting.pointLights.length, 4, 'four point lights created for fixtures');
  assert.ok(lighting.group.children.length >= 6, 'group contains all lights');
});
