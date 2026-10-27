import './setup.js';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import * as Models from '../src/js/models.js';

describe('3D Diorama & Vehicle Procedural Models', () => {
  test('PALETTE color dictionary contains defined hex values', () => {
    assert.ok(Models.PALETTE);
    assert.equal(typeof Models.PALETTE.creamCab, 'number');
    assert.equal(typeof Models.PALETTE.darkTrim, 'number');
    assert.equal(typeof Models.PALETTE.chrome, 'number');
    assert.equal(typeof Models.PALETTE.windshield, 'number');
    assert.equal(typeof Models.PALETTE.pineTrunk, 'number');
    assert.ok(Array.isArray(Models.PALETTE.pineFoliage));
  });

  test('All 9 distinct planet rover vehicles construct valid Object3D trees', () => {
    const chassisBuilders = [
      Models.buildOverlandWagon,
      Models.buildMagmaCrawler,
      Models.buildHazmatStrider,
      Models.buildCrimsonNomad,
      Models.buildIonSpeeder,
      Models.buildSolarSkimmer,
      Models.buildCryoTrac,
      Models.buildHydroRover,
      Models.buildVoidSled
    ];

    for (const builder of chassisBuilders) {
      const chassis = builder();
      assert.ok(
        chassis instanceof THREE.Object3D,
        `${builder.name} must return a THREE.Object3D or Group`
      );
      assert.ok(
        chassis.children.length > 0,
        `${builder.name} must contain component meshes`
      );
    }
  });

  test('Corresponding wheel meshes construct valid Object3D instances', () => {
    const wheelBuilders = [
      Models.buildOverlandWheel,
      Models.buildMagmaWheel,
      Models.buildHazmatWheel,
      Models.buildCrimsonWheel,
      Models.buildIonWheel,
      Models.buildSolarWheel,
      Models.buildCryoWheel,
      Models.buildHydroWheel,
      Models.buildVoidWheel
    ];

    for (const builder of wheelBuilders) {
      const wheel = builder();
      assert.ok(
        wheel instanceof THREE.Object3D,
        `${builder.name} must return a THREE.Object3D`
      );
    }
  });

  test('Curated planetary landmark models construct successfully', () => {
    const landmarkBuilders = [
      Models.buildAlpineCabin,
      Models.buildAlpineVillageHouse,
      Models.buildStreetLanternPost,
      Models.buildWindmill,
      Models.buildObservatoryDome,
      Models.buildPineTree,
      Models.buildWoodenBridge,
      Models.buildSandstoneRingArch,
      Models.buildAncientMinaret,
      Models.buildLeaningObelisk,
      Models.buildMintCrystalCluster,
      Models.buildObsidianSpire,
      Models.buildThermalVent,
      Models.buildSulfuricGlassDome,
      Models.buildSulfuricArch,
      Models.buildMarsTerraformDome,
      Models.buildMarsCommsTower,
      Models.buildLightningPylon,
      Models.buildPlasmaRod,
      Models.buildRingTrackerStation,
      Models.buildIceCrystalArch,
      Models.buildCryoDrill,
      Models.buildFrostPinnacle,
      Models.buildAbyssalBeacon,
      Models.buildOceanicMonolith,
      Models.buildRtgPowerPost,
      Models.buildVoidIceSpire
    ];

    for (const builder of landmarkBuilders) {
      const landmark = builder();
      assert.ok(
        landmark instanceof THREE.Object3D,
        `${builder.name} must return an Object3D or Group`
      );
    }
  });

  test('Road signs, hazards, and track accessory models construct valid meshes', () => {
    const accessoryBuilders = [
      () => Models.buildStardustCelestial('Oakhaven'),
      () => Models.buildCelestialAstrolabeReticle('Oakhaven'),
      () => Models.buildStarlightAuroraPillar(28.0, 'Oakhaven'),
      () => Models.buildStardustShard('Oakhaven'),
      () => Models.buildRollingBoulder('Oakhaven'),
      () => Models.buildCrossingCart('Oakhaven'),
      Models.buildRepairWrench,
      () => Models.buildAlpineWildlife('Oakhaven'),
      () => Models.buildRoadHazardStripes('Oakhaven'),
      () => Models.buildHazardWarningBollard('Oakhaven'),
      () => Models.buildCrossingSignboard('Oakhaven', 'crossing'),
      () => Models.buildCrossroadTrack('Oakhaven')
    ];

    for (const factory of accessoryBuilders) {
      const accessory = factory();
      assert.ok(
        accessory instanceof THREE.Object3D,
        'Accessory factory must return valid Object3D'
      );
    }
  });
});
