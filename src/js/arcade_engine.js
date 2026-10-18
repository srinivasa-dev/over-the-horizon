// =================================================================
// OVER THE HORIZON: Tri-Mode Arcade Engine & Planetary Crossroad Suite
// Implements Celestial Cascade (Falling Hazards) & Crossy Odyssey (Crossing Traffic)
// =================================================================
import * as THREE from 'three';
import {
  buildStardustCelestial,
  buildStardustShard,
  buildCelestialAstrolabeReticle,
  buildStarlightAuroraPillar,
  buildRollingBoulder,
  buildCrossingCart,
  buildAlpineWildlife,
  buildRoadHazardStripes,
  buildHazardWarningBollard,
  buildCrossingSignboard,
  buildCrossroadTrack,
  buildRepairWrench
} from './models.js';

// Safe Storage Helpers to prevent SecurityError exceptions in Chrome on iOS / private browsing
function safeGetHighScore() {
  try {
    return parseInt(localStorage.getItem('oth_arcade_highscore') || '0', 10);
  } catch (e) {
    return 0;
  }
}

function safeSetHighScore(val) {
  try {
    localStorage.setItem('oth_arcade_highscore', val.toString());
  } catch (e) {}
}

export class ArcadeEngine {
  constructor(scene, planet, vehiclePhysics, audio, hud) {
    this.scene = scene;
    this.planet = planet;
    this.vehiclePhysics = vehiclePhysics;
    this.audio = audio;
    this.hud = hud;

    // Active mode: "cosy", "cascade", "crossy"
    this.activeMode = "cosy";
    this.active = false;
    this.isGameOver = false;

    // Universal Arcade State
    this.hearts = 3;
    this.maxHearts = 3;
    this.score = 0;
    this.highScore = safeGetHighScore();
    this.comboMultiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0.0;
    this.maxComboTime = 4.0;
    this.invulnerableTimer = 0.0;
    this.cameraShake = 0.0;

    // Floating notification toasts
    this.toasts = [];

    // Scene group for arcade objects
    this.arcadeGroup = new THREE.Group();
    this.arcadeGroup.name = "Arcade_Entities";
    this.scene.add(this.arcadeGroup);

    // Entity pools
    this.meteors = [];
    this.shards = [];
    this.boulders = [];
    this.crossingCarts = [];
    this.wildlife = [];
    this.crossingZones = [];
    this.signboards = [];
    this.crossroadTracks = [];
    this.advanceRockfalls = [];
    this.activeWrench = null;

    // Stationary Punisher Tracking (Cascade mode)
    this.stationaryTimer = 0.0;
    this.lockonWarning = false;
    this.stationaryAlertCooldown = 0.0;
    this.stationaryStrikeTimer = 0.4;

    // Celestial Cascade: Dynamic Salvo & Multi-Meteor Wave Director
    this.celestialQueue = [];
    this.celestialPatternTimer = 0.8;
    this.celestialPatternIndex = 0;
    this.celestialPatterns = ["pincer", "stagger_chase", "scout", "slalom", "pinch_flank", "leapfrog"];

    // Universal Repair Wrench cooldown
    this.wrenchCooldownTimer = 8.0;

    // Crossy Odyssey 2.5: Orchestrated Highway Encounter Director
    this.crossyEncounterTimer = 1.6;
    this.crossyEncounterIndex = 0;
    this.crossySequence = ["crossroad", "rockfall", "crossroad", "wildlife"];

    // Impact blast particle system
    this._initImpactParticles();
  }

  // ---------------------------------------------------------------
  // 1. LIFECYCLE: START & STOP MODES
  // ---------------------------------------------------------------
  start(mode) {
    this.stop(); // Clear any existing objects

    this.activeMode = mode;
    this.active = (mode === "cascade" || mode === "crossy");
    this.isGameOver = false;
    this.hearts = 3;
    this.score = 0;
    this.comboMultiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0.0;
    this.invulnerableTimer = 0.0;
    this.cameraShake = 0.0;
    this.toasts = [];

    this.stationaryTimer = 0.0;
    this.lockonWarning = false;
    this.stationaryAlertCooldown = 0.0;
    this.stationaryStrikeTimer = 0.4;

    // Celestial Cascade Salvo Reset
    this.celestialQueue = [];
    this.celestialPatternTimer = 0.8;
    this.celestialPatternIndex = 0;
    this.wrenchCooldownTimer = 10.0;

    // Crossy Odyssey Director Reset
    this.crossyEncounterTimer = 1.4;
    this.crossyEncounterIndex = 0;

    this.arcadeGroup.visible = true;

    if (this.hud) {
      this.hud.updateArcadeStats({
        mode: this.activeMode,
        hearts: this.hearts,
        score: this.score,
        highScore: this.highScore,
        combo: this.comboMultiplier,
        comboProgress: 0.0,
        lockonWarning: false
      });
    }

    if (this.active) {
      const modeName = mode === "cascade" ? "CELESTIAL CASCADE" : "CROSSY ODYSSEY";
      const modeSub = mode === "cascade"
        ? "T3 Intercept Sky Hazards active! Do NOT stay stationary!"
        : "Structured crossroads, slope rockfalls & wildlife corridors!";
      this.hud?.showBanner(modeName, modeSub, 3500);
    }
  }

  stop() {
    this.active = false;
    this.isGameOver = false;
    this.lockonWarning = false;
    this.stationaryTimer = 0.0;
    this.celestialQueue = [];

    // Remove and cleanup all active meteors
    for (const m of this.meteors) {
      if (m.mesh) this.arcadeGroup.remove(m.mesh);
      if (m.reticle) this.arcadeGroup.remove(m.reticle);
      if (m.beam) this.arcadeGroup.remove(m.beam);
    }
    this.meteors = [];

    // Remove shards
    for (const s of this.shards) {
      if (s.mesh) this.arcadeGroup.remove(s.mesh);
    }
    this.shards = [];

    // Remove boulders
    for (const b of this.boulders) {
      if (b.mesh) this.arcadeGroup.remove(b.mesh);
    }
    this.boulders = [];

    // Remove carts
    for (const c of this.crossingCarts) {
      if (c.mesh) this.arcadeGroup.remove(c.mesh);
    }
    this.crossingCarts = [];

    // Remove wildlife
    for (const w of this.wildlife) {
      if (w.mesh) this.arcadeGroup.remove(w.mesh);
    }
    this.wildlife = [];

    // Remove crossing zones decals & bollards
    for (const z of this.crossingZones) {
      if (z.stripes) this.arcadeGroup.remove(z.stripes);
      if (z.track) this.arcadeGroup.remove(z.track);
      if (z.bollardL) this.arcadeGroup.remove(z.bollardL);
      if (z.bollardR) this.arcadeGroup.remove(z.bollardR);
      if (z.bollardL2) this.arcadeGroup.remove(z.bollardL2);
      if (z.bollardR2) this.arcadeGroup.remove(z.bollardR2);
    }
    this.crossingZones = [];

    // Remove roadside signboards
    for (const s of this.signboards) {
      if (s.mesh) this.arcadeGroup.remove(s.mesh);
    }
    this.signboards = [];

    // Remove crossroad tracks
    for (const t of this.crossroadTracks) {
      if (t.mesh) this.arcadeGroup.remove(t.mesh);
    }
    this.crossroadTracks = [];

    // Remove advance rockfall warnings
    for (const r of this.advanceRockfalls) {
      if (r.pebbles) {
        for (const p of r.pebbles) this.arcadeGroup.remove(p);
      }
    }
    this.advanceRockfalls = [];

    // Remove wrench
    if (this.activeWrench && this.activeWrench.mesh) {
      this.arcadeGroup.remove(this.activeWrench.mesh);
      this.activeWrench = null;
    }

    if (this.blastParticles) {
      this.blastParticles.visible = false;
    }
  }

  // ---------------------------------------------------------------
  // 2. IMPACT BLAST PARTICLES POOL
  // ---------------------------------------------------------------
  _initImpactParticles() {
    const particleCount = 45;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3 + 0] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;

      // Golden amber and neon orange sparks
      colors[i * 3 + 0] = 1.0;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.4;
      colors[i * 3 + 2] = 0.1;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.7,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    this.blastParticles = new THREE.Points(geom, mat);
    this.blastParticles.visible = false;
    this.arcadeGroup.add(this.blastParticles);

    this.blastVelocities = [];
    for (let i = 0; i < particleCount; i++) {
      this.blastVelocities.push(new THREE.Vector3());
    }
    this.blastLife = 0.0;
  }

  _triggerBlastFX(centerPos, normal) {
    if (!this.blastParticles) return;
    this.blastParticles.position.copy(centerPos);
    this.blastParticles.visible = true;
    this.blastLife = 0.65;

    const posAttr = this.blastParticles.geometry.attributes.position;
    const pCount = posAttr.count;

    for (let i = 0; i < pCount; i++) {
      posAttr.setXYZ(i, 0, 0, 0);

      // Tangential burst along hemisphere
      const randVec = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();

      // Bias outward along surface normal
      randVec.add(normal.clone().multiplyScalar(1.2)).normalize();
      const speed = 6.0 + Math.random() * 12.0;
      this.blastVelocities[i].copy(randVec.multiplyScalar(speed));
    }
    posAttr.needsUpdate = true;
  }

  _updateBlastFX(dt) {
    if (!this.blastParticles || !this.blastParticles.visible) return;
    this.blastLife -= dt;
    if (this.blastLife <= 0.0) {
      this.blastParticles.visible = false;
      return;
    }

    const posAttr = this.blastParticles.geometry.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = this.blastVelocities[i].x;
      const vy = this.blastVelocities[i].y;
      const vz = this.blastVelocities[i].z;

      const px = posAttr.getX(i) + vx * dt;
      const py = posAttr.getY(i) + vy * dt;
      const pz = posAttr.getZ(i) + vz * dt;
      posAttr.setXYZ(i, px, py, pz);

      // Drag decay
      this.blastVelocities[i].multiplyScalar(Math.max(0, 1.0 - 3.2 * dt));
    }
    posAttr.needsUpdate = true;
    this.blastParticles.material.opacity = Math.max(0.0, this.blastLife / 0.65);
  }

  // ---------------------------------------------------------------
  // 2b. PRECISION VEHICLE FOOTPRINT COLLISION GEOMETRY
  // ---------------------------------------------------------------
  _getDistanceToVehicle(hazardPos) {
    if (!this.vehiclePhysics) {
      return { surfaceDist: 999.0, isDirectOverlap: false, projFwd: 0, projRight: 0 };
    }

    const carPos = this.vehiclePhysics.position;
    const carFwd = this.vehiclePhysics.forward;
    const carRight = this.vehiclePhysics.right;
    const carUp = this.vehiclePhysics.radialUp;

    const diff = hazardPos.clone().sub(carPos);
    const projFwd = diff.dot(carFwd);
    const projRight = diff.dot(carRight);
    const projUp = diff.dot(carUp);

    // Vehicle ground footprint extents:
    // Front bumper: +1.50m, Rear bumper/spare: -1.45m
    // Half-width (wheels/fenders): +/-0.98m
    const clampedFwd = THREE.MathUtils.clamp(projFwd, -1.45, 1.50);
    const clampedRight = THREE.MathUtils.clamp(projRight, -0.98, 0.98);

    const deltaFwd = projFwd - clampedFwd;
    const deltaRight = projRight - clampedRight;

    // Tangential ground-plane distance from hazard center to nearest point of car body
    const surfaceDist = Math.hypot(deltaFwd, deltaRight);
    const isDirectOverlap = (surfaceDist < 0.001);

    return {
      surfaceDist,
      isDirectOverlap,
      projFwd,
      projRight,
      projUp
    };
  }

  // ---------------------------------------------------------------
  // 3. CELESTIAL CASCADE: DYNAMIC MULTI-METEOR SALVO & WAVE DIRECTOR
  // ---------------------------------------------------------------
  _spawnMeteorAt(targetPos, fallDuration = 1.25, playAlertSound = true) {
    const planetType = this.planet.type || "Oakhaven";

    // Clamp target to exact planet surface
    const targetDir = targetPos.clone().normalize();
    const surfacePlacement = this.planet.getSurfacePlacement(targetDir, 0.05);
    targetPos = surfacePlacement.position;
    const targetNormal = surfacePlacement.normal;

    // Spawn celestial body 28m high in the sky directly above target
    const skyHeight = 28.0;
    const startPos = targetPos.clone().add(targetNormal.clone().multiplyScalar(skyHeight));

    // Create 3D Radiant Celestial Astral Mesh (Fiery Meteor)
    const meteorMesh = buildStardustCelestial(planetType);
    meteorMesh.position.copy(startPos);

    // Orient fiery tail backwards along descent path toward surface
    const descentDir = targetPos.clone().sub(startPos).normalize();
    meteorMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), descentDir);
    this.arcadeGroup.add(meteorMesh);

    // Create Sacred Geometry Astrolabe Ground Warning Reticle
    const reticleMesh = buildCelestialAstrolabeReticle(planetType);
    reticleMesh.position.copy(targetPos).add(targetNormal.clone().multiplyScalar(0.08));
    reticleMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), targetNormal);
    reticleMesh.scale.set(0.2, 0.2, 0.2);
    this.arcadeGroup.add(reticleMesh);

    // Create Volumetric Translucent Starlight Aurora Warning Pillar
    const beamMesh = buildStarlightAuroraPillar(skyHeight, planetType);
    beamMesh.position.copy(targetPos).add(targetNormal.clone().multiplyScalar(skyHeight * 0.5));
    beamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), targetNormal);
    this.arcadeGroup.add(beamMesh);

    this.meteors.push({
      mesh: meteorMesh,
      reticle: reticleMesh,
      beam: beamMesh,
      startPos: startPos,
      targetPos: targetPos,
      targetNormal: targetNormal,
      duration: fallDuration,
      elapsed: 0.0
    });

    if (playAlertSound) {
      if (this.audio && this.audio.playCelestialGlissando) {
        this.audio.playCelestialGlissando();
      } else {
        this.audio.playMeteorWarningSound();
      }
    }
  }

  _enqueueMeteor(targetPos, fallDuration = 1.25, delay = 0.0, playAlertSound = true) {
    if (delay <= 0.001) {
      this._spawnMeteorAt(targetPos, fallDuration, playAlertSound);
    } else {
      this.celestialQueue.push({
        targetPos,
        fallDuration,
        delay,
        playAlertSound
      });
    }
  }

  _spawnMeteor(targetPos = null, fallDuration = 1.25) {
    if (!targetPos) {
      const carPos = this.vehiclePhysics.position;
      const carFwd = this.vehiclePhysics.forward;
      const carRight = this.vehiclePhysics.right;
      const carSpeed = this.vehiclePhysics.getSpeedKmh();
      const speedMs = Math.max(3.5, carSpeed / 3.6);
      const lead = Math.max(7.5, speedMs * fallDuration);
      targetPos = carPos.clone()
        .add(carFwd.clone().multiplyScalar(lead))
        .add(carRight.clone().multiplyScalar((Math.random() - 0.5) * 1.5));
    }
    this._spawnMeteorAt(targetPos, fallDuration, true);
  }

  _triggerCelestialPattern() {
    const carPos = this.vehiclePhysics.position;
    const carFwd = this.vehiclePhysics.forward;
    const carRight = this.vehiclePhysics.right;
    const carSpeed = this.vehiclePhysics.getSpeedKmh();
    const speedMs = Math.max(3.5, carSpeed / 3.6);
    const difficulty = Math.min(1.0, this.score / 6000.0);

    // Dynamic base lead distance matching vehicle speed (minimum 8m)
    const baseLead = Math.max(8.0, speedMs * 1.35);

    const pattern = this.celestialPatterns[this.celestialPatternIndex % this.celestialPatterns.length];
    this.celestialPatternIndex++;

    let recoveryTime = 2.4;

    switch (pattern) {
      case "pincer": {
        // Dual Flank Pinch: 2 meteors drop ahead on left & right margins
        // Leaves a generous 5.6m center lane for the player to drive straight through!
        const lateralOffset = 2.8 + Math.random() * 0.4;
        const targetL = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead + (Math.random() - 0.5) * 1.2))
          .add(carRight.clone().multiplyScalar(-lateralOffset));
        const targetR = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead + 1.2 + (Math.random() - 0.5) * 1.2))
          .add(carRight.clone().multiplyScalar(lateralOffset));

        this._enqueueMeteor(targetL, 1.30, 0.0, true);
        this._enqueueMeteor(targetR, 1.30, 0.22, true);
        recoveryTime = 2.4 - difficulty * 0.6;
        break;
      }

      case "stagger_chase": {
        // Leapfrog: 2 meteors in sequence along travel vector
        // Meteor 1 is near-center (closer), Meteor 2 is farther and offset to one side
        const side = Math.random() < 0.5 ? -1.0 : 1.0;
        const target1 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 0.72))
          .add(carRight.clone().multiplyScalar((Math.random() - 0.5) * 1.0));
        const target2 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 1.38))
          .add(carRight.clone().multiplyScalar(side * (2.2 + Math.random() * 1.0)));

        this._enqueueMeteor(target1, 1.20, 0.0, true);
        this._enqueueMeteor(target2, 1.35, 0.38, true);
        recoveryTime = 2.6 - difficulty * 0.7;
        break;
      }

      case "scout": {
        // Precision Intercept: 1 high-warning shot with generous stardust drop
        const target = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead + (Math.random() - 0.5) * 1.8))
          .add(carRight.clone().multiplyScalar((Math.random() - 0.5) * 1.6));

        this._enqueueMeteor(target, 1.25, 0.0, true);
        recoveryTime = 2.1 - difficulty * 0.5;
        break;
      }

      case "slalom": {
        // 3-Meteor Slalom Corridor: Staggered Left, Right, Center
        // Highly engaging, rhythmic, leaves clear weaving arcs
        const target1 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 0.70))
          .add(carRight.clone().multiplyScalar(-2.6));
        const target2 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 1.10))
          .add(carRight.clone().multiplyScalar(2.6));
        const target3 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 1.48))
          .add(carRight.clone().multiplyScalar(-0.8));

        this._enqueueMeteor(target1, 1.35, 0.0, true);
        this._enqueueMeteor(target2, 1.35, 0.32, false);
        this._enqueueMeteor(target3, 1.35, 0.64, false);
        recoveryTime = 3.2 - difficulty * 0.8;
        break;
      }

      case "pinch_flank": {
        // Cut-off: One ahead in path, one trailing on flank
        const side = Math.random() < 0.5 ? -1.0 : 1.0;
        const targetAhead = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 1.05))
          .add(carRight.clone().multiplyScalar((Math.random() - 0.5) * 1.2));
        const targetFlank = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 0.50))
          .add(carRight.clone().multiplyScalar(side * (3.0 + Math.random() * 1.2)));

        this._enqueueMeteor(targetAhead, 1.25, 0.0, true);
        this._enqueueMeteor(targetFlank, 1.30, 0.30, true);
        recoveryTime = 2.5 - difficulty * 0.6;
        break;
      }

      case "leapfrog": {
        // Asymmetric pair: Forces a decisive steer or throttle tap
        const side = Math.random() < 0.5 ? -1.0 : 1.0;
        const target1 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 0.85))
          .add(carRight.clone().multiplyScalar(side * 2.0));
        const target2 = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead * 1.30))
          .add(carRight.clone().multiplyScalar(-side * 2.4));

        this._enqueueMeteor(target1, 1.25, 0.0, true);
        this._enqueueMeteor(target2, 1.30, 0.28, true);
        recoveryTime = 2.5 - difficulty * 0.6;
        break;
      }

      default: {
        const target = carPos.clone()
          .add(carFwd.clone().multiplyScalar(baseLead))
          .add(carRight.clone().multiplyScalar((Math.random() - 0.5) * 1.5));
        this._enqueueMeteor(target, 1.25, 0.0, true);
        recoveryTime = 2.2;
        break;
      }
    }

    this.celestialPatternTimer = Math.max(1.5, recoveryTime);
  }

  _updateMeteors(dt, carPos) {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.elapsed += dt;
      const progress = Math.min(1.0, m.elapsed / m.duration);

      // Accelerate falling projectile (t^2 gravitational plunge)
      const plungeFactor = Math.pow(progress, 1.8);
      m.mesh.position.lerpVectors(m.startPos, m.targetPos, plungeFactor);

      // Animate molten core & rocky crust tumbling
      if (m.mesh.core) {
        m.mesh.core.rotation.x += dt * 5.0;
        m.mesh.core.rotation.y += dt * 6.5;
      }
      if (m.mesh.crust) {
        m.mesh.crust.rotation.x -= dt * 3.5;
        m.mesh.crust.rotation.z += dt * 4.2;
      }

      // Animate roaring flame plumes (Pure fire & ember aesthetic)
      if (m.mesh.innerFlame) {
        const f = 0.90 + Math.random() * 0.25;
        m.mesh.innerFlame.scale.set(f, f, f * 1.15);
      }
      if (m.mesh.outerFlame) {
        const f = 0.85 + Math.random() * 0.30;
        m.mesh.outerFlame.scale.set(f, f, f * 1.10);
      }
      if (m.mesh.tipFlame) {
        const f = 0.80 + Math.random() * 0.35;
        m.mesh.tipFlame.scale.set(f * 0.9, f * 0.9, f * 1.25);
      }
      if (m.mesh.sideFlames) {
        m.mesh.sideFlames.forEach((sf, idx) => {
          const f = 0.82 + Math.sin(Date.now() * 0.015 + idx * 1.5) * 0.22;
          sf.scale.set(f, f, f * 1.15);
        });
      }

      // Animate orbiting incandescent ember sparks
      if (m.mesh.sparks) {
        m.mesh.sparks.forEach(s => {
          s.angle += s.speed * dt;
          s.mesh.position.x = Math.cos(s.angle) * s.radius;
          s.mesh.position.y = Math.sin(s.angle) * s.radius;
        });
      }

      // Expand & spin sacred geometry astrolabe ground reticle
      const reticleScale = 0.2 + progress * 0.95;
      m.reticle.scale.set(reticleScale, reticleScale, reticleScale);
      m.reticle.rotation.z += dt * 2.2;
      if (m.reticle.material) {
        m.reticle.material.opacity = 0.5 + Math.sin(progress * Math.PI * 8.0) * 0.35;
      }

      // Pulse starlight aurora warning pillar
      if (m.beam && m.beam.material) {
        m.beam.material.opacity = 0.20 + Math.sin(progress * Math.PI * 12.0) * 0.18;
      }

      // Impact trigger
      if (progress >= 1.0) {
        this._detonateMeteor(m, carPos);
        this.arcadeGroup.remove(m.mesh);
        this.arcadeGroup.remove(m.reticle);
        if (m.beam) this.arcadeGroup.remove(m.beam);
        this.meteors.splice(i, 1);
      }
    }
  }

  _detonateMeteor(meteor, carPos) {
    const impactPos = meteor.targetPos;
    const impactNormal = meteor.targetNormal;
    const planetType = this.planet.type || "Oakhaven";

    // Blast FX & Resonant Celestial Nova Chime
    this._triggerBlastFX(impactPos, impactNormal);
    if (this.audio && this.audio.playCelestialNovaChime) {
      this.audio.playCelestialNovaChime();
    } else {
      this.audio.playImpactBlastSound();
    }
    this.cameraShake = Math.max(this.cameraShake, 0.55);

    // Precision vehicle footprint distance check
    const vehDist = this._getDistanceToVehicle(impactPos);

    // Astrolabe reticle blast radius is ~1.55m-1.65m.
    // If ANY part of the vehicle body/bumper is inside the blast radius:
    if (vehDist.surfaceDist <= 1.65) {
      // Direct Hit!
      this.takeDamage("CELESTIAL IMPACT!");
    } else if (vehDist.surfaceDist > 1.65 && vehDist.surfaceDist <= 3.40) {
      // Near Miss / Close Call! High skill reward!
      this.triggerNearMiss(vehDist.surfaceDist);
    }

    // Scatter 2 to 3 Stardust Shards around impact crater
    const shardCount = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < shardCount; j++) {
      this._spawnShard(impactPos, impactNormal, planetType);
    }
  }

  // ---------------------------------------------------------------
  // 4. COLLECTIBLE STARDUST SHARDS
  // ---------------------------------------------------------------
  _spawnShard(centerPos, normal, planetType = "Oakhaven") {
    if (this.shards.length >= 20) return; // Pool cap

    const angle = Math.random() * Math.PI * 2;
    const radius = 2.0 + Math.random() * 2.8;

    // Pick tangential basis on sphere
    const arbitrary = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangentU = new THREE.Vector3().crossVectors(normal, arbitrary).normalize();
    const tangentV = new THREE.Vector3().crossVectors(normal, tangentU).normalize();

    let shardPos = centerPos.clone()
      .add(tangentU.clone().multiplyScalar(Math.cos(angle) * radius))
      .add(tangentV.clone().multiplyScalar(Math.sin(angle) * radius));

    // Clamp to exact terrain surface
    const shardDir = shardPos.clone().normalize();
    const placement = this.planet.getSurfacePlacement(shardDir, 0.45);
    shardPos = placement.position;

    const shardMesh = buildStardustShard(planetType);
    shardMesh.position.copy(shardPos);
    shardMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), placement.normal);
    this.arcadeGroup.add(shardMesh);

    this.shards.push({
      mesh: shardMesh,
      basePos: shardPos.clone(),
      normal: placement.normal,
      rotSpeed: 2.2 + Math.random() * 2.5,
      bobOffset: Math.random() * Math.PI * 2,
      life: 12.0 // Expiration lifetime
    });
  }

  _updateShards(dt, carPos) {
    for (let i = this.shards.length - 1; i >= 0; i--) {
      const s = this.shards[i];
      s.life -= dt;
      if (s.life <= 0.0) {
        this.arcadeGroup.remove(s.mesh);
        this.shards.splice(i, 1);
        continue;
      }

      // Floating hover bob & rotation
      s.mesh.rotation.y += dt * s.rotSpeed;
      const bob = Math.sin(Date.now() * 0.005 + s.bobOffset) * 0.18;
      s.mesh.position.copy(s.basePos).add(s.normal.clone().multiplyScalar(bob));

      // Player pickup check with vehicle footprint
      const vehDist = this._getDistanceToVehicle(s.mesh.position);
      if (vehDist.surfaceDist <= 1.25) {
        this.collectShard(s);
        this.arcadeGroup.remove(s.mesh);
        this.shards.splice(i, 1);
      }
    }
  }

  collectShard(shard) {
    const pts = 50 * this.comboMultiplier;
    this.score += pts;
    this.comboCount++;
    this.comboTimer = this.maxComboTime; // Reset combo decay

    // Check combo escalation
    const oldMult = this.comboMultiplier;
    if (this.comboCount >= 16) this.comboMultiplier = 5;
    else if (this.comboCount >= 10) this.comboMultiplier = 4;
    else if (this.comboCount >= 5) this.comboMultiplier = 3;
    else if (this.comboCount >= 2) this.comboMultiplier = 2;

    if (this.comboMultiplier > oldMult) {
      this.audio.playComboEscalationSound(this.comboMultiplier);
      this.addToast(`COMBO x${this.comboMultiplier}!`, `Multiplier Active!`, "#F5A623");
    } else {
      this.audio.playShardPickupSound(this.comboMultiplier);
      this.addToast(`+${pts} PTS`, "Stardust Collected", "#38BDF8");
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      safeSetHighScore(this.highScore);
    }
  }

  // ---------------------------------------------------------------
  // 5. CROSSY ODYSSEY 2.5: ORCHESTRATED HIGHWAY ENCOUNTER DIRECTOR
  // ---------------------------------------------------------------
  _triggerCrossroadEncounter() {
    const planetType = this.planet.type || "Oakhaven";
    const carPos = this.vehiclePhysics.position;
    const carFwd = this.vehiclePhysics.forward;
    const carRight = this.vehiclePhysics.right;
    const carSpeed = this.vehiclePhysics.getSpeedKmh();

    const lead = 30.0 + Math.min(22.0, (carSpeed / 100.0) * 16.0);
    const targetCenter = carPos.clone().add(carFwd.clone().multiplyScalar(lead));
    const centerPlacement = this.planet.getSurfacePlacement(targetCenter.clone().normalize(), 0.02);

    // 1. Advance Roadside Signboard (13m before junction)
    const signPos = carPos.clone().add(carFwd.clone().multiplyScalar(lead - 13.0)).add(carRight.clone().multiplyScalar(3.2));
    const signPlacement = this.planet.getSurfacePlacement(signPos.clone().normalize(), 0.0);
    const signboard = buildCrossingSignboard(planetType, "crossing");
    signboard.position.copy(signPlacement.position);
    signboard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), signPlacement.normal);
    this.arcadeGroup.add(signboard);
    this.signboards.push({ mesh: signboard, pos: signPlacement.position.clone(), life: 10.0 });

    // 2. Road crossing zone with visible crossroad track & zebra stripes
    this._spawnCrossingZone(centerPlacement.position, centerPlacement.normal, carRight, carFwd);

    // 3. Audio & HUD alert
    this.audio.playTrafficHorn();
    this.addToast("JUNCTION CROSSING • 30M", "Watch for Crossing Haul Convoys", "#38BDF8");

    // 4. Structured 2-vehicle convoy crossing perpendicular across intersection
    const side = Math.random() < 0.5 ? -1.0 : 1.0;
    const convoyCount = 2;
    const crossDir = carRight.clone().multiplyScalar(-side).normalize();
    const speed = 7.5 + Math.random() * 3.0;

    for (let k = 0; k < convoyCount; k++) {
      const spawnPos = targetCenter.clone()
        .add(carRight.clone().multiplyScalar(side * (26.0 + k * 4.8)));

      const placement = this.planet.getSurfacePlacement(spawnPos.clone().normalize(), 0.0);
      const cartMesh = buildCrossingCart(planetType);
      cartMesh.position.copy(placement.position);
      this.arcadeGroup.add(cartMesh);

      const cartFwd = crossDir.clone();
      const cartUp = placement.normal.clone();
      const cartMatrix = new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        cartFwd,
        cartUp
      );
      cartMesh.quaternion.setFromRotationMatrix(cartMatrix);

      this.crossingCarts.push({
        mesh: cartMesh,
        pos: placement.position.clone(),
        crossDir: crossDir,
        speed: speed,
        life: 8.5,
        hasDodged: false
      });
    }
  }

  _spawnCrossingZone(roadPos, normal, rightDir, roadFwd) {
    const planetType = this.planet.type || "Oakhaven";

    // 1. Crossroad Secondary Dirt/Gravel Track Decal (Spans 54m perpendicular)
    const track = buildCrossroadTrack(planetType);
    track.position.copy(roadPos);
    const trackMat = new THREE.Matrix4().makeBasis(rightDir, normal, roadFwd);
    track.quaternion.setFromRotationMatrix(trackMat);
    this.arcadeGroup.add(track);

    // 2. Road Hazard Zebra Stripes Decal
    const stripes = buildRoadHazardStripes(planetType);
    stripes.position.copy(roadPos);
    stripes.quaternion.setFromRotationMatrix(trackMat);
    this.arcadeGroup.add(stripes);

    // 3. 4 Corner Warning Bollards with synchronized beacons
    const makeBollard = (offsetFwd, offsetRight) => {
      const b = buildHazardWarningBollard(planetType);
      const pos = roadPos.clone().add(roadFwd.clone().multiplyScalar(offsetFwd)).add(rightDir.clone().multiplyScalar(offsetRight));
      const place = this.planet.getSurfacePlacement(pos.clone().normalize(), 0.0);
      b.position.copy(place.position);
      b.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), place.normal);
      this.arcadeGroup.add(b);
      return b;
    };

    const bL = makeBollard(-2.5, -3.2);
    const bR = makeBollard(-2.5, 3.2);
    const bL2 = makeBollard(2.5, -3.2);
    const bR2 = makeBollard(2.5, 3.2);

    this.crossingZones.push({
      pos: roadPos.clone(),
      roadFwd: roadFwd.clone(),
      stripes: stripes,
      track: track,
      bollardL: bL,
      bollardR: bR,
      bollardL2: bL2,
      bollardR2: bR2,
      cleared: false,
      life: 9.0
    });
  }

  _updateCrossingZones(dt, carPos) {
    const now = Date.now();
    for (let i = this.crossingZones.length - 1; i >= 0; i--) {
      const z = this.crossingZones[i];
      z.life -= dt;

      // Pulse warning bollard beacon lights
      const beaconLit = Math.sin(now * 0.016) > 0;
      if (z.bollardL?.beacon) z.bollardL.beacon.material.opacity = beaconLit ? 1.0 : 0.25;
      if (z.bollardR?.beacon) z.bollardR.beacon.material.opacity = beaconLit ? 1.0 : 0.25;
      if (z.bollardL2?.beacon) z.bollardL2.beacon.material.opacity = beaconLit ? 1.0 : 0.25;
      if (z.bollardR2?.beacon) z.bollardR2.beacon.material.opacity = beaconLit ? 1.0 : 0.25;

      // Check if vehicle has passed beyond the crossing line
      const toCar = carPos.clone().sub(z.pos);
      const fwdDot = toCar.dot(z.roadFwd);

      if (!z.cleared && fwdDot > 2.5 && fwdDot < 12.0) {
        z.cleared = true;
        this.triggerLaneCleared();
      }

      // Expire zone once well behind the car or lifetime elapsed
      if (z.life <= 0.0 || fwdDot > 20.0) {
        if (z.stripes) this.arcadeGroup.remove(z.stripes);
        if (z.track) this.arcadeGroup.remove(z.track);
        if (z.bollardL) this.arcadeGroup.remove(z.bollardL);
        if (z.bollardR) this.arcadeGroup.remove(z.bollardR);
        if (z.bollardL2) this.arcadeGroup.remove(z.bollardL2);
        if (z.bollardR2) this.arcadeGroup.remove(z.bollardR2);
        this.crossingZones.splice(i, 1);
      }
    }
  }

  _updateCrossingCarts(dt, carPos) {
    for (let i = this.crossingCarts.length - 1; i >= 0; i--) {
      const c = this.crossingCarts[i];
      c.life -= dt;
      if (c.life <= 0.0) {
        this.arcadeGroup.remove(c.mesh);
        this.crossingCarts.splice(i, 1);
        continue;
      }

      // Advance along crossing route
      c.pos.add(c.crossDir.clone().multiplyScalar(c.speed * dt));
      const placement = this.planet.getSurfacePlacement(c.pos.clone().normalize(), 0.05);
      c.pos.copy(placement.position);
      c.mesh.position.copy(c.pos);

      // Re-orient to surface
      const cartMatrix = new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        c.crossDir,
        placement.normal
      );
      c.mesh.quaternion.setFromRotationMatrix(cartMatrix);

      // Rotate wheels if present
      if (c.mesh.wheels) {
        for (const w of c.mesh.wheels) {
          w.rotation.x += dt * c.speed * 2.2;
        }
      }

      // Precision vehicle footprint collision check
      const vehDist = this._getDistanceToVehicle(c.pos);
      if (vehDist.surfaceDist <= 1.25) {
        this.takeDamage("CONVOY COLLISION!");
      } else if (!c.hasDodged && vehDist.surfaceDist <= 2.80) {
        c.hasDodged = true;
        this.triggerCleanCross("CONVOY WEAVE! +120", 120);
      }
    }
  }

  // ---------------------------------------------------------------
  // 5b. MOUNTAIN ROCKFALL CHUTE (Slope-Accurate Gravity Avalanche)
  // ---------------------------------------------------------------
  _triggerRockfallEncounter() {
    const planetType = this.planet.type || "Oakhaven";
    const carPos = this.vehiclePhysics.position;
    const carFwd = this.vehiclePhysics.forward;
    const carRight = this.vehiclePhysics.right;
    const carSpeed = this.vehiclePhysics.getSpeedKmh();

    const lead = 28.0 + Math.min(20.0, (carSpeed / 100.0) * 14.0);
    const targetRoadPos = carPos.clone().add(carFwd.clone().multiplyScalar(lead));

    // Sample terrain elevation on left slope vs right slope to find uphill side
    const testPosL = targetRoadPos.clone().add(carRight.clone().multiplyScalar(-24.0));
    const testPosR = targetRoadPos.clone().add(carRight.clone().multiplyScalar(24.0));
    const hL = this.planet.getTerrainRadiusAt(testPosL.clone().normalize());
    const hR = this.planet.getTerrainRadiusAt(testPosR.clone().normalize());
    const uphillSide = (hL >= hR) ? -1.0 : 1.0;

    // 1. Advance Roadside Signboard: "CAUTION: ROCKFALL ZONE"
    const signPos = carPos.clone().add(carFwd.clone().multiplyScalar(lead - 13.0)).add(carRight.clone().multiplyScalar(-uphillSide * 3.2));
    const signPlacement = this.planet.getSurfacePlacement(signPos.clone().normalize(), 0.0);
    const signboard = buildCrossingSignboard(planetType, "rockfall");
    signboard.position.copy(signPlacement.position);
    signboard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), signPlacement.normal);
    this.arcadeGroup.add(signboard);
    this.signboards.push({ mesh: signboard, pos: signPlacement.position.clone(), life: 9.0 });

    // 2. Audio & HUD alert
    this.audio.playBoulderRumbleSound();
    this.addToast("ROCKFALL ALERT! • 30M", "Uphill Slopes Active — Prepare to Weave", "#F5A623");

    // 3. Advance warning pebbles & dust tumbling down upper hillside
    const pebbleMeshes = [];
    const matPebble = new THREE.MeshBasicMaterial({ color: 0x78716C });
    for (let p = 0; p < 4; p++) {
      const pMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22 + p * 0.06, 0), matPebble);
      const spawnPebble = targetRoadPos.clone().add(carRight.clone().multiplyScalar(uphillSide * (18.0 + p * 3.0)));
      const placeP = this.planet.getSurfacePlacement(spawnPebble.clone().normalize(), 0.15);
      pMesh.position.copy(placeP.position);
      this.arcadeGroup.add(pMesh);
      pebbleMeshes.push(pMesh);
    }

    this.advanceRockfalls.push({
      targetRoadPos: targetRoadPos.clone(),
      uphillSide: uphillSide,
      delay: 1.25,
      pebbles: pebbleMeshes,
      planetType: planetType
    });
  }

  _updateAdvanceRockfalls(dt, carPos) {
    for (let i = this.advanceRockfalls.length - 1; i >= 0; i--) {
      const r = this.advanceRockfalls[i];
      r.delay -= dt;

      // Animate warning pebbles rolling down
      if (r.pebbles) {
        for (let p = 0; p < r.pebbles.length; p++) {
          const mesh = r.pebbles[p];
          mesh.rotation.x += dt * 8.0;
          mesh.rotation.y += dt * 6.0;
        }
      }

      if (r.delay <= 0.0) {
        // Remove pebbles
        if (r.pebbles) {
          for (const p of r.pebbles) this.arcadeGroup.remove(p);
        }

        // Spawn actual rolling boulder(s) tumbling down the slope
        this._spawnBoulder(r.targetRoadPos, r.uphillSide, r.planetType);
        this.advanceRockfalls.splice(i, 1);
      }
    }
  }

  _spawnBoulder(targetRoadPos, uphillSide, planetType = "Oakhaven") {
    const carRight = this.vehiclePhysics.right;
    const count = Math.random() < 0.65 ? 2 : 1;

    for (let k = 0; k < count; k++) {
      const spawnPos = targetRoadPos.clone().add(carRight.clone().multiplyScalar(uphillSide * (22.0 + k * 5.0)));
      const spawnPlacement = this.planet.getSurfacePlacement(spawnPos.clone().normalize(), 0.95);
      const boulderMesh = buildRollingBoulder(planetType);
      boulderMesh.position.copy(spawnPlacement.position);
      this.arcadeGroup.add(boulderMesh);

      // Roll trajectory naturally rolls downhill from uphillSide towards opposite side (-uphillSide)
      const rollDir = carRight.clone().multiplyScalar(-uphillSide).normalize();
      const rollSpeed = 8.5 + Math.random() * 4.5;

      this.boulders.push({
        mesh: boulderMesh,
        pos: spawnPlacement.position.clone(),
        rollDir: rollDir,
        speed: rollSpeed,
        life: 6.8,
        hasDodged: false
      });
    }
  }

  _updateBoulders(dt, carPos) {
    for (let i = this.boulders.length - 1; i >= 0; i--) {
      const b = this.boulders[i];
      b.life -= dt;
      if (b.life <= 0.0) {
        this.arcadeGroup.remove(b.mesh);
        this.boulders.splice(i, 1);
        continue;
      }

      // Advance boulder along sphere surface
      b.pos.add(b.rollDir.clone().multiplyScalar(b.speed * dt));
      const placement = this.planet.getSurfacePlacement(b.pos.clone().normalize(), 0.95);
      b.pos.copy(placement.position);
      b.mesh.position.copy(b.pos);

      // Roll mesh rotation around axis perpendicular to travel & normal
      const rollAxis = new THREE.Vector3().crossVectors(b.rollDir, placement.normal).normalize();
      b.mesh.rotateOnWorldAxis(rollAxis, b.speed * dt * 0.95);

      // Precision vehicle footprint collision check with car
      const vehDist = this._getDistanceToVehicle(b.pos);
      if (vehDist.surfaceDist <= 1.15) {
        this.takeDamage("BOULDER CRUNCH!");
      } else if (!b.hasDodged && vehDist.surfaceDist <= 2.65) {
        b.hasDodged = true;
        this.triggerCleanCross("BOULDER WEAVE! +100", 100);
      }
    }
  }

  // ---------------------------------------------------------------
  // 5c. CROSSING WILDLIFE & DUNE SKITTER DRONES
  // ---------------------------------------------------------------
  _triggerWildlifeEncounter() {
    const planetType = this.planet.type || "Oakhaven";
    const carPos = this.vehiclePhysics.position;
    const carFwd = this.vehiclePhysics.forward;
    const carRight = this.vehiclePhysics.right;
    const carSpeed = this.vehiclePhysics.getSpeedKmh();

    const side = Math.random() < 0.5 ? -1.0 : 1.0;
    const lead = 24.0 + Math.min(18.0, (carSpeed / 100.0) * 14.0);

    const targetCenter = carPos.clone().add(carFwd.clone().multiplyScalar(lead));
    const spawnPos = targetCenter.clone().add(carRight.clone().multiplyScalar(side * 24.0));

    // Roadside signboard: "WILDLIFE CROSSING"
    const signPos = carPos.clone().add(carFwd.clone().multiplyScalar(lead - 12.0)).add(carRight.clone().multiplyScalar(-side * 3.2));
    const signPlacement = this.planet.getSurfacePlacement(signPos.clone().normalize(), 0.0);
    const signboard = buildCrossingSignboard(planetType, "wildlife");
    signboard.position.copy(signPlacement.position);
    signboard.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), signPlacement.normal);
    this.arcadeGroup.add(signboard);
    this.signboards.push({ mesh: signboard, pos: signPlacement.position.clone(), life: 8.5 });

    const placement = this.planet.getSurfacePlacement(spawnPos.clone().normalize(), 0.0);
    const creatureMesh = buildAlpineWildlife(planetType);
    creatureMesh.position.copy(placement.position);
    this.arcadeGroup.add(creatureMesh);

    // Swift crossing sprint across road
    const crossDir = carRight.clone().multiplyScalar(-side).normalize();
    const speed = 9.0 + Math.random() * 3.5;

    const crMatrix = new THREE.Matrix4().lookAt(
      new THREE.Vector3(0, 0, 0),
      crossDir,
      placement.normal
    );
    creatureMesh.quaternion.setFromRotationMatrix(crMatrix);

    this.wildlife.push({
      mesh: creatureMesh,
      pos: placement.position.clone(),
      crossDir: crossDir,
      speed: speed,
      life: 7.0,
      animTime: 0.0,
      hasDodged: false
    });

    this.addToast("WILDLIFE CROSSING!", "Swift Animal Crossing Trail", "#10B981");
  }

  _updateWildlife(dt, carPos) {
    const isEarth = (this.planet.type === "Oakhaven");
    for (let i = this.wildlife.length - 1; i >= 0; i--) {
      const w = this.wildlife[i];
      w.life -= dt;
      w.animTime += dt;
      if (w.life <= 0.0) {
        this.arcadeGroup.remove(w.mesh);
        this.wildlife.splice(i, 1);
        continue;
      }

      // Advance sprint along surface
      w.pos.add(w.crossDir.clone().multiplyScalar(w.speed * dt));
      const placement = this.planet.getSurfacePlacement(w.pos.clone().normalize(), 0.05);
      w.pos.copy(placement.position);
      w.mesh.position.copy(w.pos);

      // Re-orient to surface
      const crMatrix = new THREE.Matrix4().lookAt(
        new THREE.Vector3(0, 0, 0),
        w.crossDir,
        placement.normal
      );
      w.mesh.quaternion.setFromRotationMatrix(crMatrix);

      // Animate trotting / scuttling legs
      if (w.mesh.legs && w.mesh.legs.length >= 4) {
        const legPhase = w.animTime * 14.0;
        w.mesh.legs[0].rotation.x = Math.sin(legPhase) * 0.45;
        w.mesh.legs[1].rotation.x = -Math.sin(legPhase) * 0.45;
        w.mesh.legs[2].rotation.x = -Math.sin(legPhase) * 0.45;
        w.mesh.legs[3].rotation.x = Math.sin(legPhase) * 0.45;
      }

      // Precision vehicle footprint collision check
      const vehDist = this._getDistanceToVehicle(w.pos);
      if (vehDist.surfaceDist <= 0.85) {
        const hazardName = isEarth ? "BIGHORN RAM IMPACT!" : "SKITTER DRONE IMPACT!";
        this.takeDamage(hazardName);
      } else if (!w.hasDodged && vehDist.surfaceDist <= 2.50) {
        w.hasDodged = true;
        const dodgeName = isEarth ? "WILDLIFE SLALOM! +150" : "DRONE SLALOM! +150";
        this.triggerCleanCross(dodgeName, 150);
      }
    }
  }

  _updateSignboards(dt, carPos) {
    for (let i = this.signboards.length - 1; i >= 0; i--) {
      const s = this.signboards[i];
      s.life -= dt;
      if (s.life <= 0.0 || carPos.distanceTo(s.pos) > 45.0) {
        this.arcadeGroup.remove(s.mesh);
        this.signboards.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------------
  // 6. REPAIR WRENCH SPAWNER (Hearts Recovery)
  // ---------------------------------------------------------------
  _spawnRepairWrench() {
    if (this.activeWrench || this.hearts >= this.maxHearts) return;

    const carPos = this.vehiclePhysics.position;
    const carFwd = this.vehiclePhysics.forward;
    const targetPos = carPos.clone().add(carFwd.clone().multiplyScalar(32.0));

    const placement = this.planet.getSurfacePlacement(targetPos.clone().normalize(), 0.4);
    const wrenchMesh = buildRepairWrench();
    wrenchMesh.position.copy(placement.position);
    wrenchMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), placement.normal);
    this.arcadeGroup.add(wrenchMesh);

    this.activeWrench = {
      mesh: wrenchMesh,
      pos: placement.position.clone(),
      normal: placement.normal,
      life: 14.0
    };
  }

  _updateRepairWrench(dt, carPos) {
    if (!this.activeWrench) return;
    this.activeWrench.life -= dt;
    if (this.activeWrench.life <= 0.0) {
      this.arcadeGroup.remove(this.activeWrench.mesh);
      this.activeWrench = null;
      return;
    }

    // Animate floating wrench tool
    if (this.activeWrench.mesh.tool) {
      this.activeWrench.mesh.tool.rotation.y += dt * 3.0;
      this.activeWrench.mesh.tool.position.y = 0.95 + Math.sin(Date.now() * 0.006) * 0.12;
    }

    // Pickup check with vehicle footprint
    const vehDist = this._getDistanceToVehicle(this.activeWrench.pos);
    if (vehDist.surfaceDist <= 1.35) {
      this.hearts = Math.min(this.maxHearts, this.hearts + 1);
      this.score += 200;
      this.audio.playHeartRestoredSound();
      this.addToast("SHIELD RESTORED!", "+200 PTS", "#34D399");

      this.arcadeGroup.remove(this.activeWrench.mesh);
      this.activeWrench = null;
      this.wrenchCooldownTimer = 16.0;
    }
  }

  // ---------------------------------------------------------------
  // 7. DAMAGE, NEAR-MISS & SCORING REWARDS
  // ---------------------------------------------------------------
  takeDamage(cause = "HAZARD IMPACT") {
    if (this.invulnerableTimer > 0.0 || this.isGameOver) return;

    this.hearts = Math.max(0, this.hearts - 1);
    this.invulnerableTimer = 1.5; // 1.5s invulnerability shield
    this.comboMultiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0.0;
    this.cameraShake = 0.75;

    this.audio.playHeartLostSound();
    this.addToast(cause, "-1 SHIELD CHARGE!", "#EF4444");

    // Spin vehicle physics slightly on collision impact & reduce speed
    if (this.vehiclePhysics) {
      this.vehiclePhysics.velocityForward *= 0.45;
      this.vehiclePhysics.velocityLateral *= 0.45;
      this.vehiclePhysics.yawRate += (Math.random() - 0.5) * 1.8;
    }

    if (this.hearts === 0) {
      this.triggerGameOver();
    }
  }

  triggerNearMiss(dist) {
    const pts = 150 * this.comboMultiplier;
    this.score += pts;
    this.comboTimer = this.maxComboTime;

    // Refill 22% mini-nitro boost surge
    if (this.vehiclePhysics && this.vehiclePhysics.refillNitro) {
      this.vehiclePhysics.refillNitro(22.0);
    }

    this.audio.playNearMissChime();
    this.addToast(`CLOSE CALL! +${pts}`, "Near Miss Nitro Surge!", "#00F0FF");

    if (this.score > this.highScore) {
      this.highScore = this.score;
      safeSetHighScore(this.highScore);
    }
  }

  triggerCleanCross(title, basePts = 100) {
    const pts = basePts * this.comboMultiplier;
    this.score += pts;
    this.comboTimer = Math.min(this.maxComboTime, this.comboTimer + 1.5);

    this.audio.playCleanCrossChime();
    this.addToast(title, `+${pts} PTS`, "#34D399");

    if (this.score > this.highScore) {
      this.highScore = this.score;
      safeSetHighScore(this.highScore);
    }
  }

  triggerLaneCleared() {
    const pts = 120 * this.comboMultiplier;
    this.score += pts;
    this.comboTimer = Math.min(this.maxComboTime, this.comboTimer + 2.0);
    this.comboCount++;

    this.audio.playLaneClearedChime();
    this.addToast("LANE CLEARED!", `+${pts} PTS (Crossing Cleared)`, "#10B981");

    if (this.score > this.highScore) {
      this.highScore = this.score;
      safeSetHighScore(this.highScore);
    }
  }

  triggerGameOver() {
    this.isGameOver = true;
    this.lockonWarning = false;
    this.audio.playGameOverSound();

    let rank = "C";
    if (this.score >= 5000) rank = "S (MASTER)";
    else if (this.score >= 3200) rank = "A (EXPERT)";
    else if (this.score >= 1800) rank = "B (PROVISIONAL)";

    const isNewHigh = (this.score >= this.highScore && this.score > 0);

    if (this.hud && this.hud.showGameOverModal) {
      this.hud.showGameOverModal({
        modeName: this.activeMode === "cascade" ? "Celestial Cascade" : "Crossy Odyssey",
        score: this.score,
        highScore: this.highScore,
        rank: rank,
        isNewHighScore: isNewHigh
      });
    }
  }

  addToast(text, subtext = "", color = "#FFFFFF") {
    this.toasts.push({
      id: Math.random().toString(36).slice(2),
      text: text,
      subtext: subtext,
      color: color,
      life: 2.2
    });
    if (this.toasts.length > 3) this.toasts.shift();
  }

  getCameraShake() {
    return this.cameraShake;
  }

  // ---------------------------------------------------------------
  // 8. MAIN ENGINE TICK LOOP
  // ---------------------------------------------------------------
  update(dt, carPos) {
    if (!this.active || this.isGameOver) return;

    // Decay camera shake smoothly
    if (this.cameraShake > 0.0) {
      this.cameraShake = Math.max(0.0, this.cameraShake - dt * 2.8);
    }

    // Decay invulnerability timer & flash car mesh
    if (this.invulnerableTimer > 0.0) {
      this.invulnerableTimer = Math.max(0.0, this.invulnerableTimer - dt);
      const isVisible = Math.floor(this.invulnerableTimer * 14.0) % 2 === 0;
      if (this.vehiclePhysics && this.vehiclePhysics.mesh) {
        this.vehiclePhysics.mesh.visible = isVisible;
      }
    } else {
      if (this.vehiclePhysics && this.vehiclePhysics.mesh) {
        this.vehiclePhysics.mesh.visible = true;
      }
    }

    // Decay combo multiplier timer
    if (this.comboMultiplier > 1 || this.comboCount > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0.0) {
        this.comboMultiplier = 1;
        this.comboCount = 0;
        this.comboTimer = 0.0;
      }
    }

    // Update toasts lifetime
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      this.toasts[i].life -= dt;
      if (this.toasts[i].life <= 0.0) {
        this.toasts.splice(i, 1);
      }
    }

    // Update blast particles
    this._updateBlastFX(dt);

    const carSpeed = this.vehiclePhysics ? this.vehiclePhysics.getSpeedKmh() : 0.0;

    // MODE 2: Celestial Cascade logic
    if (this.activeMode === "cascade") {
      // 1. Process enqueued staggered salvo meteors
      for (let i = this.celestialQueue.length - 1; i >= 0; i--) {
        const item = this.celestialQueue[i];
        item.delay -= dt;
        if (item.delay <= 0.0) {
          this._spawnMeteorAt(item.targetPos, item.fallDuration, item.playAlertSound);
          this.celestialQueue.splice(i, 1);
        }
      }

      // 2. Stationary punisher monitoring
      if (carSpeed < 4.0) {
        this.stationaryTimer += dt;
        if (this.stationaryTimer >= 1.0) {
          this.lockonWarning = true;
          this.stationaryAlertCooldown -= dt;
          if (this.stationaryAlertCooldown <= 0.0) {
            this.audio.playStationaryLockonAlert();
            this.addToast("IMMOBILE VEHICLE DETECTED!", "STATIONARY LOCK-ON ACTIVE! MOVE NOW!", "#EF4444");
            this.stationaryAlertCooldown = 1.4;
          }

          // Immobile bombardment: drop directly on car every 1.1s
          this.stationaryStrikeTimer -= dt;
          if (this.stationaryStrikeTimer <= 0.0) {
            const campSpread = 0.35 + Math.random() * 0.6;
            const angle = Math.random() * Math.PI * 2;
            const targetPos = carPos.clone()
              .add(this.vehiclePhysics.forward.clone().multiplyScalar(Math.cos(angle) * campSpread))
              .add(this.vehiclePhysics.right.clone().multiplyScalar(Math.sin(angle) * campSpread));
            this._spawnMeteorAt(targetPos, 1.15, true);
            this.stationaryStrikeTimer = 1.1;
          }
        }
      } else {
        this.stationaryTimer = 0.0;
        this.lockonWarning = false;
        this.stationaryAlertCooldown = 0.0;
        this.stationaryStrikeTimer = 0.4;
      }

      // 3. Dynamic Salvo & Multi-Meteor Wave Director (when moving)
      if (!this.lockonWarning) {
        this.celestialPatternTimer -= dt;
        if (this.celestialPatternTimer <= 0.0 && this.celestialQueue.length === 0) {
          this._triggerCelestialPattern();
        }
      }

      this._updateMeteors(dt, carPos);
      this._updateShards(dt, carPos);
    }

    // MODE 3: Crossy Odyssey logic (Orchestrated Highway & Trail Encounter Director)
    if (this.activeMode === "crossy") {
      this.lockonWarning = false;

      this.crossyEncounterTimer -= dt;
      if (this.crossyEncounterTimer <= 0.0) {
        const encounterType = this.crossySequence[this.crossyEncounterIndex % this.crossySequence.length];
        this.crossyEncounterIndex++;

        if (encounterType === "crossroad") {
          this._triggerCrossroadEncounter();
        } else if (encounterType === "rockfall") {
          this._triggerRockfallEncounter();
        } else if (encounterType === "wildlife") {
          this._triggerWildlifeEncounter();
        }

        const difficulty = Math.min(1.0, this.score / 6000.0);
        this.crossyEncounterTimer = (4.8 - difficulty * 1.5) + (Math.random() - 0.5) * 1.2;
      }

      this._updateAdvanceRockfalls(dt, carPos);
      this._updateBoulders(dt, carPos);
      this._updateCrossingCarts(dt, carPos);
      this._updateCrossingZones(dt, carPos);
      this._updateWildlife(dt, carPos);
      this._updateSignboards(dt, carPos);
    }

    // Heart recovery repair wrench
    if (this.hearts < this.maxHearts) {
      this.wrenchCooldownTimer -= dt;
      if (this.wrenchCooldownTimer <= 0.0) {
        this._spawnRepairWrench();
        this.wrenchCooldownTimer = 18.0;
      }
    }
    this._updateRepairWrench(dt, carPos);

    // Update HUD Stats
    if (this.hud) {
      const comboPct = this.comboMultiplier > 1 ? (this.comboTimer / this.maxComboTime) * 100.0 : 0.0;
      this.hud.updateArcadeStats({
        mode: this.activeMode,
        hearts: this.hearts,
        score: this.score,
        highScore: this.highScore,
        combo: this.comboMultiplier,
        comboProgress: comboPct,
        toasts: this.toasts,
        lockonWarning: this.lockonWarning
      });
    }
  }
}
