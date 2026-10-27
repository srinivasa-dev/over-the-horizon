import './setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Planet, PLANET_CONFIGS } from '../src/js/planet.js';

describe('Planet System & Astronomical Scaling', () => {
  const EXPECTED_PLANETS = [
    'Nocturna',
    'Cinderfell',
    'Rustvale',
    'Oakhaven',
    'Aetheria',
    'Frostveil',
    'Thalassa',
    'Ringhaven',
    'Stormhaven'
  ];

  const EXPECTED_RADII = {
    Nocturna: 90,
    Cinderfell: 95,
    Rustvale: 110,
    Oakhaven: 115,
    Aetheria: 115,
    Frostveil: 120,
    Thalassa: 125,
    Ringhaven: 130,
    Stormhaven: 135
  };

  test('All 9 celestial bodies are defined in PLANET_CONFIGS', () => {
    for (const id of EXPECTED_PLANETS) {
      assert.ok(PLANET_CONFIGS[id], `Planet config missing for: ${id}`);
      assert.equal(PLANET_CONFIGS[id].name, id);
      assert.equal(typeof PLANET_CONFIGS[id].subtitle, 'string');
      assert.equal(typeof PLANET_CONFIGS[id].radius, 'number');
      assert.ok(PLANET_CONFIGS[id].radius > 0, `Radius must be positive for ${id}`);
    }
  });

  test('Planetary radii adhere to tiered astronomical scale', () => {
    for (const [id, radius] of Object.entries(EXPECTED_RADII)) {
      assert.equal(
        PLANET_CONFIGS[id].radius,
        radius,
        `Radius mismatch for ${id}: expected ${radius}, got ${PLANET_CONFIGS[id].radius}`
      );
    }
  });

  test('Planet instances generate valid 3D hierarchies and faceted meshes', () => {
    for (const id of EXPECTED_PLANETS) {
      const planet = new Planet(id);
      assert.ok(planet.group instanceof THREE.Group, `${id} group should be a THREE.Group`);
      assert.ok(planet.meshInstance instanceof THREE.Mesh, `${id} should contain meshInstance`);
      assert.equal(planet.baseRadius, EXPECTED_RADII[id], `Planet instance radius mismatch for ${id}`);
      assert.ok(planet.group.children.length > 5, `${id} group must have child objects including landmarks`);
    }
  });

  test('Ring systems are spawned on designated ringed worlds', () => {
    const ringhaven = new Planet('Ringhaven');
    const frostveil = new Planet('Frostveil');
    const oakhaven = new Planet('Oakhaven');

    const ringhavenHasRings = ringhaven.group.children.some(c => c.name && c.name.includes('Ring'));
    const frostveilHasRings = frostveil.group.children.some(c => c.name && c.name.includes('Ring'));
    const oakhavenHasRings = oakhaven.group.children.some(c => c.name && c.name.includes('Ring'));

    assert.ok(ringhavenHasRings, 'Ringhaven must have planetary rings in group');
    assert.ok(frostveilHasRings, 'Frostveil must have planetary rings in group');
    assert.equal(oakhavenHasRings, false, 'Oakhaven should not have rings');
  });

  test('getRegionAt(dir) returns valid regional progress across all 9 planets', () => {
    const angles = [0.0, 0.5, 1.2, 2.0, 3.14, 4.2, 5.5, 6.2];

    for (const planetId of EXPECTED_PLANETS) {
      const planet = new Planet(planetId);
      for (const theta of angles) {
        const dir = new THREE.Vector3(Math.cos(theta), 0, Math.sin(theta));
        const region = planet.getRegionAt(dir);
        assert.ok(region, `Region at theta=${theta} should be defined for ${planetId}`);
        assert.equal(typeof region.name, 'string');
        assert.ok(region.name.length > 0, `Region name should not be empty for ${planetId}`);
        assert.ok(region.progress >= 0.0 && region.progress <= 1.0);
        assert.ok(region.totalKm > 0);
        assert.ok(region.distKm >= 0);
      }
    }
  });

  test('updateAtmosphere adjusts sky shader parameters across diurnal cycle', () => {
    const hours = [2.0, 6.0, 12.0, 18.0, 23.0];
    const weatherModes = ['Clear', 'Rain', 'Snow', 'Sandstorm'];

    for (const planetId of EXPECTED_PLANETS) {
      const planet = new Planet(planetId);
      assert.ok(planet.skyUniforms, `${planetId} should have skyUniforms initialized`);

      for (const hour of hours) {
        for (const mode of weatherModes) {
          planet.updateAtmosphere(hour, mode);
          assert.ok(planet.skyUniforms.topColor.value instanceof THREE.Color);
          assert.ok(planet.skyUniforms.bottomColor.value instanceof THREE.Color);
          assert.ok(Number.isFinite(planet.skyUniforms.starIntensity.value));
        }
      }
    }
  });

  test('getTerrainRadiusAt computes radial distance within realistic bounds', () => {
    const planet = new Planet('Oakhaven');
    const testDirs = [
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(-0.72, 0.42, -0.55).normalize()
    ];

    for (const dir of testDirs) {
      const r = planet.getTerrainRadiusAt(dir);
      assert.ok(Number.isFinite(r), `Radius at ${dir.toArray()} must be finite`);
      // Elevation should stay within baseRadius +/- 25 meters
      assert.ok(
        r >= planet.baseRadius - 15.0 && r <= planet.baseRadius + 25.0,
        `Terrain radius ${r} should stay within planetary bounds of base ${planet.baseRadius}`
      );
    }
  });

  test('_getRoadDir returns unit directional vectors along spline', () => {
    const planet = new Planet('Thalassa');
    const thetas = [0.0, 1.0, 2.5, 4.0, 5.5];

    for (const th of thetas) {
      const roadDir = planet._getRoadDir(th);
      assert.ok(roadDir instanceof THREE.Vector3);
      assert.ok(
        Math.abs(roadDir.length() - 1.0) < 0.001,
        `Road dir must be normalized, got ${roadDir.length()}`
      );
    }
  });
});
