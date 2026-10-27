import './setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { Planet } from '../src/js/planet.js';
import { VehiclePhysics } from '../src/js/physics.js';

describe('Vehicle Physics Simulation Engine', () => {
  test('VehiclePhysics initializes with correct default states', () => {
    const planet = new Planet('Oakhaven');
    const vehicle = new VehiclePhysics(planet, 'Overland');

    assert.ok(vehicle.group instanceof THREE.Group);
    assert.equal(vehicle.vehicleType, 'Overland');
    assert.equal(vehicle.speed, 0);
    assert.equal(vehicle.getSpeedKmh(), 0);
    assert.equal(vehicle.getNitroPercent(), 100);
    assert.equal(vehicle.isBoosting(), false);
    assert.equal(vehicle.isReversing(), false);
    assert.equal(vehicle.isNitroLockedOut(), false);
  });

  test('Teleport to road places vehicle near surface on road spline', () => {
    const planet = new Planet('Rustvale');
    const vehicle = new VehiclePhysics(planet, 'Crimson Nomad');

    vehicle.teleportToRoad(0.35);

    assert.ok(vehicle.position instanceof THREE.Vector3);
    const distFromCenter = vehicle.position.length();
    // Distance should be roughly baseRadius + clearance
    assert.ok(
      Math.abs(distFromCenter - planet.baseRadius) < 10.0,
      `Vehicle altitude ${distFromCenter} should match planet radius ${planet.baseRadius}`
    );
  });

  test('Forward acceleration increases vehicle speed', () => {
    const planet = new Planet('Oakhaven');
    const vehicle = new VehiclePhysics(planet, 'Overland');
    vehicle.teleportToRoad(0.1);

    vehicle.setInputs(true, false, false, false, false, false);
    vehicle.update(0.05);
    vehicle.update(0.05);

    assert.ok(vehicle.speed > 0, `Speed should increase under acceleration, got ${vehicle.speed}`);
    assert.ok(vehicle.getSpeedKmh() > 0, 'Speed in km/h should be positive');
  });

  test('Braking decelerates the vehicle', () => {
    const planet = new Planet('Oakhaven');
    const vehicle = new VehiclePhysics(planet, 'Overland');
    vehicle.teleportToRoad(0.1);

    // Accelerate first
    vehicle.speed = 15.0;
    vehicle.setInputs(false, false, false, false, true, false); // Active braking
    vehicle.update(0.1);

    assert.ok(vehicle.speed < 15.0, `Speed should decrease under braking, got ${vehicle.speed}`);
  });

  test('Nitro boost consumes nitro reserves and refills on recharge', () => {
    const planet = new Planet('Stormhaven');
    const vehicle = new VehiclePhysics(planet, 'Ion Speeder');
    vehicle.teleportToRoad(0.2);

    // Initial nitro is 100%
    assert.equal(vehicle.getNitroPercent(), 100);

    // Engage boost
    vehicle.speed = 10.0;
    vehicle.setInputs(true, false, false, false, false, true); // Boost active
    vehicle.update(0.2);

    assert.ok(vehicle.getNitroPercent() < 100, 'Nitro should be consumed during boost');

    // Refill nitro
    const beforeRefill = vehicle.getNitroPercent();
    vehicle.refillNitro(20.0);
    assert.ok(vehicle.getNitroPercent() >= beforeRefill, 'Nitro should increase after refill');
  });

  test('Autopilot toggle enables autonomous navigation', () => {
    const planet = new Planet('Thalassa');
    const vehicle = new VehiclePhysics(planet, 'Hydro Rover');
    vehicle.teleportToRoad(0.15);

    const initialAutopilot = vehicle.autopilotActive;
    const newState = vehicle.toggleAutopilot();

    assert.equal(newState, !initialAutopilot);
    assert.equal(vehicle.autopilotActive, newState);

    if (vehicle.autopilotActive) {
      // Step simulation while autopilot is engaged
      vehicle.update(0.05);
      assert.ok(vehicle.speed >= 0, 'Autopilot should maintain non-negative forward drive');
    }
  });

  test('Different vehicle chassis can be instantiated', () => {
    const planet = new Planet('Cinderfell');
    const chassisList = [
      'Overland',
      'Magma Crawler',
      'Hazmat Strider',
      'Crimson Nomad',
      'Ion Speeder',
      'Solar Skimmer',
      'Cryo Trac',
      'Hydro Rover',
      'Void Sled'
    ];

    for (const chassis of chassisList) {
      const v = new VehiclePhysics(planet, chassis);
      assert.ok(v.group instanceof THREE.Group, `Chassis ${chassis} must build a valid group`);
      assert.ok(v.group.children.length > 0, `Chassis ${chassis} must have visual children`);
    }
  });
});
