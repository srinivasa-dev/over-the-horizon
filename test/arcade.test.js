import './setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { ArcadeEngine } from '../src/js/arcade_engine.js';
import { Planet } from '../src/js/planet.js';
import { VehiclePhysics } from '../src/js/physics.js';

describe('Arcade Simulation & Survival Modes', () => {
  const scene = new THREE.Scene();
  const planet = new Planet('Oakhaven');
  const vehicle = new VehiclePhysics(planet, 'Overland');

  const mockAudio = {
    playCountdownTick: () => {},
    playTornadoRoar: () => {},
    playTornadoSuckIn: () => {},
    playGameOverSound: () => {},
    playStationaryLockonAlert: () => {},
    playHeartLostSound: () => {},
    playHeartRestoredSound: () => {},
    playShardPickupSound: () => {},
    playComboEscalationSound: () => {},
    playNearMissChime: () => {}
  };

  const mockHud = {
    updateArcadeStats: () => {},
    showBanner: () => {},
    showCountdown: () => {},
    updateCountdown: () => {},
    hideCountdown: () => {},
    showTornadoWarning: () => {},
    hideTornadoWarning: () => {},
    showGameOverModal: () => {}
  };

  test('ArcadeEngine initializes in dormant cosy mode', () => {
    const engine = new ArcadeEngine(scene, planet, vehicle, mockAudio, mockHud);
    assert.equal(engine.activeMode, 'cosy');
    assert.equal(engine.active, false);
    assert.equal(engine.isGameOver, false);
    assert.equal(engine.meteors.length, 0);
    assert.equal(engine.tornados.length, 0);
  });

  test('Celestial Cascade mode activates 5-second start countdown and 3 shields', () => {
    const engine = new ArcadeEngine(scene, planet, vehicle, mockAudio, mockHud);
    engine.start('cascade');

    assert.equal(engine.activeMode, 'cascade');
    assert.equal(engine.active, true);
    assert.equal(engine.hearts, 3);
    assert.equal(engine.maxHearts, 3);
    assert.equal(engine.cascadeCountdown, 5.0);

    // Stepping during countdown decreases timer
    for (let i = 0; i < 25; i++) {
      engine.update(0.05);
    }
    assert.ok(engine.cascadeCountdown <= 4.01, `Countdown should decrease, got ${engine.cascadeCountdown}`);
    assert.equal(engine.meteors.length, 0, 'No meteors should spawn during initial countdown');

    engine.stop();
    assert.equal(engine.active, false);
    assert.equal(engine.cascadeCountdown, 0.0);
  });

  test('Tornado Chase mode activates with single-life permadeath and spawns tornado', () => {
    const engine = new ArcadeEngine(scene, planet, vehicle, mockAudio, mockHud);
    engine.start('tornado');

    assert.equal(engine.activeMode, 'tornado');
    assert.equal(engine.active, true);
    assert.equal(engine.hearts, 1, 'Tornado mode must provide exactly 1 life');
    assert.equal(engine.maxHearts, 1, 'Tornado mode maxHearts must be 1');
    assert.equal(engine.tornadoCountdown, 5.0, 'Tornado mode must start with 5-second countdown');
    assert.equal(engine.tornados.length, 1, 'Initial pursuing tornado must spawn');

    const tornado = engine.tornados[0];
    assert.ok(tornado.mesh, 'Tornado must have a valid Object3D mesh');
    assert.ok(tornado.dir, 'Tornado must have a spherical surface direction vector');
    assert.ok(tornado.speed >= 14.0, 'Tornado speed must be at least 14 m/s');

    // Stepping during countdown decreases countdown timer while tornado waits
    engine.update(0.1);
    assert.ok(engine.tornadoCountdown < 5.0, 'Countdown timer must decrement during update');
    assert.equal(engine.tornadoSurvivalTime, 0.0, 'Survival time must not advance during countdown');

    // Fast-forward past countdown to activate active pursuit
    engine.tornadoCountdown = 0.0;
    engine.update(0.05);
    assert.ok(engine.tornadoSurvivalTime > 0.0, 'Survival time must advance once countdown finishes');
    assert.ok(engine.score >= 0);

    engine.stop();
    assert.equal(engine.tornados.length, 0, 'Stop must clean up all active tornados');
    assert.equal(vehicle.isSuckedIn, false, 'Vehicle sucked-in flag must be cleared on stop');
  });

  test('Critical tornado suction initiates sucked-in vortex animation and permadeath', () => {
    const engine = new ArcadeEngine(scene, planet, vehicle, mockAudio, mockHud);
    engine.start('tornado');

    // Bypass countdown to test active critical proximity suction
    engine.tornadoCountdown = 0.0;

    const tornado = engine.tornados[0];
    // Position tornado directly on top of car (< 4.2m)
    tornado.dir.copy(vehicle.position.clone().normalize());
    tornado.mesh.position.copy(vehicle.position);

    engine.update(0.016);
    assert.ok(engine.suckInAnimation, 'Critical proximity must trigger suckInAnimation');
    assert.equal(vehicle.isSuckedIn, true, 'Vehicle physics must be paused during vortex suction');

    // Fast-forward animation to duration completion
    for (let i = 0; i < 60; i++) {
      engine.update(0.05);
    }
    assert.equal(engine.isGameOver, true, 'Suck-in completion must trigger game over');
    assert.equal(engine.hearts, 0, 'Permadeath must deplete life to 0');

    engine.stop();
  });
});
