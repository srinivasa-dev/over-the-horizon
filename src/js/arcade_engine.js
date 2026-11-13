// =================================================================
// OVER THE HORIZON: Tri-Mode Arcade Engine & Planetary Simulation Suite
// Implements Celestial Cascade (Falling Hazards) & Tornado Chase (Atmospheric Funnel Pursuit)
// =================================================================
import * as THREE from 'three';
import {
  buildStardustCelestial,
  buildStardustShard,
  buildCelestialAstrolabeReticle,
  buildStarlightAuroraPillar,
  buildRepairWrench,
  buildTornadoFunnel
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

    // Active mode: "cosy", "cascade", "tornado"
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
    this.colorblindMode = false;

    // Floating notification toasts
    this.toasts = [];

    // Scene group for arcade objects
    this.arcadeGroup = new THREE.Group();
    this.arcadeGroup.name = "Arcade_Entities";
    this.scene.add(this.arcadeGroup);

    // Entity pools
    this.meteors = [];
    this.shards = [];
    this.activeWrench = null;

    // Tornado Chase Mode Entities & State
    this.tornados = [];
    this.tornadoSurvivalTime = 0.0;
    this.suckInAnimation = null;

    // Stationary Punisher Tracking (Cascade mode)
    this.stationaryTimer = 0.0;
    this.lockonWarning = false;
    this.stationaryAlertCooldown = 0.0;
    this.stationaryStrikeTimer = 0.4;

    // Celestial Cascade: Dynamic Salvo & Multi-Meteor Wave Director
    this.cascadeCountdown = 0.0;
    this.cascadeLastSecond = 0;
    this.celestialQueue = [];
    this.celestialPatternTimer = 0.8;
    this.celestialPatternIndex = 0;
    this.celestialPatterns = ["pincer", "stagger_chase", "scout", "slalom", "pinch_flank", "leapfrog"];

    // Universal Repair Wrench cooldown
    this.wrenchCooldownTimer = 8.0;

    // Impact blast particle system
    this._initImpactParticles();
  }

  // ---------------------------------------------------------------
  // 1. LIFECYCLE: START & STOP MODES
  // ---------------------------------------------------------------
  start(mode) {
    this.stop(); // Clear any existing objects

    this.activeMode = mode;
    this.active = (mode === "cascade" || mode === "tornado");
    this.isGameOver = false;
    this.score = 0;
    this.comboMultiplier = 1;
    this.comboCount = 0;
    this.comboTimer = 0.0;
    this.invulnerableTimer = 0.0;
    this.cameraShake = 0.0;
    this.colorblindMode = false;
    this.toasts = [];

    this.stationaryTimer = 0.0;
    this.lockonWarning = false;
    this.stationaryAlertCooldown = 0.0;
    this.stationaryStrikeTimer = 0.4;
    this.wrenchCooldownTimer = 10.0;

    this.arcadeGroup.visible = true;

    if (mode === "cascade") {
      this.hearts = 3;
      this.maxHearts = 3;
      this.celestialQueue = [];
      this.celestialPatternTimer = 0.8;
      this.celestialPatternIndex = 0;

      // 5-Second Start Countdown
      this.cascadeCountdown = 5.0;
      this.cascadeLastSecond = 5;
      if (this.hud) {
        this.hud.showCountdown(5);
      }
      if (this.audio) {
        this.audio.playCountdownTick(false);
      }
    } else if (mode === "tornado") {
      // Single life only ("no life to this only one life you get")
      this.hearts = 1;
      this.maxHearts = 1;
      this.tornados = [];
      this.tornadoSurvivalTime = 0.0;
      this.suckInAnimation = null;

      // Spawn initial chasing tornado
      this._spawnTornado();
    } else {
      this.hearts = 3;
      this.maxHearts = 3;
    }

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
      if (mode === "cascade") {
        this.hud?.showBanner(
          "CELESTIAL CASCADE",
          "5s radar countdown active! Prepare to evade orbital meteor strikes!",
          3800
        );
      } else if (mode === "tornado") {
        this.hud?.showBanner(
          "TORNADO CHASE",
          "Relentless twister detected! Gravitational suction active. 1 LIFE ONLY!",
          4000
        );
      }
    }
  }

  stop() {
    this.active = false;
    this.isGameOver = false;
    this.lockonWarning = false;
    this.stationaryTimer = 0.0;
    this.celestialQueue = [];
    this.cascadeCountdown = 0.0;

    if (this.vehiclePhysics) {
      this.vehiclePhysics.isSuckedIn = false;
      const vMesh = this.vehiclePhysics.group || this.vehiclePhysics.chassisMesh || this.vehiclePhysics.mesh;
      if (vMesh) {
        vMesh.scale.set(1, 1, 1);
        vMesh.visible = true;
      }
    }
    this.suckInAnimation = null;

    if (this.hud) {
      this.hud.hideCountdown();
      this.hud.hideTornadoWarning();
    }

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

    // Remove tornados
    for (const t of this.tornados) {
      if (t.mesh) this.arcadeGroup.remove(t.mesh);
    }
    this.tornados = [];

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
    const reticleMesh = buildCelestialAstrolabeReticle(planetType, this.colorblindMode);
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
  // 5. TORNADO CHASE: ATMOSPHERIC FUNNEL PURSUIT & VORTEX SUCTION
  // ---------------------------------------------------------------
  _spawnTornado() {
    if (!this.vehiclePhysics) return null;
    const mesh = buildTornadoFunnel();
    const carPos = this.vehiclePhysics.position || this.vehiclePhysics.chassisMesh?.position;
    if (!carPos) return null;

    // Place tornado at distance ~45m-58m away from car along planetary surface
    const backward = this.vehiclePhysics.forward ? this.vehiclePhysics.forward.clone().negate().normalize() : new THREE.Vector3(0, 0, -1);
    const side = this.vehiclePhysics.right ? this.vehiclePhysics.right.clone().multiplyScalar(Math.random() > 0.5 ? 1 : -1) : new THREE.Vector3(1, 0, 0);

    const spawnDir = carPos.clone()
      .add(backward.clone().multiplyScalar(46.0 + Math.random() * 12.0))
      .add(side.clone().multiplyScalar(14.0 + Math.random() * 12.0))
      .normalize();

    const terrainRadius = this.planet ? this.planet.getTerrainRadiusAt(spawnDir) : 115.0;
    const pos = spawnDir.clone().multiplyScalar(terrainRadius);
    mesh.position.copy(pos);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), spawnDir);

    this.arcadeGroup.add(mesh);

    const tornado = {
      mesh,
      dir: spawnDir,
      speed: 14.5,
      wobbleOffset: Math.random() * Math.PI * 2
    };
    this.tornados.push(tornado);
    return tornado;
  }

  _updateTornados(dt, carPos) {
    if (!this.vehiclePhysics) return;
    const carDir = carPos.clone().normalize();
    const planetRadius = this.planet ? this.planet.radius : 115.0;
    let minDistance = 999.0;

    for (let i = 0; i < this.tornados.length; i++) {
      const t = this.tornados[i];
      if (!t.mesh) continue;

      // 1. Animate visual components (spin, ribbons, orbiting debris)
      if (t.mesh.userData) {
        t.mesh.userData.time = (t.mesh.userData.time || 0.0) + dt;
        const uTime = t.mesh.userData.time;

        // Spin funnel tiers
        if (t.mesh.userData.funnelTiers) {
          t.mesh.userData.funnelTiers.forEach(tier => {
            tier.mesh.rotation.y += tier.spinSpeed * dt;
            tier.mesh.position.x = Math.sin(uTime * 3.2 + tier.mesh.position.y * 0.25) * 0.45;
            tier.mesh.position.z = Math.cos(uTime * 2.8 + tier.mesh.position.y * 0.25) * 0.45;
          });
        }

        // Spin wind ribbons
        if (t.mesh.userData.ribbons) {
          t.mesh.userData.ribbons.forEach(ribbon => {
            ribbon.mesh.rotation.z += ribbon.rotSpeed * dt;
          });
        }

        // Orbit debris chunks around base
        if (t.mesh.userData.debris) {
          t.mesh.userData.debris.forEach(deb => {
            deb.angle += deb.orbitSpeed * dt;
            deb.mesh.position.x = Math.cos(deb.angle) * deb.orbitRadius;
            deb.mesh.position.z = Math.sin(deb.angle) * deb.orbitRadius;
            deb.mesh.rotation.x += deb.rotX * dt;
            deb.mesh.rotation.y += deb.rotY * dt;
          });
        }
      }

      // 2. Geodesic spherical pursuit navigation
      const angleToCar = t.dir.angleTo(carDir);
      if (angleToCar > 0.001) {
        const rotAxis = new THREE.Vector3().crossVectors(t.dir, carDir).normalize();
        const stepAngle = (t.speed / planetRadius) * dt;
        const actualAngle = Math.min(stepAngle, angleToCar);
        t.dir.applyAxisAngle(rotAxis, actualAngle).normalize();

        const terrainRadius = this.planet ? this.planet.getTerrainRadiusAt(t.dir) : 115.0;
        t.mesh.position.copy(t.dir).multiplyScalar(terrainRadius);
        t.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), t.dir);
      }

      // Accelerate tornado gradually over survival time (up to 21.5 m/s)
      t.speed = Math.min(21.5, 14.5 + this.tornadoSurvivalTime * 0.12);

      // 3. Distance check to player rover
      const dist = carPos.distanceTo(t.mesh.position);
      if (dist < minDistance) {
        minDistance = dist;
      }

      // Proximity Roar and Warning (< 34m)
      if (dist < 34.0) {
        const proximityIntensity = Math.min(1.0, 1.0 - (dist / 34.0));
        this.audio?.playTornadoRoar(proximityIntensity);
        this.cameraShake = Math.max(this.cameraShake, proximityIntensity * 0.45);
      }

      // Gravitational Wind Suction (< 18m)
      if (dist < 18.0 && !this.suckInAnimation && !this.isGameOver) {
        const suctionFactor = (1.0 - dist / 18.0);
        const suctionForce = suctionFactor * 16.0; // Acceleration pull
        const pullVector = t.mesh.position.clone().sub(carPos).normalize();
        if (this.vehiclePhysics.velocity) {
          this.vehiclePhysics.velocity.addScaledVector(pullVector, suctionForce * dt);
        }
      }

      // Critical Contact: Sucked in (< 4.2m)!
      if (dist < 4.2 && !this.suckInAnimation && !this.isGameOver) {
        this._triggerTornadoSuckIn(t);
        return;
      }
    }

    // Update HUD Proximity Indicator
    if (this.hud) {
      if (minDistance < 35.0 && !this.isGameOver && !this.suckInAnimation) {
        this.hud.showTornadoWarning(Math.round(minDistance));
      } else {
        this.hud.hideTornadoWarning();
      }
    }
  }

  _triggerTornadoSuckIn(tornado) {
    if (this.suckInAnimation || this.isGameOver) return;
    this.vehiclePhysics.isSuckedIn = true;
    const chassis = this.vehiclePhysics.group || this.vehiclePhysics.chassisMesh || this.vehiclePhysics.mesh;
    this.suckInAnimation = {
      active: true,
      timer: 0.0,
      duration: 1.85,
      tornadoPos: tornado.mesh.position.clone(),
      tornadoDir: tornado.dir.clone(),
      startCarPos: chassis ? chassis.position.clone() : tornado.mesh.position.clone(),
      tornado
    };
    this.cameraShake = 1.0;
    this.audio?.playTornadoSuckIn();
    this.hud?.showBanner("CRITICAL SUCTION!", "ROVER SUCKED INTO TORNADO VORTEX!", 2500);
  }

  _updateSuckInAnimation(dt) {
    if (!this.suckInAnimation) return;
    const anim = this.suckInAnimation;
    anim.timer += dt;
    const progress = Math.min(1.0, anim.timer / anim.duration);
    const easeProgress = Math.pow(progress, 0.85);

    const chassis = this.vehiclePhysics.group || this.vehiclePhysics.chassisMesh || this.vehiclePhysics.mesh;

    // Spiraling upward into the funnel
    const upNormal = anim.tornadoDir;
    const liftHeight = easeProgress * 22.0; // 0m -> 22m up
    const spiralAngle = anim.timer * 15.0; // Rapid spiral rotation
    const spiralRadius = THREE.MathUtils.lerp(3.2, 0.4, progress);

    // Tangent vectors perpendicular to upNormal
    const arb = Math.abs(upNormal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tX = new THREE.Vector3().crossVectors(upNormal, arb).normalize();
    const tZ = new THREE.Vector3().crossVectors(upNormal, tX).normalize();

    const spiralOffset = tX.clone().multiplyScalar(Math.cos(spiralAngle) * spiralRadius)
      .add(tZ.clone().multiplyScalar(Math.sin(spiralAngle) * spiralRadius))
      .add(upNormal.clone().multiplyScalar(liftHeight));

    const newPos = anim.tornadoPos.clone().add(spiralOffset);
    if (chassis) {
      chassis.position.copy(newPos);
      chassis.rotation.x += dt * 18.0;
      chassis.rotation.y += dt * 24.0;
      chassis.rotation.z += dt * 16.0;
      const currentScale = Math.max(0.05, 1.0 - progress * 0.95);
      chassis.scale.setScalar(currentScale);
    }

    this.cameraShake = THREE.MathUtils.lerp(0.8, 0.2, progress);

    if (progress >= 1.0) {
      this.suckInAnimation = null;
      if (chassis) chassis.visible = false;
      this.hearts = 0;
      this.triggerGameOver("SUCKED INTO TORNADO VORTEX");
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

  triggerGameOver(reason = "SIGNAL TERMINATED") {
    this.isGameOver = true;
    this.lockonWarning = false;
    this.audio?.playGameOverSound();

    let rank = "C";
    if (this.score >= 5000) rank = "S (MASTER)";
    else if (this.score >= 3200) rank = "A (EXPERT)";
    else if (this.score >= 1800) rank = "B (PROVISIONAL)";

    const isNewHigh = (this.score >= this.highScore && this.score > 0);

    if (this.hud && this.hud.showGameOverModal) {
      this.hud.hideCountdown();
      this.hud.hideTornadoWarning();
      this.hud.showGameOverModal({
        modeName: this.activeMode === "cascade" ? "Celestial Cascade" : "Tornado Chase",
        score: this.score,
        highScore: this.highScore,
        rank: rank,
        isNewHighScore: isNewHigh,
        reason: reason
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

  setColorblindMode(enabled) {
    this.colorblindMode = Boolean(enabled);
  }

  getCameraShake() {
    return this.cameraShake;
  }

  // ---------------------------------------------------------------
  // 8. MAIN ENGINE TICK LOOP
  // ---------------------------------------------------------------
  update(dt, carPos) {
    if (!this.active) return;

    // 1. If suck-in animation is active, handle it exclusively
    if (this.suckInAnimation) {
      this._updateSuckInAnimation(dt);
      if (this.cameraShake > 0.0) {
        this.cameraShake = Math.max(0.0, this.cameraShake - dt * 1.5);
      }
      return;
    }

    if (this.isGameOver) return;

    if (dt <= 0 || dt > 0.1) dt = 0.016;

    // Decay camera shake smoothly
    if (this.cameraShake > 0.0) {
      this.cameraShake = Math.max(0.0, this.cameraShake - dt * 2.8);
    }

    // Decay invulnerability timer & flash car mesh
    if (this.invulnerableTimer > 0.0) {
      this.invulnerableTimer = Math.max(0.0, this.invulnerableTimer - dt);
      const isVisible = Math.floor(this.invulnerableTimer * 14.0) % 2 === 0;
      const mesh = this.vehiclePhysics?.group || this.vehiclePhysics?.chassisMesh || this.vehiclePhysics?.mesh;
      if (mesh) mesh.visible = isVisible;
    } else {
      const mesh = this.vehiclePhysics?.group || this.vehiclePhysics?.chassisMesh || this.vehiclePhysics?.mesh;
      if (mesh && !mesh.visible) mesh.visible = true;
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

    if (!carPos) {
      carPos = this.vehiclePhysics?.position || this.vehiclePhysics?.chassisMesh?.position;
    }
    if (!carPos) return;

    const carSpeed = this.vehiclePhysics ? this.vehiclePhysics.getSpeedKmh() : 0.0;

    // MODE 2: Celestial Cascade logic
    if (this.activeMode === "cascade") {
      // 5-second countdown handling
      if (this.cascadeCountdown > 0.0) {
        this.cascadeCountdown -= dt;
        const currentSec = Math.ceil(this.cascadeCountdown);
        if (currentSec !== this.cascadeLastSecond) {
          this.cascadeLastSecond = currentSec;
          if (currentSec > 0) {
            this.hud?.updateCountdown(currentSec);
            this.audio?.playCountdownTick(false);
          } else {
            this.hud?.updateCountdown(0);
            this.audio?.playCountdownTick(true);
          }
        }

        if (this.cascadeCountdown <= 0.0) {
          this.cascadeCountdown = 0.0;
          this.hud?.hideCountdown();
          this.addToast("RADAR LOCK DETECTED!", "METEOR SALVO ACTIVE!", "#F59E0B");
        }

        // Return early during countdown: hazards not yet active
        return;
      }

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
            this.audio?.playStationaryLockonAlert();
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

      // Heart recovery repair wrench (only in cascade)
      if (this.hearts < this.maxHearts) {
        this.wrenchCooldownTimer -= dt;
        if (this.wrenchCooldownTimer <= 0.0) {
          this._spawnRepairWrench();
          this.wrenchCooldownTimer = 18.0;
        }
      }
      this._updateRepairWrench(dt, carPos);
    }

    // MODE 3: Tornado Chase (Single-Life Permadeath Pursuit)
    if (this.activeMode === "tornado") {
      this.lockonWarning = false;
      this.tornadoSurvivalTime += dt;

      // Distance & speed-based score accumulation
      const speedScore = Math.round(carSpeed * dt * 0.8);
      this.score += Math.round(dt * 20 * this.comboMultiplier) + speedScore;

      // Spawn 2nd flanking tornado after 32 seconds of survival
      if (this.tornadoSurvivalTime > 32.0 && this.tornados.length < 2) {
        this._spawnTornado();
        this.addToast("TWISTER ESCALATION!", "SECOND TORNADO FUNNEL TOUCHDOWN!", "#EF4444");
      }

      this._updateTornados(dt, carPos);
    }

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
