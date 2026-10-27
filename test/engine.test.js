import './setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as Engine from '../src/js/engine.js';

describe('Modular Simulation Engine Exports', () => {
  test('Engine exports core mathematical and simulation classes', () => {
    assert.equal(typeof Engine.VehiclePhysics, 'function');
    assert.equal(typeof Engine.Planet, 'function');
    assert.equal(typeof Engine.PLANET_CONFIGS, 'object');
    assert.equal(typeof Engine.WeatherSystem, 'function');
    assert.equal(typeof Engine.ArcadeEngine, 'function');
    assert.equal(typeof Engine.AudioManager, 'function');
    assert.equal(typeof Engine.SettingsManager, 'function');
    assert.equal(typeof Engine.PresenceTracker, 'function');
    assert.ok(Engine.Models);
    assert.ok(Engine.ICONS);
  });
});
