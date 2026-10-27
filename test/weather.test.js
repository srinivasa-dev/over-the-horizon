import './setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Planet } from '../src/js/planet.js';
import { WeatherSystem } from '../src/js/weather.js';

describe('Atmospheric Weather & Occlusion System', () => {
  test('WeatherSystem initializes with Clear mode and soft particle buffer', () => {
    const scene = new THREE.Scene();
    const planet = new Planet('Oakhaven');
    const vehicle = { position: new THREE.Vector3(0, planet.baseRadius + 1, 0), group: new THREE.Group() };

    const weather = new WeatherSystem(scene, planet, vehicle);

    assert.equal(weather.currentMode, 'Clear');
    assert.ok(weather.group instanceof THREE.Group);
    assert.equal(weather.group.name, 'WeatherSystem');
    assert.equal(weather.particleCount, 800);
    assert.equal(weather.mat.opacity, 0.0);
  });

  test('Weather modes update particle material attributes correctly', () => {
    const scene = new THREE.Scene();
    const planet = new Planet('Rustvale');
    const vehicle = { position: new THREE.Vector3(0, planet.baseRadius + 1, 0), group: new THREE.Group() };
    const weather = new WeatherSystem(scene, planet, vehicle);

    const modes = [
      { mode: 'Rain', expectedOpacity: 0.45 },
      { mode: 'Snow', expectedOpacity: 0.65 },
      { mode: 'Sandstorm', expectedOpacity: 0.40 },
      { mode: 'SolarFlare', expectedOpacity: 0.48 },
      { mode: 'SulfuricMist', expectedOpacity: 0.45 },
      { mode: 'DustDevil', expectedOpacity: 0.45 },
      { mode: 'IonEMP', expectedOpacity: 0.55 },
      { mode: 'DiamondShimmer', expectedOpacity: 0.52 },
      { mode: 'CryoBlizzard', expectedOpacity: 0.60 },
      { mode: 'MethaneTorrent', expectedOpacity: 0.50 },
      { mode: 'CosmicDust', expectedOpacity: 0.45 },
      { mode: 'Clear', expectedOpacity: 0.0 }
    ];

    for (const { mode, expectedOpacity } of modes) {
      weather.setMode(mode);
      assert.equal(weather.currentMode, mode);
      assert.equal(
        weather.mat.opacity,
        expectedOpacity,
        `Opacity mismatch for mode ${mode}`
      );
    }
  });

  test('Physical occlusion and simulation stepping executes smoothly', () => {
    const scene = new THREE.Scene();
    const planet = new Planet('Oakhaven');
    const vehicleGroup = new THREE.Group();
    vehicleGroup.position.set(0, planet.baseRadius + 1.2, 0);
    vehicleGroup.updateMatrixWorld(true);

    const vehicle = {
      position: vehicleGroup.position,
      group: vehicleGroup
    };

    const weather = new WeatherSystem(scene, planet, vehicle);
    weather.setMode('Rain');

    // Run 5 simulation ticks
    for (let i = 0; i < 5; i++) {
      weather.update(0.016);
    }

    assert.ok(weather.geo.attributes.position.version > 0);
    assert.equal(weather.positions.length, 800 * 3);
  });
});
